const state = new Map();
const cardElements = new Map();
const delayMs = 500;
const autoOpenLink = false;
let catalog = [];
let isTestingAll = false;

const cardsGrid = document.getElementById("cards-grid");
const banner = document.getElementById("catalog-banner");
const testAllButton = document.getElementById("test-all-button");
const resetButton = document.getElementById("reset-button");
const summaryTotal = document.getElementById("summary-total");
const summarySuccess = document.getElementById("summary-success");
const summaryCatalog = document.getElementById("summary-catalog");
const summaryUpstream = document.getElementById("summary-upstream");
const summaryBackend = document.getElementById("summary-backend");

const statusText = {
  idle: "Pendiente",
  running: "Generando...",
  ok: "OK",
  "error-catalog": "Error catalogo TPA",
  "error-toyota-transient": "Error Toyota transitorio",
  "error-backend": "Error backend/red"
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

function getVehicleVisual(modelDescription) {
  return {
    type: "placeholder",
    label: modelInitials(modelDescription)
  };
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

function setBanner(message, isError = false) {
  banner.textContent = message;
  banner.className = isError ? "banner error" : "banner";
}

function updateSummary() {
  let success = 0;
  let catalogErrors = 0;
  let upstreamErrors = 0;
  let backendErrors = 0;

  for (const item of catalog) {
    const itemState = state.get(item.slug);
    if (!itemState) continue;
    if (itemState.status === "ok") success += 1;
    if (itemState.status === "error-catalog") catalogErrors += 1;
    if (itemState.status === "error-toyota-transient") upstreamErrors += 1;
    if (itemState.status === "error-backend") backendErrors += 1;
  }

  summaryTotal.textContent = String(catalog.length);
  summarySuccess.textContent = String(success);
  summaryCatalog.textContent = String(catalogErrors);
  summaryUpstream.textContent = String(upstreamErrors);
  summaryBackend.textContent = String(backendErrors);
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
  elements.diagnosticPanel.hidden = !cardState.diagnosticOpen;
  elements.detailsButton.textContent = cardState.detailsOpen ? "Ocultar detalles" : "Ver mas detalles";
  elements.diagnosticButton.textContent = cardState.diagnosticOpen ? "Ocultar diagnostico" : "Ver diagnostico";

  elements.advisorMessage.textContent = cardState.advisorMessage;
  elements.httpStatus.textContent = `HTTP: ${cardState.httpStatus}`;
  elements.code.textContent = `code: ${cardState.code}`;
  elements.correlationId.textContent = `correlationId: ${cardState.correlationId}`;
  elements.detail.textContent = `detalle: ${cardState.detail}`;
  elements.linkHost.textContent = `linkHost: ${cardState.linkHost}`;

  updateSummary();
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
    updateSummary();
    return;
  }

  for (const item of catalog) {
    state.set(item.slug, initialCardState());

    const vehicleVisual = getVehicleVisual(item.modelDescription);
    const card = document.createElement("article");
    card.className = "plan-card";

    const visual = document.createElement("div");
    visual.className = "vehicle-visual";
    visual.setAttribute("aria-hidden", "true");
    const initials = document.createElement("span");
    initials.className = "vehicle-initials";
    initials.textContent = vehicleVisual.label;
    visual.appendChild(initials);

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

    const diagnosticButton = createButton("Ver diagnostico", "btn btn-secondary");

    const diagnosticPanel = document.createElement("div");
    diagnosticPanel.className = "diagnostic-panel";
    diagnosticPanel.hidden = true;
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

    diagnosticButton.addEventListener("click", () => {
      const currentState = state.get(item.slug) || initialCardState();
      setCardState(item.slug, { diagnosticOpen: !currentState.diagnosticOpen });
    });

    body.appendChild(title);
    body.appendChild(plan);
    body.appendChild(amountBox);
    body.appendChild(actions);
    body.appendChild(statusBadge);
    body.appendChild(result);
    body.appendChild(advisorMessage);
    body.appendChild(detailsPanel);
    body.appendChild(diagnosticButton);
    body.appendChild(diagnosticPanel);

    card.appendChild(visual);
    card.appendChild(body);
    cardsGrid.appendChild(card);

    cardElements.set(item.slug, {
      detailsButton,
      diagnosticButton,
      subscribeButton,
      openButton,
      statusBadge,
      result,
      advisorMessage,
      detailsPanel,
      diagnosticPanel,
      httpStatus,
      code,
      correlationId,
      detail,
      linkHost
    });

    renderCardState(item.slug);
  }

  updateSummary();
}

async function loadCatalog() {
  const correlationId = createCorrelationId();
  setBanner("Cargando catalogo de prueba...");
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
    setBanner(`Catalogo cargado: ${catalog.length} modelos disponibles para testing local.`);
  } catch (error) {
    catalog = [];
    buildCards();
    setBanner(
      `No se pudo cargar el catalogo local. ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
      true
    );
  }
}

testAllButton.addEventListener("click", runAllSequentially);
resetButton.addEventListener("click", resetResults);
loadCatalog();
