"use strict";

// Этот файл содержит поведение интерфейса и отправку событий GA4.

const ORDER_FLOW_KEY = "lepestok24_order_flow";
const DELIVERY_TIME_SLOTS = [
  "09:00 — 11:00",
  "11:00 — 13:00",
  "13:00 — 15:00",
  "15:00 — 17:00",
  "17:00 — 19:00",
  "19:00 — 21:00"
];

const isValidDeliveryTime = (value) => DELIVERY_TIME_SLOTS.includes(value || "");

const readOrderFlow = () => {
  try {
    const value = sessionStorage.getItem(ORDER_FLOW_KEY);
    return value ? JSON.parse(value) : null;
  } catch (_) {
    return null;
  }
};

const saveOrderFlow = (value) => {
  try {
    sessionStorage.setItem(ORDER_FLOW_KEY, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
};

const currentPage = window.location.pathname.split("/").pop() || "index.html";
const pageParams = new URLSearchParams(window.location.search);
const requestedOrderId = pageParams.get("item_id");

// Параметры URL служат резервом на случай, если браузер запрещает sessionStorage.
const readOrderFlowFromUrl = () => {
  const expectedStep = currentPage === "delivery.html"
    ? "delivery"
    : currentPage === "contacts.html" ? "order" : "";

  if (!expectedStep || pageParams.get("step") !== expectedStep) {
    return null;
  }

  const itemId = pageParams.get("item_id");
  const itemPrice = Number(pageParams.get("item_price"));

  if (
    !itemId ||
    !/^(CUSTOM|B-\d{2}|OFFICE)$/.test(itemId) ||
    !Number.isFinite(itemPrice) ||
    itemPrice < 0
  ) {
    return null;
  }

  return {
    step: expectedStep,
    item_id: itemId,
    item_name: (
      pageParams.get("item_name") ||
      (itemId === "CUSTOM" ? "Индивидуальный букет" : `Букет ${itemId}`)
    ).slice(0, 120),
    item_price: itemPrice,
    item_description: (pageParams.get("item_description") || "").slice(0, 500),
    delivery_zone: pageParams.get("delivery_zone") || "center",
    delivery_fee: Math.max(0, Number(pageParams.get("delivery_fee")) || 0),
    delivery_time: isValidDeliveryTime(pageParams.get("delivery_time"))
      ? pageParams.get("delivery_time")
      : "",
    promo_code: (pageParams.get("promo_code") || "").slice(0, 20)
  };
};

const orderFlowUrl = (page, flow) => {
  const params = new URLSearchParams({
    step: flow.step,
    item_id: flow.item_id,
    item_name: flow.item_name || "",
    item_price: String(Number(flow.item_price) || 0),
    item_description: flow.item_description || "",
    delivery_zone: flow.delivery_zone || "center",
    delivery_fee: String(Number(flow.delivery_fee) || 0),
    delivery_time: isValidDeliveryTime(flow.delivery_time) ? flow.delivery_time : "",
    promo_code: flow.promo_code || ""
  });

  return `${page}?${params.toString()}`;
};

const storedFlow = readOrderFlow();
const urlFlow = readOrderFlowFromUrl();

const currentFlow = urlFlow && (
  !storedFlow ||
  storedFlow.item_id !== requestedOrderId ||
  storedFlow.step !== urlFlow.step
)
  ? urlFlow
  : (storedFlow || urlFlow);

// Страницы доставки и заказа доступны только в рамках маршрута заказа.
if (currentPage === "delivery.html") {
  const validDeliveryEntry = currentFlow &&
    ["delivery", "order"].includes(currentFlow.step) &&
    currentFlow.item_id &&
    requestedOrderId === currentFlow.item_id;

  if (!validDeliveryEntry) {
    window.location.replace("catalog.html");
  }
}

if (currentPage === "contacts.html") {
  const validOrderEntry = currentFlow &&
    currentFlow.step === "order" &&
    currentFlow.item_id &&
    requestedOrderId === currentFlow.item_id;

  if (!validOrderEntry) {
    window.location.replace("catalog.html");
  }
}

// Кнопки «Заказать» сохраняют выбранный букет и ведут на доставку.
document.addEventListener("click", (event) => {
  const orderLink = event.target.closest("a[data-order-start]");

  if (!orderLink) return;

  const targetUrl = new URL(orderLink.href, window.location.href);
  const itemId = targetUrl.searchParams.get("item_id");

  if (!itemId || !targetUrl.pathname.endsWith("/delivery.html")) {
    return;
  }

  const card = orderLink.closest(".catalog-product, .product-card");
  const heading = card ? card.querySelector("h2, h3") : null;

  let itemPrice = card ? Number(card.dataset.price) || 0 : 0;

  const priceBySku = (sku) => {
    const match = /^B-(\d{2})$/.exec(sku || "");

    if (!match) return 0;

    const number = Number(match[1]);

    if (number <= 6) return 2900;
    if (number <= 12) return 1900;
    if (number <= 18) return 4500;

    return 5900;
  };

  if (!itemPrice) {
    itemPrice = priceBySku(itemId);
  }

  const custom = (() => {
    try {
      const value = sessionStorage.getItem("lepestok24_custom_bouquet");
      return value ? JSON.parse(value) : null;
    } catch (_) {
      return null;
    }
  })();

  if (itemId === "CUSTOM" && custom) {
    itemPrice = Number(custom.price) || itemPrice;
  }

  if (itemId !== "CUSTOM") {
    try {
      sessionStorage.removeItem("lepestok24_custom_bouquet");
    } catch (_) {}
  }

  event.preventDefault();

  const flow = {
    step: "delivery",
    item_id: itemId,
    item_name: heading
      ? heading.textContent.trim()
      : (itemId === "CUSTOM" ? "Индивидуальный букет" : `Букет ${itemId}`),
    item_price: itemPrice,
    item_description: itemId === "CUSTOM" && custom ? custom.description : "",
    delivery_zone: "center",
    delivery_fee: 300,
    delivery_time: ""
  };

  saveOrderFlow(flow);

  // GA4: select_item — выбранный букет из каталога перед переходом к оформлению.
  // Ждём отправки события, чтобы переход на другую страницу не прервал аналитику.
  const deliveryUrl = orderFlowUrl("delivery.html", flow);
  let navigationStarted = false;
  const continueToDelivery = () => {
    if (navigationStarted) return;
    navigationStarted = true;
    window.location.href = deliveryUrl;
  };

  if (typeof window.gtag === "function") {
    // Отправляем только три требуемых параметра: артикул букета, валюту и цену.
    const catalogItemId = (card?.dataset.sku || flow.item_id || itemId).trim();

    window.gtag("event", "select_item", {
      item_id: catalogItemId,
      currency: "RUB",
      value: itemPrice,
      event_callback: continueToDelivery,
      event_timeout: 1000
    });

    // Резервный переход, если callback GA4 не вызовется.
    window.setTimeout(continueToDelivery, 1200);
  } else {
    continueToDelivery();
  }
});

const rubles = (value) => new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
}).format(value);

