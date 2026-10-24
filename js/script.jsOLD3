"use strict";

// Этот файл содержит только поведение интерфейса. События GA4 здесь не отправляются.

const ORDER_FLOW_KEY = "lepestok24_order_flow";

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
    delivery_fee: Math.max(0, Number(pageParams.get("delivery_fee")) || 0)
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
    delivery_fee: String(Number(flow.delivery_fee) || 0)
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
    delivery_fee: 300
  };

  saveOrderFlow(flow);
  window.location.href = orderFlowUrl("delivery.html", flow);
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

  [categoryFilter, minPriceFilter, maxPriceFilter, colorFilter].forEach((control) => {
    control.addEventListener("input", filterCatalog);
    control.addEventListener("change", filterCatalog);
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
      delivery_fee: 300
    };

    saveOrderFlow(flow);
    window.location.href = orderFlowUrl("delivery.html", flow);
  });

  updateBuilder();
}

// Калькулятор доставки.
const deliveryZone = document.querySelector("#delivery-zone");
const orderSum = document.querySelector("#order-sum");

if (deliveryZone && orderSum) {
  const priceNode = document.querySelector("#delivery-cost");
  const messageNode = document.querySelector("#delivery-message");
  const summaryNode = document.querySelector("#selected-order-summary");
  const deliveryFlow = currentFlow || readOrderFlow();

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
        )}. Проверьте зону доставки и продолжите оформление.`;
    }
  }

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

      const baseFee = Number(
        deliveryZone.selectedOptions[0].dataset.fee
      ) || 0;

      const sum = Math.max(0, Number(orderSum.value) || 0);

      flow.step = "order";
      flow.delivery_zone = deliveryZone.value;
      flow.delivery_fee =
        deliveryZone.value === "pickup" || sum >= 6000
          ? 0
          : baseFee;

      saveOrderFlow(flow);
      window.location.href = orderFlowUrl("contacts.html", flow);
    });
  }
}

// Форма заказа: проверка данных без отправки на сервер.
const orderForm = document.querySelector("#order-form");

if (orderForm) {
  const dateInput = document.querySelector("#delivery-date");
  const itemSelect = document.querySelector("#item-id");
  const orderStatus = document.querySelector("#order-status");
  const phoneInput = document.querySelector("#customer-phone");
  const emailInput = document.querySelector("#customer-email");
  const promoInput = document.querySelector("#promo-input");

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

  if (
    itemFromUrl &&
    Array.from(itemSelect.options).some(
      (option) => option.value === itemFromUrl
    )
  ) {
    itemSelect.value = itemFromUrl;
  }

  if (
    selectedFlow &&
    selectedFlow.step === "order" &&
    selectedFlow.item_id === itemFromUrl
  ) {
    itemSelect.value = selectedFlow.item_id;

    const deliveryZoneForm =
      document.querySelector("#delivery-zone-form");

    if (deliveryZoneForm && selectedFlow.delivery_zone) {
      deliveryZoneForm.value = selectedFlow.delivery_zone;
    }
  }

  const promoFromUrl = params.get("promo_code");

  if (promoFromUrl) {
    promoInput.value = promoFromUrl;
  }

  try {
    const savedCustom = sessionStorage.getItem(
      "lepestok24_custom_bouquet"
    );

    if (
      savedCustom &&
      selectedFlow &&
      selectedFlow.item_id === "CUSTOM" &&
      itemFromUrl === "CUSTOM"
    ) {
      const custom = JSON.parse(savedCustom);

      if (custom.item_id === "CUSTOM") {
        itemSelect.value = "CUSTOM";

        let summary = document.querySelector("#custom-bouquet-summary");

        if (!summary) {
          summary = document.createElement("p");
          summary.id = "custom-bouquet-summary";
          summary.className = "notice";
          summary.style.margin = "0 0 18px";

          orderForm.querySelector(".form-section-spaced")
            .insertAdjacentElement("beforebegin", summary);
        }

        summary.textContent =
          `Ваш состав из конструктора: ${custom.description}. ` +
          `Расчётная цена цветов и упаковки: ${rubles(custom.price)}.`;
      }
    }
  } catch (_) {
    // Не блокируем форму, если sessionStorage недоступен.
  }

  // Восстанавливаем состав индивидуального букета из URL или сессии.
  if (
    selectedFlow &&
    selectedFlow.step === "order" &&
    selectedFlow.item_id === "CUSTOM"
  ) {
    itemSelect.value = "CUSTOM";

    let summary = document.querySelector("#custom-bouquet-summary");

    if (!summary) {
      summary = document.createElement("p");
      summary.id = "custom-bouquet-summary";
      summary.className = "notice";
      summary.style.margin = "0 0 18px";

      orderForm.querySelector(".form-section-spaced")
        .insertAdjacentElement("beforebegin", summary);
    }

    summary.textContent =
      `Ваш состав из конструктора: ${
        selectedFlow.item_description || "состав сохранён в параметрах заказа"
      }. Расчётная цена цветов и упаковки: ${
        rubles(Number(selectedFlow.item_price) || 0)
      }.`;
  }

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

    orderStatus.textContent =
      "Поля заполнены корректно. Сейчас форма находится " +
      "в демонстрационном режиме: данные не отправлены. " +
      "После подключения приёмника заявок этот шаг будет заменён реальной отправкой.";

    orderStatus.classList.add("notice", "notice-warning");
  });
}

// Копирование промокода.
const copyPromoButton = document.querySelector("#copy-promo");

if (copyPromoButton) {
  const promoCode = document.querySelector("#promo-code").textContent.trim();
  const status = document.querySelector("#promo-status");

  copyPromoButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(promoCode);
      status.textContent = "Промокод скопирован.";
    } catch (_) {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector("#promo-code"));

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      status.textContent =
        "Выделите код и скопируйте его вручную: Ctrl+C.";
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
