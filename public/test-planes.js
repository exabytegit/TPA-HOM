const state = new Map();
const cardElements = new Map();
const delayMs = 500;
const autoOpenLink = false;
let catalog = [];
let isTestingAll = false;

const cardsGrid = document.getElementById("cards-grid");
const loadStatus = document.getElementById("load-status");
const testAllButton = document.getElementById("test-all-button");
const resetButton = document.getElementById("reset-button");

const statusText = {
  idle: "Pendiente",
  running: "Generando...",
  ok: "Disponible",
  "error-catalog": "Error catalogo",
  "error-toyota-transient": "Error temporal",
  "error-backend": "Error temporal"
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

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);

const createCorrelationId = () =>
  `test-planes-ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const initialCardState = () => ({
  status: "idle",
  httpStatus: "-",
  code: "-",
  linkHost: "-",
  correlationId: "-",
  detail: "-",
  sandboxLink: null,
  advisorMessage: "",
  detailsOpen: false,
  diagnosticOpen: false
});

function getVehicleImageUrl(item) {
  const key = `${item.modelId}-${item.planId}`;
  return vehicleImagesByModelPlan[key] || null;
}

function modelInitials(modelDescription) {
  if (typeof modelDescription !== "string" || modelDescription.trim() === "") return "TP";
  const parts = modelDescription
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "");

  return parts.join("") || "TP";
}

function setLoadStatus(message) {
  loadStatus.textContent = message;
}

function setButtonBusy(button, isBusy) {
  button.disabled = isBusy || isTestingAll;
  button.textContent = isBusy ? "Generando..." : "Suscripcion Online";
}

function renderCardState(slug) {
  const cardState = state.get(slug);
  const elements = cardElements.get(slug);
  if (!cardState || !elements) return;

  elements.statusBadge.textContent = statusText[cardState.status] || statusText.idle;
  elements.statusBadge.className = `badge badge-${cardState.status}`;

  elements.result.textContent =
    cardState.status === "ok"
      ? `Link generado. linkHost: ${cardState.linkHost}`
      : cardState.status === "idle"
        ? "Listo para probar en sandbox."
        : cardState.detail;

  setButtonBusy(elements.subscribeButton, cardState.status === "running");
  elements.openButton.hidden = !cardState.sandboxLink;
  elements.openButton.disabled = !cardState.sandboxLink || cardState.status === "running";

  elements.detailsPanel.hidden = !cardState.detailsOpen;
  elements.diagnosticDetails.open = cardState.diagnosticOpen;
  elements.detailsButton.textContent = cardState.detailsOpen ? "Ocultar detalles" : "Ver mas detalles";

  elements.advisorMessage.textContent = cardState.advisorMessage;
  elements.httpStatus.textContent = `HTTP: ${cardState.httpStatus}`;
  elements.code.textContent = `code: ${cardState.code}`;
  elements.correlationId.textContent = `correlationId: ${cardState.correlationId}`;
  elements.detail.textContent = `detalle: ${cardState.detail}`;
  elements.linkHost.textContent = `linkHost: ${cardState.linkHost}`;
}

function setCardState(slug, partialState) {
  const currentState = state.get(slug) || initialCardState();
  state.set(slug, { ...currentState, ...partialState });
  renderCardState(slug);
}

function classifyHttpError(statusCode, code, upstreamMessage) {
  const normalized = typeof upstreamMessage === "string" ? upstreamMessage.toLowerCase() : "";

  if (
    code === "TOYOTA_PLAN_LINK_REJECTED" ||
    statusCode === 422 ||
    normalized.includes("cuota 1") ||
    normalized.includes("valor de lista")
  ) {
    return "error-catalog";
  }

  if (
    code === "TOYOTA_PLAN_UPSTREAM_ERROR" ||
    code === "TOYOTA_PLAN_GENERATE_LINK_TIMEOUT" ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    normalized === "internal server error"
  ) {
    return "error-toyota-transient";
  }

  return "error-backend";
}

async function runSingleTest(slug) {
  const elements = cardElements.get(slug);
  const correlationId = createCorrelationId();

  setCardState(slug, {
    status: "running",
    httpStatus: "-",
    code: "-",
    linkHost: "-",
    correlationId,
    detail: "Generando link sandbox...",
    sandboxLink: null
  });

  try {
    const response = await fetch("/api/toyota-plan/generate-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-correlation-id": correlationId
      },
      body: JSON.stringify({ slug })
    });

    const responseCorrelationId = response.headers.get("x-correlation-id") || correlationId;
    const body = await response.json().catch(() => ({}));

    if (!response.ok || body.success !== true) {
      const code = typeof body.code === "string" ? body.code : "UNKNOWN_ERROR";
      const details = typeof body.details === "object" && body.details ? body.details : {};
      const upstreamMessage =
        typeof details.upstreamMessage === "string"
          ? details.upstreamMessage
          : typeof body.message === "string"
            ? body.message
            : "Error sin detalle";

      setCardState(slug, {
        status: classifyHttpError(response.status, code, upstreamMessage),
        httpStatus: String(response.status),
        code,
        linkHost: "-",
        correlationId: responseCorrelationId,
        sandboxLink: null,
        detail: upstreamMessage
      });
      return;
    }

    const linkHost = new URL(body.link).hostname;
    setCardState(slug, {
      status: "ok",
      httpStatus: String(response.status),
      code: "-",
      linkHost,
      correlationId: responseCorrelationId,
      sandboxLink: body.link,
      detail: `success=true | model=${body.model} | plan=${body.plan} | amount=${body.amount}`
    });

    if (autoOpenLink && elements) {
      window.open(body.link, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    setCardState(slug, {
      status: "error-backend",
      httpStatus: "-",
      code: "FETCH_ERROR",
      linkHost: "-",
      sandboxLink: null,
      detail: error instanceof Error ? error.message : "Unexpected error"
    });
  }
}

async function runAllSequentially() {
  isTestingAll = true;
  testAllButton.disabled = true;
  resetButton.disabled = true;
  for (const item of catalog) renderCardState(item.slug);

  try {
    for (const item of catalog) {
      await runSingleTest(item.slug);
      await sleep(delayMs);
    }
  } finally {
    isTestingAll = false;
    testAllButton.disabled = false;
    resetButton.disabled = false;
    for (const item of catalog) renderCardState(item.slug);
  }
}

function resetResults() {
  for (const item of catalog) {
    state.set(item.slug, initialCardState());
    renderCardState(item.slug);
  }
}

function createMetaLine(label, value) {
  const paragraph = document.createElement("p");
  paragraph.className = "meta-line";
  paragraph.textContent = `${label}: ${value}`;
  return paragraph;
}

function createButton(label, className) {
  const button = document.createElement("button");
  button.className = className;
  button.textContent = label;
  return button;
}

function buildCards() {
  cardsGrid.textContent = "";
  cardElements.clear();

  if (catalog.length === 0) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "empty-card";

    const title = document.createElement("h2");
    title.textContent = "Catalogo vacio";
    const message = document.createElement("p");
    message.textContent = "No se encontraron modelos en /api/dev/catalog.";

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
      visual.setAttribute("aria-hidden", "true");
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
    amountLabel.textContent = "Cuota adhesion:";
    const amountValue = document.createElement("p");
    amountValue.className = "amount-value";
    amountValue.textContent = formatCurrency(item.amount);
    amountBox.appendChild(amountLabel);
    amountBox.appendChild(amountValue);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const detailsButton = createButton("Ver mas detalles", "btn btn-secondary");
    const advisorButton = createButton("Solicitar un Asesor", "btn btn-secondary");
    const subscribeButton = createButton("Suscripcion Online", "btn btn-primary");
    const openButton = createButton("Abrir link sandbox", "btn btn-secondary");
    openButton.hidden = true;

    detailsButton.addEventListener("click", () => {
      const currentState = state.get(item.slug) || initialCardState();
      setCardState(item.slug, { detailsOpen: !currentState.detailsOpen });
    });

    advisorButton.addEventListener("click", () => {
      setCardState(item.slug, { advisorMessage: "Funcion no implementada en sandbox." });
    });

    subscribeButton.addEventListener("click", () => runSingleTest(item.slug));

    openButton.addEventListener("click", () => {
      const currentState = state.get(item.slug);
      if (!currentState || !currentState.sandboxLink) return;
      window.open(currentState.sandboxLink, "_blank", "noopener,noreferrer");
    });

    actions.appendChild(detailsButton);
    actions.appendChild(advisorButton);
    actions.appendChild(subscribeButton);
    actions.appendChild(openButton);

    const statusBadge = document.createElement("span");
    statusBadge.className = "badge badge-idle";
    statusBadge.textContent = statusText.idle;

    const result = document.createElement("p");
    result.className = "result";
    result.textContent = "Listo para probar en sandbox.";

    const advisorMessage = document.createElement("p");
    advisorMessage.className = "result";

    const detailsPanel = document.createElement("div");
    detailsPanel.className = "details-panel";
    detailsPanel.hidden = true;
    detailsPanel.appendChild(createMetaLine("Modelo", item.modelDescription));
    detailsPanel.appendChild(createMetaLine("Plan", item.planDescription));
    detailsPanel.appendChild(createMetaLine("Amount", formatCurrency(item.amount)));
    detailsPanel.appendChild(createMetaLine("modelId", item.modelId));
    detailsPanel.appendChild(createMetaLine("planId", item.planId));

    const diagnosticDetails = document.createElement("details");
    diagnosticDetails.className = "diagnostic-details";
    const diagnosticSummary = document.createElement("summary");
    diagnosticSummary.textContent = "Ver diagnostico tecnico";
    diagnosticDetails.appendChild(diagnosticSummary);

    const diagnosticPanel = document.createElement("div");
    diagnosticPanel.className = "diagnostic-panel";
    const slug = createMetaLine("slug", item.slug);
    const modelId = createMetaLine("modelId", item.modelId);
    const planId = createMetaLine("planId", item.planId);
    const seller = createMetaLine("seller", item.seller);
    const httpStatus = createMetaLine("HTTP", "-");
    const code = createMetaLine("code", "-");
    const correlationId = createMetaLine("correlationId", "-");
    const detail = createMetaLine("detalle", "-");
    const linkHost = createMetaLine("linkHost", "-");
    diagnosticPanel.appendChild(slug);
    diagnosticPanel.appendChild(modelId);
    diagnosticPanel.appendChild(planId);
    diagnosticPanel.appendChild(seller);
    diagnosticPanel.appendChild(httpStatus);
    diagnosticPanel.appendChild(code);
    diagnosticPanel.appendChild(correlationId);
    diagnosticPanel.appendChild(detail);
    diagnosticPanel.appendChild(linkHost);
    diagnosticDetails.appendChild(diagnosticPanel);

    diagnosticDetails.addEventListener("toggle", () => {
      const currentState = state.get(item.slug);
      if (!currentState || currentState.diagnosticOpen === diagnosticDetails.open) return;
      state.set(item.slug, { ...currentState, diagnosticOpen: diagnosticDetails.open });
    });

    body.appendChild(title);
    body.appendChild(plan);
    body.appendChild(amountBox);
    body.appendChild(actions);
    body.appendChild(statusBadge);
    body.appendChild(result);
    body.appendChild(advisorMessage);
    body.appendChild(detailsPanel);
    body.appendChild(diagnosticDetails);

    card.appendChild(visual);
    card.appendChild(body);
    cardsGrid.appendChild(card);

    cardElements.set(item.slug, {
      detailsButton,
      diagnosticDetails,
      subscribeButton,
      openButton,
      statusBadge,
      result,
      advisorMessage,
      detailsPanel,
      httpStatus,
      code,
      correlationId,
      detail,
      linkHost
    });

    renderCardState(item.slug);
  }
}

async function loadCatalog() {
  const correlationId = createCorrelationId();
  setLoadStatus("Cargando catalogo de prueba...");
  testAllButton.disabled = true;
  resetButton.disabled = true;

  try {
    const response = await fetch("/api/dev/catalog", {
      headers: {
        "x-correlation-id": correlationId
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al cargar /api/dev/catalog`);
    }

    const body = await response.json();

    if (!Array.isArray(body)) {
      throw new Error("Respuesta invalida de /api/dev/catalog");
    }

    catalog = body;
    buildCards();
    testAllButton.disabled = catalog.length === 0;
    resetButton.disabled = catalog.length === 0;
    setLoadStatus(`Catalogo cargado: ${catalog.length} modelos disponibles para testing local.`);
  } catch (error) {
    catalog = [];
    buildCards();
    setLoadStatus(
      `No se pudo cargar el catalogo local. ${
        error instanceof Error ? error.message : "Error desconocido"
      }`
    );
  }
}

testAllButton.addEventListener("click", runAllSequentially);
resetButton.addEventListener("click", resetResults);
loadCatalog();