// Каталог: совместная фильтрация по категории, диапазону цены и цвету.
const catalogGrid = document.querySelector("#catalog-grid");

if (catalogGrid) {
  const categoryFilter = document.querySelector("#filter-category");
  const minPriceFilter = document.querySelector("#filter-price-min");
  const maxPriceFilter = document.querySelector("#filter-price-max");
  const colorFilter = document.querySelector("#filter-color");
  const cards = Array.from(
    catalogGrid.querySelectorAll(".catalog-product")
  );
  const count = document.querySelector("#catalog-count");
  const empty = document.querySelector("#catalog-empty");

  const filterCatalog = () => {
    const category = categoryFilter.value;
    const minPrice = minPriceFilter.value.trim() === ""
      ? 0
      : Math.max(0, Number(minPriceFilter.value));
    const maxPrice = maxPriceFilter.value.trim() === ""
      ? Number.POSITIVE_INFINITY
      : Math.max(0, Number(maxPriceFilter.value));
    const color = colorFilter.value;
    const priceRangeValid = minPrice <= maxPrice;

    let visible = 0;

    cards.forEach((card) => {
      const cardPrice = Number(card.dataset.price);
      const cardColors = (card.dataset.colors || "").split(/\s+/);
      const matches = priceRangeValid &&
        (category === "all" || card.dataset.category === category) &&
        cardPrice >= minPrice &&
        cardPrice <= maxPrice &&
        (color === "all" || cardColors.includes(color));

      card.hidden = !matches;
      if (matches) visible += 1;
    });

    count.textContent = `${visible} ${
      visible === 1 ? "букет" : "букетов"
    }`;
    empty.hidden = visible !== 0;

    if (!priceRangeValid) {
      empty.textContent = "Минимальная цена не может быть больше максимальной. Измените диапазон.";
    } else {
      empty.textContent = "По выбранным фильтрам букетов не найдено. Измените условия поиска.";
    }
  };

  // GA4: отслеживаем изменение фильтров каталога.
  // В событие не передаются персональные данные — только выбранные условия поиска.
  const trackCatalogFilter = (control) => {
    if (typeof window.gtag !== "function") return;

    const filterType = control === categoryFilter
      ? "category"
      : (control === colorFilter ? "color" : "price");
    const minRaw = minPriceFilter.value.trim();
    const maxRaw = maxPriceFilter.value.trim();

    window.gtag("event", "catalog_filter", {
      filter_type: filterType,
      filter_value_min: minRaw === "" ? 0 : Number(minRaw),
      // -1 означает, что верхняя граница цены не задана.
      filter_value_max: maxRaw === "" ? -1 : Number(maxRaw),
      filter_color: colorFilter.value,
      // Дополнительный параметр сохраняет выбранную категорию.
      filter_category: categoryFilter.value
    });
  };

  [categoryFilter, minPriceFilter, maxPriceFilter, colorFilter].forEach((control) => {
    control.addEventListener("input", filterCatalog);
    control.addEventListener("change", filterCatalog);
    // Отправляем событие только на change, чтобы не отправлять его на каждый символ.
    control.addEventListener("change", () => trackCatalogFilter(control));
  });

  const params = new URLSearchParams(window.location.search);
  const requestedCategory = params.get("category");
  const requestedSku = params.get("item_id");

  if (["mama", "mono", "author", "basket"].includes(requestedCategory)) {
    categoryFilter.value = requestedCategory;
  }

  filterCatalog();

  if (requestedSku) {
    const requestedCard = cards.find(
      (card) => card.dataset.sku === requestedSku
    );

    if (requestedCard) {
      window.setTimeout(() => {
        requestedCard.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }, 80);
    }
  }
}

