"use strict";

// Этот файл содержит только поведение интерфейса. События GA4 здесь не отправляются.

const rubles = (value) => new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
}).format(value);

// Каталог: фильтрация по категории, базовой цене категории и заполненности палитры.
const catalogGrid = document.querySelector("#catalog-grid");
if (catalogGrid) {
  const categoryFilter = document.querySelector("#filter-category");
  const priceFilter = document.querySelector("#filter-price");
  const colorFilter = document.querySelector("#filter-color");
  const cards = Array.from(catalogGrid.querySelectorAll(".catalog-product"));
  const count = document.querySelector("#catalog-count");
  const empty = document.querySelector("#catalog-empty");

  const filterCatalog = () => {
    const category = categoryFilter.value;
    const price = priceFilter.value === "all" ? 0 : Number(priceFilter.value);
    const color = colorFilter.value;
    let visible = 0;
    cards.forEach((card) => {
      const matches = (category === "all" || card.dataset.category === category)
        && Number(card.dataset.price) >= price
        && (color === "all" || card.dataset.color === color);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    count.textContent = `${visible} ${visible === 1 ? "букет" : "букетов"}`;
    empty.hidden = visible !== 0;
  };

  [categoryFilter, priceFilter, colorFilter].forEach((control) => {
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
    const requestedCard = cards.find((card) => card.dataset.sku === requestedSku);
    if (requestedCard) {
      window.setTimeout(() => requestedCard.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
  }
}

// Конструктор: стоимость берётся из тарифов, указанных в техническом задании.
const builderForm = document.querySelector("#builder-form");
if (builderForm) {
  const flowerInputs = Array.from(builderForm.querySelectorAll("[data-flower-price]"));
  const greenery = document.querySelector("#greenery");
  const wrapInputs = Array.from(builderForm.querySelectorAll("[name='wrap']"));
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
      const quantity = Math.min(max, Math.max(0, Number.parseInt(input.value, 10) || 0));
      input.value = String(quantity);
      stems += quantity;
      flowersPrice += quantity * Number(input.dataset.flowerPrice);
      if (quantity > 0) {
        const label = input.closest(".flower-row").querySelector("strong").textContent;
        parts.push(`${quantity} — ${label.toLowerCase()}`);
      }
    });
    const selectedWrap = wrapInputs.find((input) => input.checked) || wrapInputs[0];
    const wrapPrice = Number(selectedWrap.dataset.wrapPrice);
    const greeneryPrice = greenery.checked ? 300 : 0;
    const extras = wrapPrice + greeneryPrice;
    const total = flowersPrice + extras;
    totalNode.textContent = rubles(total);
    stemsNode.textContent = String(stems);
    flowersNode.textContent = rubles(flowersPrice);
    extrasNode.textContent = rubles(extras);
    const wrapNames = { craft: "крафт", film: "плёнка", hatbox: "шляпная коробка" };
    const description = [...parts, `упаковка — ${wrapNames[selectedWrap.value] || selectedWrap.value}`, ...(greenery.checked ? ["зелень"] : [])].join(", ");
    descriptionInput.value = description;
    priceInput.value = String(total);

    const valid = stems >= 5 && stems <= 51;
    messageNode.textContent = stems < 5
      ? `Добавьте ещё ${5 - stems} ${5 - stems === 1 ? "стебель" : "стеблей"}: минимум 5.`
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
      sessionStorage.setItem("lepestok24_custom_bouquet", JSON.stringify(custom));
    } catch (_) {
      // Конструктор продолжает работать и без sessionStorage.
    }
    window.location.href = "contacts.html?item_id=CUSTOM";
  });
  updateBuilder();
}

// Калькулятор доставки: центр — 300 ₽, север/юг — 450 ₽, пригород — 700 ₽.
const deliveryZone = document.querySelector("#delivery-zone");
const orderSum = document.querySelector("#order-sum");
if (deliveryZone && orderSum) {
  const priceNode = document.querySelector("#delivery-cost");
  const messageNode = document.querySelector("#delivery-message");
  const updateDelivery = () => {
    const sum = Math.max(0, Number(orderSum.value) || 0);
    const baseFee = Number(deliveryZone.selectedOptions[0].dataset.fee) || 0;
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
}

// Форма заказа: клиентская валидация без передачи данных и без событий аналитики.
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
  dateInput.min = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const params = new URLSearchParams(window.location.search);
  const itemFromUrl = params.get("item_id");
  if (itemFromUrl && Array.from(itemSelect.options).some((option) => option.value === itemFromUrl)) {
    itemSelect.value = itemFromUrl;
  }
  const promoFromUrl = params.get("promo_code");
  if (promoFromUrl) promoInput.value = promoFromUrl;

  try {
    const savedCustom = sessionStorage.getItem("lepestok24_custom_bouquet");
    if (savedCustom) {
      const custom = JSON.parse(savedCustom);
      if (custom.item_id === "CUSTOM") {
        itemSelect.value = "CUSTOM";
        let summary = document.querySelector("#custom-bouquet-summary");
        if (!summary) {
          summary = document.createElement("p");
          summary.id = "custom-bouquet-summary";
          summary.className = "notice";
          summary.style.margin = "0 0 18px";
          orderForm.querySelector(".form-section-spaced").insertAdjacentElement("beforebegin", summary);
        }
        summary.textContent = `Ваш состав из конструктора: ${custom.description}. Расчётная цена цветов и упаковки: ${rubles(custom.price)}.`;
      }
    }
  } catch (_) {
    // Не блокируем форму, если sessionStorage недоступен.
  }

  orderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    orderStatus.textContent = "";
    const phoneDigits = phoneInput.value.replace(/\D/g, "");
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith("7")) {
      orderStatus.textContent = "Проверьте телефон: укажите +7 и 10 цифр номера.";
      phoneInput.focus();
      return;
    }
    if (emailInput.value && !emailInput.validity.valid) {
      orderStatus.textContent = "Проверьте формат e-mail.";
      emailInput.focus();
      return;
    }
    if (!orderForm.reportValidity()) return;
    orderStatus.textContent = "Поля заполнены корректно. Сейчас форма находится в демонстрационном режиме: данные не отправлены. После подключения приёмника заявок этот шаг будет заменён реальной отправкой.";
    orderStatus.classList.add("notice", "notice-warning");
  });
}

// Промокод можно скопировать; это локальное действие, не GA4-событие.
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
      status.textContent = "Выделите код и скопируйте его вручную: Ctrl+C.";
    }
  });
}

// Страница «Спасибо» оставляет номер пустым, если его не передал реальный приёмник.
const thanksRequestId = document.querySelector("#thanks-request-id");
if (thanksRequestId) {
  const requestId = new URLSearchParams(window.location.search).get("request_id");
  if (requestId && /^[A-Za-z0-9-]{1,60}$/.test(requestId)) {
    thanksRequestId.textContent = requestId;
  }
}
