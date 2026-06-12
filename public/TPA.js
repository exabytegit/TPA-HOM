const state = new Map();
const cardElements = new Map();
let catalog = [];

const cardsGrid = document.getElementById("cards-grid");
const catalogMessage = document.getElementById("catalog-message");

const statusText = {
  idle: "Disponible",
  running: "Preparando tu suscripcion...",
  ok: "Disponible",
  error: "No disponible por el momento"
};

const vehicleImagesByModelPlan = {
  "105-115": "/Images/105-COROLLA_CROSS_XLI_CVT-115-70-30_84_M_DIF_H.jpg",
  "107-115": "/Images/107-COROLLA_XLI_CVT-115-70-30_84_M_DIF_H.jpg",
  "108-108": "/Images/108-YARIS_XS_CVT-108-70-30_DIF_G_84_MESES.jpg",
  "111-113": "/Images/111-HIACE_FURGON-113-PLAN_100_DIF_G_84M.webp",
  "113-113": "/Images/113-YARIS_XS_CVT_5P_FLEX-113-PLAN_100_DIF_G_84M.png",
  "114-113": "/Images/114-HILUX_4X4_DX_AT-113-PLAN_100_DIF_G_84M.jpg",
  "115-115": "/Images/115-YARIS_CROSS_XLI_CVT_FLEX-115-70-30_84_M_DIF_H.webp",
  "116-114": "/Images/116-YARIS_CROSS_XEI_HEV-114-100_84_M_DIF_H.webp",
  "96-108": "/Images/96-HILUX_4X2_DX_MT-108-70-30_DIF_G_84_MESES.png"
};