// Конструктор: расчёт цены цветов, зелени и упаковки.
const builderForm = document.querySelector("#builder-form");

if (builderForm) {
  const flowerInputs = Array.from(
    builderForm.querySelectorAll("[data-flower-price]")
  );
  const greenery = document.querySelector("#greenery");
  const wrapInputs = Array.from(
    builderForm.querySelectorAll("[name='wrap']")
  );
  const totalNode = document.querySelector("#builder-total");
  const stemsNode = document.querySelector("#stems-total");
  const flowersNode = document.querySelector("#flowers-total");
  const extrasNode = document.querySelector("#extras-total");
  const messageNode = document.querySelector("#builder-message");
  const descriptionInput = document.querySelector("#builder-description");
  const priceInput = document.querySelector("#builder-price");
  const submitButton = document.querySelector("#builder-order-button");

  const updateBuilder = () => {
    let stems = 0;
    let flowersPrice = 0;
    const parts = [];

    flowerInputs.forEach((input) => {
      const max = Number(input.max) || 51;
      const quantity = Math.min(
        max,
        Math.max(0, Number.parseInt(input.value, 10) || 0)
      );

      input.value = String(quantity);
      stems += quantity;
      flowersPrice += quantity * Number(input.dataset.flowerPrice);

      if (quantity > 0) {
        const label = input.closest(".flower-row")
          .querySelector("strong").textContent;

        parts.push(`${quantity} — ${label.toLowerCase()}`);
      }
    });

    const selectedWrap =
      wrapInputs.find((input) => input.checked) || wrapInputs[0];

    const wrapPrice = Number(selectedWrap.dataset.wrapPrice);
    const greeneryPrice = greenery.checked ? 300 : 0;
    const extras = wrapPrice + greeneryPrice;
    const total = flowersPrice + extras;

    totalNode.textContent = rubles(total);
    stemsNode.textContent = String(stems);
    flowersNode.textContent = rubles(flowersPrice);
    extrasNode.textContent = rubles(extras);

    const wrapNames = {
      craft: "крафт",
      film: "плёнка",
      hatbox: "шляпная коробка"
    };

    const description = [
      ...parts,
      `упаковка — ${wrapNames[selectedWrap.value] || selectedWrap.value}`,
      ...(greenery.checked ? ["зелень"] : [])
    ].join(", ");

    descriptionInput.value = description;
    priceInput.value = String(total);

    const valid = stems >= 5 && stems <= 51;

    messageNode.textContent = stems < 5
      ? `Добавьте ещё ${5 - stems} ${
          5 - stems === 1 ? "стебель" : "стеблей"
        }: минимум 5.`
      : stems > 51
        ? `В букете должно быть не более 51 стебля. Сейчас: ${stems}.`
        : "Состав рассчитан. Можно перейти к оформлению заказа.";

    messageNode.classList.toggle("is-invalid", !valid);
    submitButton.disabled = !valid;
    submitButton.setAttribute("aria-disabled", String(!valid));
  };

  [...flowerInputs, greenery, ...wrapInputs].forEach((input) => {
    input.addEventListener("input", updateBuilder);
    input.addEventListener("change", updateBuilder);
  });

  builderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateBuilder();

    if (submitButton.disabled) return;

    const custom = {
      item_id: "CUSTOM",
      description: descriptionInput.value,
      price: Number(priceInput.value),
      stems: Number(stemsNode.textContent)
    };

    try {
      sessionStorage.setItem(
        "lepestok24_custom_bouquet",
        JSON.stringify(custom)
      );
    } catch (_) {
      // Конструктор работает и без sessionStorage.
    }

    const flow = {
      step: "delivery",
      item_id: "CUSTOM",
      item_name: "Индивидуальный букет",
      item_price: custom.price,
      item_description: custom.description,
      delivery_zone: "center",
      delivery_fee: 300,
      delivery_time: ""
    };

    saveOrderFlow(flow);

    // GA4: фиксируем создание кастомного букета при успешном переходе к оформлению.
    // Передаём только число стеблей, выбранный тип упаковки и итоговую цену.
    const selectedWrap =
      wrapInputs.find((input) => input.checked) || wrapInputs[0];
    const deliveryUrl = orderFlowUrl("delivery.html", flow);
    let navigationStarted = false;

    const continueToDelivery = () => {
      if (navigationStarted) return;
      navigationStarted = true;
      window.location.href = deliveryUrl;
    };

    if (typeof window.gtag === "function") {
      window.gtag("event", "bouquet_build", {
        stems_count: custom.stems,
        wrap_type: selectedWrap.value,
        total_price: custom.price,
        event_callback: continueToDelivery,
        event_timeout: 1000
      });

      // Не задерживаем переход, если callback GA4 не сработал.
      window.setTimeout(continueToDelivery, 1200);
    } else {
      continueToDelivery();
    }
  });

  updateBuilder();
}

// Калькулятор доставки и выбор интервала времени.
const deliveryZone = document.querySelector("#delivery-zone");
const orderSum = document.querySelector("#order-sum");

