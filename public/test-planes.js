const state = new Map();
const cardElements = new Map();
const delayMs = 500;
let catalog = [];

const cardsGrid = document.getElementById("cards-grid");
const banner = document.getElementById("catalog-banner");
const testAllButton = document.getElementById("test-all-button");
const resetButton = document.getElementById("reset-button");
const summaryTotal = document.getElementById("summary-total");
const summarySuccess = document.getElementById("summary-success");
const summaryFailed = document.getElementById("summary-failed");

const statusText = {
  idle: "Pendiente",
  running: "Probando",
  ok: "OK",
  "error-catalog": "Error catalogo TPA",
  "error-toyota-transient": "Error Toyota transitorio",
  "error-backend": "Error backend/red"
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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
  sandboxLink: null
});

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
  let failed = 0;

  for (const item of catalog) {
    const itemState = state.get(item.slug);
    if (!itemState) continue;
    if (itemState.status === "ok") success += 1;
    if (
      itemState.status === "error-catalog" ||
      itemState.status === "error-toyota-transient" ||
      itemState.status === "error-backend"
    ) {
      failed += 1;
    }
  }

  summaryTotal.textContent = String(catalog.length);
  summarySuccess.textContent = String(success);
  summaryFailed.textContent = String(failed);
}

function renderActions(slug, cardState, actionsElement) {
  const previousTestButton = actionsElement.querySelector("[data-action='test']");
  if (previousTestButton) {
    previousTestButton.disabled = cardState.status === "running" || testAllButton.disabled;
  }

  let openButton = actionsElement.querySelector("[data-action='open']");
  if (cardState.sandboxLink) {
    if (!openButton) {
      openButton = document.createElement("button");
      openButton.className = "btn btn-secondary";
      openButton.textContent = "Abrir link sandbox";
      openButton.setAttribute("data-action", "open");
      openButton.addEventListener("click", () => {
        const currentState = state.get(slug);
        if (!currentState || !currentState.sandboxLink) return;
        window.open(currentState.sandboxLink, "_blank", "noopener,noreferrer");
      });
      actionsElement.appendChild(openButton);
    }

    openButton.disabled = cardState.status === "running" || testAllButton.disabled;
    return;
  }

  if (openButton) {
    openButton.remove();
  }
}

function renderCardState(slug) {
  const cardState = state.get(slug);
  const elements = cardElements.get(slug);
  if (!cardState || !elements) return;

  elements.statusBadge.textContent = statusText[cardState.status] || "Pendiente";
  elements.statusBadge.className = `badge badge-${cardState.status}`;

  elements.httpStatus.textContent = `HTTP: ${cardState.httpStatus}`;
  elements.code.textContent = `Code: ${cardState.code}`;
  elements.linkHost.textContent = `linkHost: ${cardState.linkHost}`;
  elements.correlationId.textContent = `correlationId: ${cardState.correlationId}`;
  elements.detail.textContent = `Detalle: ${cardState.detail}`;

  renderActions(slug, cardState, elements.actions);
  updateSummary();
}

function setCardState(slug, partialState) {
  const currentState = state.get(slug) || initialCardState();
  state.set(slug, { ...currentState, ...partialState });
  renderCardState(slug);
}

function classifyHttpError(statusCode, upstreamMessage) {
  const normalized = typeof upstreamMessage === "string" ? upstreamMessage.toLowerCase() : "";

  if (
    statusCode === 422 ||
    normalized.includes("cuota 1") ||
    normalized.includes("valor de lista")
  ) {
    return "error-catalog";
  }

  if (
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
  const correlationId = createCorrelationId();
  setCardState(slug, {
    status: "running",
    httpStatus: "-",
    code: "-",
    linkHost: "-",
    correlationId,
    detail: "Enviando request...",
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
        status: classifyHttpError(response.status, upstreamMessage),
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
  testAllButton.disabled = true;
  resetButton.disabled = true;
  for (const item of catalog) {
    renderCardState(item.slug);
  }

  try {
    for (const item of catalog) {
      await runSingleTest(item.slug);
      await sleep(delayMs);
    }
  } finally {
    testAllButton.disabled = false;
    resetButton.disabled = false;
    for (const item of catalog) {
      renderCardState(item.slug);
    }
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
  paragraph.className = "card-meta";
  paragraph.textContent = `${label}: ${value}`;
  return paragraph;
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

    const card = document.createElement("article");
    card.className = "plan-card";

    const visual = document.createElement("div");
    visual.className = "card-visual";
    visual.setAttribute("aria-hidden", "true");
    visual.textContent = modelInitials(item.modelDescription);

    const title = document.createElement("h2");
    title.textContent = item.modelDescription;

    const plan = document.createElement("p");
    plan.className = "plan-line";
    plan.textContent = item.planDescription;

    const amount = document.createElement("p");
    amount.className = "amount";
    amount.textContent = formatCurrency(item.amount);

    const slug = document.createElement("p");
    slug.className = "slug";
    const slugCode = document.createElement("code");
    slugCode.textContent = item.slug;
    slug.appendChild(document.createTextNode("slug: "));
    slug.appendChild(slugCode);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const testButton = document.createElement("button");
    testButton.className = "btn btn-primary";
    testButton.textContent = "Suscripcion Online";
    testButton.setAttribute("data-action", "test");
    testButton.addEventListener("click", () => runSingleTest(item.slug));
    actions.appendChild(testButton);

    const statusBadge = document.createElement("span");
    statusBadge.className = "badge badge-idle";
    statusBadge.textContent = statusText.idle;

    const httpStatus = createMetaLine("HTTP", "-");
    const code = createMetaLine("Code", "-");
    const linkHost = createMetaLine("linkHost", "-");
    const correlationId = createMetaLine("correlationId", "-");
    const detail = createMetaLine("Detalle", "-");
    const modelId = createMetaLine("modelId", item.modelId);
    const planId = createMetaLine("planId", item.planId);
    const seller = createMetaLine("seller", item.seller);
    const enabled = createMetaLine("enabled", String(item.enabled));

    card.appendChild(visual);
    card.appendChild(title);
    card.appendChild(plan);
    card.appendChild(amount);
    card.appendChild(actions);
    card.appendChild(statusBadge);
    card.appendChild(httpStatus);
    card.appendChild(code);
    card.appendChild(linkHost);
    card.appendChild(correlationId);
    card.appendChild(detail);
    card.appendChild(modelId);
    card.appendChild(planId);
    card.appendChild(seller);
    card.appendChild(enabled);
    card.appendChild(slug);

    cardsGrid.appendChild(card);

    cardElements.set(item.slug, {
      actions,
      statusBadge,
      httpStatus,
      code,
      linkHost,
      correlationId,
      detail
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