const createCorrelationId = () =>
  `tpa-ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const initialCardState = () => ({
  status: "idle",
  detail: "",
  detailsOpen: false,
  advisorMessage: ""
});

function setCatalogMessage(message) {
  catalogMessage.textContent = message;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function modelInitials(modelDescription) {
  if (typeof modelDescription !== "string" || modelDescription.trim() === "") return "TPA";
  const parts = modelDescription
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "");

  return parts.join("") || "TPA";
}

function getVehicleImageUrl(item) {
  return vehicleImagesByModelPlan[`${item.modelId}-${item.planId}`] || null;
}

function setCardState(slug, partialState) {
  const current = state.get(slug) || initialCardState();
  state.set(slug, { ...current, ...partialState });
  renderCardState(slug);
}

function renderCardState(slug) {
  const cardState = state.get(slug);
  const elements = cardElements.get(slug);

  if (!cardState || !elements) return;

  elements.statusBadge.className = `status-pill status-${cardState.status}`;
  elements.statusBadge.textContent = statusText[cardState.status] || statusText.idle;
  elements.detailsButton.textContent = cardState.detailsOpen ? "Ocultar detalles" : "Ver detalles del plan";
  elements.detailsPanel.hidden = !cardState.detailsOpen;
  elements.advisorMessage.textContent = cardState.advisorMessage;
  elements.result.textContent =
    cardState.status === "ok"
      ? "Suscripcion lista. Abrimos el siguiente paso en una nueva pestaña."
      : cardState.status === "running"
        ? "Estamos preparando tu suscripcion..."
        : cardState.detail || "Elegi una accion para seguir.";
}

function renderActions(slug, actionsCell) {
  actionsCell.textContent = "";

  const subscribeButton = document.createElement("button");
  subscribeButton.className = "btn btn-primary";
  subscribeButton.textContent = "Iniciar suscripcion online";
  subscribeButton.addEventListener("click", () => runSubscription(slug, subscribeButton));

  const advisorButton = document.createElement("button");
  advisorButton.className = "btn btn-secondary";
  advisorButton.textContent = "Hablar con un asesor";
  advisorButton.addEventListener("click", () => {
    setCardState(slug, {
      advisorMessage: "Un asesor puede acompañarte antes de avanzar."
    });
  });

  const detailsButton = document.createElement("button");
  detailsButton.className = "btn-link";
  detailsButton.textContent = "Ver detalles del plan";
  detailsButton.addEventListener("click", () => {
    const current = state.get(slug) || initialCardState();
    setCardState(slug, { detailsOpen: !current.detailsOpen });
  });

  actionsCell.appendChild(subscribeButton);
  actionsCell.appendChild(advisorButton);
  actionsCell.appendChild(detailsButton);

  const currentElements = cardElements.get(slug) || {};
  cardElements.set(slug, {
    ...currentElements,
    subscribeButton,
    advisorButton,
    detailsButton
  });
}

function buildCards() {
  cardsGrid.textContent = "";
  cardElements.clear();

  if (catalog.length === 0) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "empty-card";

    const title = document.createElement("h2");
    title.textContent = "No pudimos cargar los planes en este momento.";
    const message = document.createElement("p");
    message.textContent = "Intentalo nuevamente en unos minutos.";

    emptyCard.appendChild(title);
    emptyCard.appendChild(message);
    cardsGrid.appendChild(emptyCard);
    return;
  }

  for (const item of catalog) {
    state.set(item.slug, initialCardState());

    const card = document.createElement("article");
    card.className = "plan-card";

    const visual = document.createElement("div");
    visual.className = "vehicle-media";
    const imageUrl = getVehicleImageUrl(item);
    if (imageUrl) {
      const image = document.createElement("img");
      image.className = "vehicle-image";
      image.src = imageUrl;
      image.alt = item.modelDescription;
      image.loading = "lazy";
      visual.appendChild(image);
    } else {
      visual.classList.add("vehicle-placeholder");
      const initials = document.createElement("span");
      initials.className = "vehicle-initials";
      initials.textContent = modelInitials(item.modelDescription);
      visual.appendChild(initials);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h2");
    title.className = "plan-title";
    title.textContent = item.modelDescription;

    const plan = document.createElement("p");
    plan.className = "plan-name";
    plan.textContent = item.planDescription;

    const amountBox = document.createElement("div");
    amountBox.className = "amount-box";
    const amountLabel = document.createElement("p");
    amountLabel.className = "amount-label";
    amountLabel.textContent = "Cuota de adhesión estimada";
    const amountValue = document.createElement("p");
    amountValue.className = "amount-value";
    amountValue.textContent = formatCurrency(item.amount);
    amountBox.appendChild(amountLabel);
    amountBox.appendChild(amountValue);

    const rateCopy = document.createElement("p");
    rateCopy.className = "rate-copy";
    rateCopy.textContent = "El valor informado corresponde al plan disponible en este momento.";

    const result = document.createElement("p");
    result.className = "result";
    result.textContent = "Elegi una accion para seguir.";

    const advisorMessage = document.createElement("p");
    advisorMessage.className = "result";

    const statusBadge = document.createElement("span");
    statusBadge.className = "status-pill status-idle";
    statusBadge.textContent = statusText.idle;

    const detailsPanel = document.createElement("div");
    detailsPanel.className = "details-panel";
    detailsPanel.hidden = true;
    const detailsTitle = document.createElement("p");
    detailsTitle.textContent = "Modelo: " + item.modelDescription;
    const detailsPlan = document.createElement("p");
    detailsPlan.textContent = "Plan: " + item.planDescription;
    const detailsAmount = document.createElement("p");
    detailsAmount.textContent = "Cuota de adhesión estimada: " + formatCurrency(item.amount);
    const detailsCopy = document.createElement("p");
    detailsCopy.textContent =
      "Una propuesta simple para avanzar con tu suscripcion online desde un canal seguro.";
    detailsPanel.appendChild(detailsTitle);
    detailsPanel.appendChild(detailsPlan);
    detailsPanel.appendChild(detailsAmount);
    detailsPanel.appendChild(detailsCopy);

    const actionsCell = document.createElement("div");
    actionsCell.className = "card-actions";
    renderActions(item.slug, actionsCell);

    body.appendChild(title);
    body.appendChild(plan);
    body.appendChild(amountBox);
    body.appendChild(rateCopy);
    body.appendChild(statusBadge);
    body.appendChild(result);
    body.appendChild(advisorMessage);
    body.appendChild(actionsCell);
    body.appendChild(detailsPanel);

    card.appendChild(visual);
    card.appendChild(body);
    cardsGrid.appendChild(card);

    cardElements.set(item.slug, {
      statusBadge,
      detailsButton: actionsCell.querySelector(".btn-link"),
      detailsPanel,
      advisorMessage,
      result
    });
  }
}

async function runSubscription(slug, subscribeButton) {
  const row = catalog.find((item) => item.slug === slug);
  if (!row) return;

  subscribeButton.disabled = true;
  setCardState(slug, {
    status: "running",
    detail: "Preparando tu suscripcion..."
  });

  try {
    const response = await fetch("/api/toyota-plan/generate-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-correlation-id": createCorrelationId()
      },
      body: JSON.stringify({ slug })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || body.success !== true || typeof body.link !== "string") {
      throw new Error("Fallo al iniciar la suscripcion online");
    }

    window.open(body.link, "_blank", "noopener,noreferrer");

    setCardState(slug, {
      status: "ok",
      detail: "Suscripcion lista. Abrimos el siguiente paso en una nueva pestaña."
    });
  } catch (_error) {
    setCardState(slug, {
      status: "error",
      detail: "No pudimos iniciar la suscripcion en este momento. Probá nuevamente o solicitá ayuda de un asesor."
    });
  } finally {
    subscribeButton.disabled = false;
  }
}

async function loadCatalog() {
  setCatalogMessage("Estamos preparando los planes...");

  try {
    const response = await fetch("/api/dev/catalog");
    if (!response.ok) {
      throw new Error("Catalog load failed");
    }

    const body = await response.json();
    if (!Array.isArray(body)) {
      throw new Error("Invalid catalog response");
    }

    catalog = body;
    buildCards();
    setCatalogMessage(`Encontramos ${catalog.length} planes disponibles.`);
  } catch (_error) {
    catalog = [];
    buildCards();
    setCatalogMessage("No pudimos cargar los planes en este momento.");
  }
}

loadCatalog();