if (deliveryZone && orderSum) {
  const priceNode = document.querySelector("#delivery-cost");
  const messageNode = document.querySelector("#delivery-message");
  const summaryNode = document.querySelector("#selected-order-summary");
  const timeMessageNode = document.querySelector("#delivery-time-message");
  const timeButtons = Array.from(document.querySelectorAll("[data-delivery-time]"));
  const deliveryFlow = currentFlow || readOrderFlow();
  let selectedDeliveryTime = "";

  const showSelectedDeliveryTime = (value, persistSelection = false) => {
    selectedDeliveryTime = isValidDeliveryTime(value) ? value : "";

    timeButtons.forEach((button) => {
      const selected = button.dataset.deliveryTime === selectedDeliveryTime;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-selected", selected);
    });

    if (timeMessageNode) {
      timeMessageNode.textContent = selectedDeliveryTime
        ? `Выбран интервал: ${selectedDeliveryTime}.`
        : "Выберите интервал доставки, чтобы продолжить оформление.";
    }

    if (persistSelection && deliveryFlow && deliveryFlow.item_id === requestedOrderId) {
      deliveryFlow.delivery_time = selectedDeliveryTime;
      saveOrderFlow(deliveryFlow);

      // Сохраняем выбранное время и в URL на случай возврата назад или запрета sessionStorage.
      try {
        window.history.replaceState(null, "", orderFlowUrl("delivery.html", deliveryFlow));
      } catch (_) {
        // В некоторых локальных file://-сценариях History API недоступен.
      }
    }
  };

  if (deliveryFlow && deliveryFlow.item_id === requestedOrderId) {
    orderSum.value = String(Number(deliveryFlow.item_price) || 0);
    deliveryZone.value = deliveryFlow.delivery_zone || "center";

    if (summaryNode) {
      const description = deliveryFlow.item_description
        ? ` — ${deliveryFlow.item_description}`
        : "";

      summaryNode.hidden = false;

      summaryNode.textContent =
        `Вы выбрали: ${deliveryFlow.item_name} ` +
        `(${deliveryFlow.item_id})${description}. ` +
        `Стоимость букета: ${rubles(
          Number(deliveryFlow.item_price) || 0
        )}. Проверьте зону и время доставки, затем продолжите оформление.`;
    }
  }

  showSelectedDeliveryTime(deliveryFlow && deliveryFlow.item_id === requestedOrderId
    ? deliveryFlow.delivery_time
    : "");

  timeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showSelectedDeliveryTime(button.dataset.deliveryTime, true);
    });
  });

  const updateDelivery = () => {
    const sum = Math.max(0, Number(orderSum.value) || 0);
    const baseFee = Number(
      deliveryZone.selectedOptions[0].dataset.fee
    ) || 0;

    const pickup = deliveryZone.value === "pickup";
    const free = !pickup && sum >= 6000;
    const fee = pickup || free ? 0 : baseFee;

    priceNode.textContent = rubles(fee);

    messageNode.textContent = pickup
      ? "Самовывоз — бесплатно."
      : free
        ? "Ваш заказ подходит под условие бесплатной доставки от 6 000 ₽."
        : `До бесплатной доставки осталось ${rubles(6000 - sum)}.`;
  };

  deliveryZone.addEventListener("change", updateDelivery);
  orderSum.addEventListener("input", updateDelivery);
  updateDelivery();

  const continueOrderLink = document.querySelector("[data-order-continue]");

  if (continueOrderLink) {
    continueOrderLink.addEventListener("click", (event) => {
      event.preventDefault();

      const flow = readOrderFlow() || currentFlow;

      if (
        !flow ||
        flow.item_id !== requestedOrderId ||
        !["delivery", "order"].includes(flow.step)
      ) {
        window.location.href = "catalog.html";
        return;
      }

      if (!isValidDeliveryTime(selectedDeliveryTime)) {
        if (timeMessageNode) {
          timeMessageNode.textContent = "Сначала выберите интервал доставки.";
        }
        const timePicker = document.querySelector("#delivery-time-picker");
        if (timePicker) timePicker.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const baseFee = Number(
        deliveryZone.selectedOptions[0].dataset.fee
      ) || 0;

      const sum = Math.max(0, Number(orderSum.value) || 0);

      flow.step = "order";
      flow.delivery_zone = deliveryZone.value;
      flow.delivery_time = selectedDeliveryTime;
      flow.delivery_fee =
        deliveryZone.value === "pickup" || sum >= 6000
          ? 0
          : baseFee;

      saveOrderFlow(flow);

      // GA4: отправляем расчёт доставки после нажатия «Перейти к заказу».
      // delivery_price — итоговая цена после учёта самовывоза и бесплатной доставки.
      const orderUrl = orderFlowUrl("contacts.html", flow);
      let navigationStarted = false;
      const continueToOrder = () => {
        if (navigationStarted) return;
        navigationStarted = true;
        window.location.href = orderUrl;
      };

      if (typeof window.gtag === "function") {
        window.gtag("event", "delivery_calc", {
          delivery_zone: flow.delivery_zone,
          delivery_price: flow.delivery_fee,
          event_callback: continueToOrder,
          event_timeout: 1000
        });

        // Резервный переход на случай, если callback GA4 не сработает.
        window.setTimeout(continueToOrder, 1200);
      } else {
        continueToOrder();
      }
    });
  }
}


// Форма заказа: перенос выбранного товара, расчёт промокода и проверка данных.
const orderForm = document.querySelector("#order-form");

if (orderForm) {
  const dateInput = document.querySelector("#delivery-date");
  const itemIdInput = document.querySelector("#item-id");
  const itemNameInput = document.querySelector("#selected-item-name");
  const itemDescriptionNode = document.querySelector("#selected-item-description");
  const orderStatus = document.querySelector("#order-status");
  const phoneInput = document.querySelector("#customer-phone");
  const emailInput = document.querySelector("#customer-email");
  const promoInput = document.querySelector("#promo-input");
  const basePriceNode = document.querySelector("#base-item-price");
  const deliveryPriceNode = document.querySelector("#delivery-cost-form");
  const discountNode = document.querySelector("#promo-discount");
  const currentPriceNode = document.querySelector("#current-order-price");
  const promoStatus = document.querySelector("#promo-status");
  const deliveryZoneForm = document.querySelector("#delivery-zone-form");
  const deliveryZoneDisplay = document.querySelector("#delivery-zone-display");
  const deliveryTimeForm = document.querySelector("#delivery-time-form");
  const deliveryTimeDisplay = document.querySelector("#delivery-time-display");

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  dateInput.min =
    `${tomorrow.getFullYear()}-` +
    `${String(tomorrow.getMonth() + 1).padStart(2, "0")}-` +
    `${String(tomorrow.getDate()).padStart(2, "0")}`;

  const params = new URLSearchParams(window.location.search);
  const itemFromUrl = params.get("item_id");
  const selectedFlow = currentFlow || readOrderFlow();
  const flowMatchesPage = Boolean(
    selectedFlow &&
    selectedFlow.step === "order" &&
    selectedFlow.item_id === itemFromUrl
  );

  const selectedItemId = flowMatchesPage
    ? selectedFlow.item_id
    : (itemFromUrl || "");
  const baseItemPrice = Math.max(0, Number(
    flowMatchesPage ? selectedFlow.item_price : params.get("item_price")
  ) || 0);

  const itemNames = {
    OFFICE: "Цветы в офис"
  };

  if (itemIdInput) itemIdInput.value = selectedItemId;

  if (itemNameInput) {
    if (selectedItemId === "CUSTOM") {
      itemNameInput.value = "CUSTOM — мой букет";
    } else if (flowMatchesPage && selectedFlow.item_name) {
      itemNameInput.value = `${selectedFlow.item_name} (${selectedItemId})`;
    } else {
      itemNameInput.value = `${itemNames[selectedItemId] || `Букет ${selectedItemId}`} (${selectedItemId})`;
    }
  }

  if (flowMatchesPage && selectedFlow.item_description && itemDescriptionNode) {
    itemDescriptionNode.hidden = false;
    itemDescriptionNode.textContent = selectedItemId === "CUSTOM"
      ? `Состав вашего букета: ${selectedFlow.item_description}.`
      : selectedFlow.item_description;
  }

  const deliveryZoneNames = {
    center: "Центр",
    north: "Северный район",
    south: "Южный район",
    suburb: "Пригород",
    pickup: "Самовывоз"
  };

  if (deliveryZoneForm) {
    deliveryZoneForm.value = flowMatchesPage
      ? (selectedFlow.delivery_zone || "center")
      : "center";
  }

  if (deliveryZoneDisplay) {
    const zone = flowMatchesPage
      ? (selectedFlow.delivery_zone || "center")
      : "";
    deliveryZoneDisplay.value = deliveryZoneNames[zone] || "Место доставки не указано";
  }

  const selectedDeliveryTime = flowMatchesPage && isValidDeliveryTime(selectedFlow.delivery_time)
    ? selectedFlow.delivery_time
    : "";

  if (deliveryTimeDisplay) {
    deliveryTimeDisplay.value = selectedDeliveryTime || "Время доставки не выбрано";
  }
  if (deliveryTimeForm) {
    deliveryTimeForm.value = selectedDeliveryTime;
  }

  const promoFromUrl = params.get("promo_code");
  if (promoInput) {
    promoInput.value = promoFromUrl || (flowMatchesPage ? selectedFlow.promo_code : "") || "";
  }

  // MAMA10 даёт скидку 10% на стоимость букета; доставка в скидку не входит.
  const promoDefinitions = {
    MAMA10: 0.10
  };

  const deliveryZoneFees = {
    center: 300,
    north: 450,
    south: 450,
    suburb: 700,
    pickup: 0
  };

  const getDeliveryFee = () => {
    const zone = deliveryZoneForm?.value || selectedFlow?.delivery_zone || "center";

    // Условия бесплатной доставки такие же, как на предыдущем шаге.
    if (zone === "pickup" || baseItemPrice >= 6000) {
      return 0;
    }

    if (Object.prototype.hasOwnProperty.call(deliveryZoneFees, zone)) {
      return deliveryZoneFees[zone];
    }

    return Math.max(0, Number(selectedFlow?.delivery_fee) || 0);
  };

  const updateOrderPrice = () => {
    const normalizedCode = promoInput ? promoInput.value.trim().toUpperCase() : "";
    const discountRate = promoDefinitions[normalizedCode] || 0;
    const discount = Math.round(baseItemPrice * discountRate);
    const finalItemPrice = Math.max(0, baseItemPrice - discount);
    const deliveryFee = getDeliveryFee();
    const currentTotal = finalItemPrice + deliveryFee;

    if (basePriceNode) basePriceNode.value = rubles(baseItemPrice);
    if (deliveryPriceNode) deliveryPriceNode.value = rubles(deliveryFee);
    if (discountNode) discountNode.value = discount ? `−${rubles(discount)}` : rubles(0);
    if (currentPriceNode) currentPriceNode.value = rubles(currentTotal);

    if (promoStatus) {
      if (!normalizedCode) {
        promoStatus.textContent = "Промокод не указан. Скидка не применяется.";
      } else if (discountRate > 0) {
        promoStatus.textContent = `Промокод ${normalizedCode} применён: скидка 10% на букет.`;
      } else {
        promoStatus.textContent = "Такой промокод не найден. Проверьте написание; цена рассчитана без скидки.";
      }
    }

    if (flowMatchesPage) {
      selectedFlow.promo_code = normalizedCode;
      selectedFlow.promo_discount = discount;
      selectedFlow.current_total = currentTotal;
      selectedFlow.delivery_zone = deliveryZoneForm?.value || selectedFlow.delivery_zone || "center";
      selectedFlow.delivery_fee = deliveryFee;
      selectedFlow.delivery_time = selectedDeliveryTime;
      saveOrderFlow(selectedFlow);

      // В URL остаётся резерв для случая, если браузер не хранит sessionStorage.
      try {
        window.history.replaceState(null, "", orderFlowUrl("contacts.html", selectedFlow));
      } catch (_) {
        // Некоторые локальные file://-сценарии запрещают менять URL через History API.
      }
    }
  };

  if (promoInput) {
    promoInput.addEventListener("input", updateOrderPrice);
    promoInput.addEventListener("change", updateOrderPrice);
  }

  updateOrderPrice();

  // GA4: form_start фиксируется один раз при первом взаимодействии с редактируемым полем.
  // Не передаём в аналитику имя, телефон, e-mail, комментарий или другие персональные данные.
  let formStartTracked = false;

  const trackFormStart = (event) => {
    const target = event.target;
    const isEditableField = target instanceof HTMLElement && target.matches(
      'input:not([type="hidden"]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), select:not([disabled])'
    );

    if (!isEditableField || formStartTracked) return;
    formStartTracked = true;

    if (typeof window.gtag === "function") {
      window.gtag("event", "form_start", {
        form_id: "order-form",
        form_name: "order_form"
      });
    }
  };

  orderForm.addEventListener("focusin", trackFormStart);
  orderForm.addEventListener("input", trackFormStart);
  orderForm.addEventListener("change", trackFormStart);

  // GA4: отслеживаем клики по редактируемым полям формы.
  // Передаём только название поля и раздел формы, но никогда не его значение.
  const ctaFieldNames = {
    "customer-name": "Имя",
    "customer-phone": "Телефон",
    "customer-email": "E-mail",
    "delivery-date": "Дата доставки",
    "promo-input": "Промокод",
    "recipient-name": "Имя получателя",
    "recipient-phone": "Телефон получателя",
    "order-comment": "Пожелания к заказу",
    "personal-consent": "Согласие на обработку персональных данных"
  };

  const editableFieldSelector =
    'input:not([type="hidden"]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), select:not([disabled])';

  orderForm.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const field = target.closest(editableFieldSelector);
    if (!field || !orderForm.contains(field)) return;

    const sectionNode = field.closest("[data-ga-section]");
    const pageSection = sectionNode?.dataset.gaSection || "order_details";
    const buttonName = ctaFieldNames[field.id] || field.name || field.id || "form_field";

    if (typeof window.gtag === "function") {
      window.gtag("event", "cta_click", {
        button_name: buttonName,
        page_section: pageSection
      });
    }
  });

  // Стоимость лида: цена букета после скидки + стоимость доставки.
  // Сумма вычисляется числом, без символов валюты и форматирования.
  const getLeadValue = () => {
    const normalizedCode = promoInput ? promoInput.value.trim().toUpperCase() : "";
    const discountRate = promoDefinitions[normalizedCode] || 0;
    const discount = Math.round(baseItemPrice * discountRate);
    const finalItemPrice = Math.max(0, baseItemPrice - discount);
    return finalItemPrice + getDeliveryFee();
  };

  // После успешной проверки отправляем generate_lead и form_submit.
  // Таймер нужен, чтобы переход не зависел от блокировщика рекламы или сети.
  const sendSubmitEventAndRedirect = () => {
    let redirected = false;
    const redirectToThanks = () => {
      if (redirected) return;
      redirected = true;
      window.location.href = "thanks.html";
    };

    if (typeof window.gtag !== "function") {
      redirectToThanks();
      return;
    }

    // generate_lead отправляется только после успешной локальной проверки формы.
    // Не передаём в GA4 имя, телефоны, e-mail, промокод или комментарий.
    window.gtag("event", "generate_lead", {
      lead_item_id: itemIdInput?.value || selectedItemId || "unknown",
      lead_zone: deliveryZoneForm?.value || selectedFlow?.delivery_zone || "unknown",
      value: getLeadValue(),
      currency: "RUB"
    });

    window.gtag("event", "form_submit", {
      form_id: "order-form",
      form_name: "order_form",
      event_callback: redirectToThanks,
      event_timeout: 1500
    });

    window.setTimeout(redirectToThanks, 1800);
  };

  orderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    orderStatus.textContent = "";

    const phoneDigits = phoneInput.value.replace(/\D/g, "");

    if (phoneDigits.length !== 11 || !phoneDigits.startsWith("7")) {
      orderStatus.textContent =
        "Проверьте телефон: укажите +7 и 10 цифр номера.";

      phoneInput.focus();
      return;
    }

    if (emailInput.value && !emailInput.validity.valid) {
      orderStatus.textContent = "Проверьте формат e-mail.";
      emailInput.focus();
      return;
    }

    if (!orderForm.reportValidity()) return;

    orderStatus.textContent = "Проверка пройдена. Переходим на страницу благодарности…";
    orderStatus.classList.remove("notice-warning");
    orderStatus.classList.add("notice");
    sendSubmitEventAndRedirect();
  });
}

// Копирование промокода.
const copyPromoButton = document.querySelector("#copy-promo");

if (copyPromoButton) {
  const promoCodeNode = document.querySelector("#promo-code");
  const promoCode = promoCodeNode ? promoCodeNode.textContent.trim() : "";
  const status = document.querySelector("#promo-status");

  copyPromoButton.addEventListener("click", async () => {
    if (!promoCode) return;

    try {
      await navigator.clipboard.writeText(promoCode);
      if (status) status.textContent = "Промокод скопирован.";

      // GA4: отправляем promo_copy только после успешного копирования.
      // Значение promo_code содержит скопированный код (например, MAMA10).
      if (typeof window.gtag === "function") {
        window.gtag("event", "promo_copy", {
          promo_code: promoCode
        });
      }
    } catch (_) {
      // Если копирование недоступно, выделяем код для ручного копирования.
      // Событие promo_copy не отправляем, так как успешное копирование
      // браузером в этом случае не подтверждено.
      if (promoCodeNode) {
        const range = document.createRange();
        range.selectNodeContents(promoCodeNode);

        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      if (status) {
        status.textContent =
          "Выделите код и скопируйте его вручную: Ctrl+C.";
      }
    }
  });
}

// Номер заказа отображается только при наличии номера от приёмника заявок.
const thanksRequestId = document.querySelector("#thanks-request-id");

if (thanksRequestId) {
  const requestId = new URLSearchParams(
    window.location.search
  ).get("request_id");

  if (requestId && /^[A-Za-z0-9-]{1,60}$/.test(requestId)) {
    thanksRequestId.textContent = requestId;
  }
}

// Изображения букетов на главной и в каталоге.
// Файлы размещаются в корневой папке flowers_img и называются по артикулу:
// B-01.jpg, B-02.png и т. п. Если файл не найден, остаётся текущая заглушка.
(() => {
  const imageFolder = "flowers_img/";
  const imageExtensions = [
    ".jpg", ".jpeg", ".png", ".webp", ".avif",
    ".JPG", ".JPEG", ".PNG", ".WEBP", ".AVIF", ""
  ];
  const validSku = /^B-\d{2}$/;

  const addFlowerImage = (placeholder, sku) => {
    if (!placeholder || !validSku.test(sku || "")) return;

    // Не добавляем одно изображение повторно, если разметка будет расширена.
    if (placeholder.querySelector(".flower-photo")) return;

    const image = document.createElement("img");
    image.className = "flower-photo";
    image.alt = `Букет ${sku}`;
    image.loading = "lazy";
    image.decoding = "async";

    let extensionIndex = 0;

    const tryNextExtension = () => {
      if (extensionIndex >= imageExtensions.length) {
        image.remove();
        return;
      }

      image.src = `${imageFolder}${sku}${imageExtensions[extensionIndex++]}`;
    };

    image.addEventListener("load", () => {
      placeholder.classList.add("has-flower-image");
    }, { once: true });

    image.addEventListener("error", tryNextExtension);
    placeholder.appendChild(image);
    tryNextExtension();
  };

  // Каталог: артикул берётся из data-sku каждой карточки (B-01 ... B-24).
  document.querySelectorAll(".catalog-product").forEach((card) => {
    addFlowerImage(card.querySelector(".product-image"), card.dataset.sku);
  });

  // Главная: артикулы заданы у hero-блока, категорий и избранных букетов.
  document.querySelectorAll(".page-index [data-image-id]").forEach((placeholder) => {
    addFlowerImage(placeholder, placeholder.dataset.imageId);
  });
})();



 // Случайная фотография букета на главной странице.
const heroImage = document.querySelector("#hero-random-image");

if (heroImage) {
  const extensions = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

  // Перемешиваем все артикулы, чтобы выбирать случайный букет.
  const bouquets = Array.from({ length: 24 }, (_, index) =>
    `B-${String(index + 1).padStart(2, "0")}`
  ).sort(() => Math.random() - 0.5);

  // Ищем первую существующую и загружаемую фотографию.
  const tryBouquet = (bouquetIndex) => {
    if (bouquetIndex >= bouquets.length) {
      // Фотографии не найдены — сохраняем заглушку.
      return;
    }

    const bouquetCode = bouquets[bouquetIndex];
    let extensionIndex = 0;

    const tryExtension = () => {
      if (extensionIndex >= extensions.length) {
        // У этого букета нет подходящего изображения.
        tryBouquet(bouquetIndex + 1);
        return;
      }

      const imagePath =
        `flowers_img/${bouquetCode}${extensions[extensionIndex]}`;

      extensionIndex++;

      const image = new Image();

      image.onload = () => {
        heroImage.style.backgroundImage =
          `url("${imagePath}")`;
        heroImage.style.backgroundSize = "cover";
        heroImage.style.backgroundPosition = "center";

        // Скрываем текст заглушки, когда фотография найдена.
        heroImage.querySelectorAll("span, small").forEach((element) => {
          element.style.display = "none";
        });

        heroImage.setAttribute(
          "aria-label",
          `Букет ${bouquetCode}`
        );
      };

      image.onerror = tryExtension;
      image.src = imagePath;
    };

    tryExtension();
  };

  tryBouquet(0);
}

// GA4: отслеживаем клики по телефону и e-mail в общей шапке, подвале
// и карточке контактов. Работает на всех страницах, где подключён script.js.
document.addEventListener("click", (event) => {
  const target = event.target;
  const contactLink = target instanceof Element
    ? target.closest('a[href^="tel:"], a[href^="mailto:"]')
    : null;

  if (!contactLink) return;

  const href = (contactLink.getAttribute("href") || "").trim().toLowerCase();
  const contactType = href.startsWith("tel:")
    ? "phone"
    : href.startsWith("mailto:") ? "email" : "";

  if (!contactType || typeof window.gtag !== "function") return;

  // Дополнительный параметр помогает отличать одинаковые ссылки по месту клика.
  let contactLocation = "other";
  if (contactLink.closest(".topline, .site-header")) {
    contactLocation = "header";
  } else if (contactLink.closest(".site-footer")) {
    contactLocation = "footer";
  } else if (contactLink.closest(".contact-info-card, .contact-aside")) {
    contactLocation = "contacts";
  }

  // Не отменяем стандартное действие ссылки: телефон и почта открываются как обычно.
  window.gtag("event", "contact_click", {
    contact_type: contactType,
    contact_location: contactLocation
  });
});

// GA4: отслеживаем переходы в WhatsApp и Telegram в общем подвале
// и на странице контактов. Соцссылки блока thanks-social отслеживаются
// отдельным событием social_click, поэтому здесь их пропускаем.
document.addEventListener("click", (event) => {
  const target = event.target;
  const messengerLink = target instanceof Element
    ? target.closest('a[href], [data-messenger]')
    : null;

  if (!messengerLink) return;
  if (messengerLink.closest(".thanks-social .social-links")) return;

  const declaredMessenger = (messengerLink.getAttribute("data-messenger") || "")
    .trim()
    .toLowerCase();
  const href = (messengerLink.getAttribute("href") || "").trim();
  let hostname = "";

  if (href) {
    try {
      hostname = new URL(href, window.location.href).hostname.toLowerCase();
    } catch (_) {
      // Если адрес нестандартный (например, tg://), ниже проверим сам href.
    }
  }

  let messenger = "";
  if (declaredMessenger === "whatsapp" || declaredMessenger === "wa") {
    messenger = "whatsapp";
  } else if (declaredMessenger === "telegram" || declaredMessenger === "tg") {
    messenger = "telegram";
  } else if (
    hostname === "wa.me" ||
    hostname === "whatsapp.com" ||
    hostname.endsWith(".whatsapp.com") ||
    /(^|\/)\/wa\.me([/:?#]|$)/i.test(href)
  ) {
    messenger = "whatsapp";
  } else if (
    hostname === "t.me" ||
    hostname.endsWith(".t.me") ||
    hostname === "telegram.me" ||
    hostname.endsWith(".telegram.me") ||
    hostname === "telegram.org" ||
    hostname.endsWith(".telegram.org") ||
    /^tg:/i.test(href)
  ) {
    messenger = "telegram";
  }

  if (!messenger || typeof window.gtag !== "function") return;

  // Передаём только тип мессенджера, не отправляя URL с возможными личными данными.
  window.gtag("event", "messenger_click", {
    messenger: messenger
  });
});

// GA4: отслеживаем клики по соцсетям именно рядом с надписью
// «Следите за мастерской» на странице thanks.html.
// Параметр network содержит нормализованное название соцсети.
document.addEventListener("click", (event) => {
  const target = event.target;
  const socialLink = target instanceof Element
    ? target.closest(".thanks-social .social-links a[data-social-network]")
    : null;

  if (!socialLink || typeof window.gtag !== "function") return;

  const network = (socialLink.dataset.socialNetwork || "").trim().toLowerCase();
  const allowedNetworks = ["instagram", "vk", "telegram", "youtube"];

  if (!allowedNetworks.includes(network)) return;

  window.gtag("event", "social_click", {
    network: network
  });
});
