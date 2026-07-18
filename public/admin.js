const AUTH_STORAGE_KEY = "tpa_admin_authenticated";
const SESSION_TOKEN_STORAGE_KEY = "tpa_admin_session_token";
const ENVIRONMENT_STORAGE_KEY = "tpa_admin_toyota_plan_environment";
const delayMs = 500;

const loginScreen = document.getElementById("login-screen");
const adminScreen = document.getElementById("admin-screen");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");
const loginFeedback = document.getElementById("login-feedback");
const logoutButton = document.getElementById("logout-button");
const catalogBody = document.getElementById("catalog-body");
const banner = document.getElementById("catalog-banner");
const testAllButton = document.getElementById("test-all-button");
const updatePricesButton = document.getElementById("update-prices-button");
const updatePricesButtonSecondary = document.getElementById("update-prices-button-secondary");
const resetButton = document.getElementById("reset-button");
const summaryTotal = document.getElementById("summary-total");
const summarySuccess = document.getElementById("summary-success");
const summaryFailed = document.getElementById("summary-failed");
const catalogCount = document.getElementById("catalog-count");
const updateFeedback = document.getElementById("update-feedback");
const updateUpdated = document.getElementById("update-updated");
const updateUnchanged = document.getElementById("update-unchanged");
const updateSheetOnly = document.getElementById("update-sheet-only");
const updateCatalogOnly = document.getElementById("update-catalog-only");
const updateChangesBody = document.getElementById("update-changes-body");
const environmentValue = document.getElementById("environment-value");

const state = new Map();
const rowElements = new Map();
let catalog = [];
let toyotaPlanEnvironment = "sandbox";

const formatAmount = (value) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const createCorrelationId = () =>
  `admin-ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const initialRowState = () => ({
  status: "idle",
  httpStatus: "-",
  code: "-",
  linkHost: "-",
  correlationId: "-",
  detail: ""
});

const statusText = {
  idle: "Pendiente",
  running: "Probando",
  ok: "OK",
  "error-catalog": "Error catalogo TPA",
  "error-toyota-transient": "Error Toyota transitorio",
  "error-backend": "Error backend/red"
};

function showLogin(message = "") {
  loginScreen.hidden = false;
  adminScreen.hidden = true;
  loginFeedback.textContent = message;
  if (usernameInput instanceof HTMLInputElement) {
    usernameInput.focus();
  }
}

function showAdmin() {
  loginScreen.hidden = true;
  adminScreen.hidden = false;
  loginFeedback.textContent = "";
}

function setBanner(message, isError = false) {
  banner.textContent = message;
  banner.className = isError ? "banner error" : "banner";
}

function setUpdateFeedback(message, isError = false) {
  if (!(updateFeedback instanceof HTMLElement)) return;
  updateFeedback.textContent = message;
  updateFeedback.className = isError ? "banner update-banner error" : "banner update-banner";
}

function normalizeEnvironment(value) {
  return value === "production" ? "production" : "sandbox";
}

function renderEnvironment() {
  if (!(environmentValue instanceof HTMLElement)) return;
  environmentValue.textContent = toyotaPlanEnvironment === "production" ? "Produccion" : "Sandbox";
}

function setUpdateSummary(result) {
  if (updateUpdated instanceof HTMLElement) {
    updateUpdated.textContent = String(result?.updatedCount ?? 0);
  }
  if (updateUnchanged instanceof HTMLElement) {
    updateUnchanged.textContent = String(result?.unchangedCount ?? 0);
  }
  if (updateSheetOnly instanceof HTMLElement) {
    updateSheetOnly.textContent = String(result?.sheetOnlyCount ?? 0);
  }
  if (updateCatalogOnly instanceof HTMLElement) {
    updateCatalogOnly.textContent = String(result?.catalogOnlyCount ?? 0);
  }
}

function renderUpdateChanges(changes) {
  if (!(updateChangesBody instanceof HTMLElement)) return;

  updateChangesBody.replaceChildren();

  if (!Array.isArray(changes) || changes.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty";
    cell.textContent = "Sin cambios para mostrar.";
    row.appendChild(cell);
    updateChangesBody.appendChild(row);
    return;
  }

  changes.forEach((change) => {
    const row = document.createElement("tr");
    const modelIdCell = document.createElement("td");
    modelIdCell.textContent = String(change.modelId ?? "-");
    const planIdCell = document.createElement("td");
    planIdCell.textContent = String(change.planId ?? "-");
    const slugCell = document.createElement("td");
    slugCell.textContent = String(change.slug ?? "-");
    const oldAmountCell = document.createElement("td");
    oldAmountCell.textContent = formatAmount(Number(change.oldAmount ?? 0));
    const newAmountCell = document.createElement("td");
    newAmountCell.textContent = formatAmount(Number(change.newAmount ?? 0));

    row.appendChild(modelIdCell);
    row.appendChild(planIdCell);
    row.appendChild(slugCell);
    row.appendChild(oldAmountCell);
    row.appendChild(newAmountCell);
    updateChangesBody.appendChild(row);
  });
}

function setAdminActionsDisabled(disabled) {
  if (testAllButton instanceof HTMLButtonElement) {
    testAllButton.disabled = disabled || catalog.length === 0;
  }
  if (resetButton instanceof HTMLButtonElement) {
    resetButton.disabled = disabled || catalog.length === 0;
  }
  if (updatePricesButton instanceof HTMLButtonElement) {
    updatePricesButton.disabled = disabled;
  }
  if (updatePricesButtonSecondary instanceof HTMLButtonElement) {
    updatePricesButtonSecondary.disabled = disabled;
  }
}

function persistEnvironment(value) {
  toyotaPlanEnvironment = normalizeEnvironment(value);
  sessionStorage.setItem(ENVIRONMENT_STORAGE_KEY, toyotaPlanEnvironment);
  renderEnvironment();
}

function updateSummary() {
  let success = 0;
  let failed = 0;

  catalog.forEach((item) => {
    const rowState = state.get(item.slug);
    if (!rowState) return;
    if (rowState.status === "ok") success += 1;
    if (
      rowState.status === "error-catalog" ||
      rowState.status === "error-toyota-transient" ||
      rowState.status === "error-backend"
    ) {
      failed += 1;
    }
  });

  summaryTotal.textContent = String(catalog.length);
  summarySuccess.textContent = String(success);
  summaryFailed.textContent = String(failed);
  if (catalogCount instanceof HTMLElement) {
    catalogCount.textContent = String(catalog.length);
  }
}

function renderActions(slug, rowState, actionsCell) {
  actionsCell.replaceChildren();

  const testButton = document.createElement("button");
  testButton.type = "button";
  testButton.className = "btn btn-primary";
  testButton.textContent = "Probar";
  testButton.disabled = rowState.status === "running" || testAllButton.disabled;
  testButton.addEventListener("click", () => runSingleTest(slug));
  actionsCell.appendChild(testButton);
}

function renderStatusBadge(rowState) {
  const badge = document.createElement("span");
  badge.className = `status-pill status-${rowState.status}`;
  badge.textContent = statusText[rowState.status] || statusText.idle;
  return badge;
}

function renderRowState(slug) {
  const rowState = state.get(slug);
  const elements = rowElements.get(slug);
  if (!rowState || !elements) return;

  const row = catalog.find((item) => item.slug === slug);
  if (row && elements.amount) {
    elements.amount.textContent = formatAmount(row.amount);
  }

  elements.status.replaceChildren(renderStatusBadge(rowState));
  elements.httpStatus.textContent = rowState.httpStatus;
  elements.code.textContent = rowState.code;
  elements.linkHost.textContent = rowState.linkHost;
  elements.correlationId.textContent = rowState.correlationId;
  elements.detail.textContent = rowState.detail;
  renderActions(slug, rowState, elements.actions);
  updateSummary();
}

function setRowState(slug, partialState) {
  const currentState = state.get(slug) || initialRowState();
  state.set(slug, { ...currentState, ...partialState });
  renderRowState(slug);
}

function classifyHttpError(status, message) {
  const normalizedMessage = typeof message === "string" ? message.toLowerCase() : "";

  if (
    normalizedMessage.includes("cuota 1") ||
    normalizedMessage.includes("valor de lista") ||
    status === 422
  ) {
    return "error-catalog";
  }

  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    normalizedMessage === "internal server error"
  ) {
    return "error-toyota-transient";
  }

  return "error-backend";
}

async function runSingleTest(slug) {
  const row = catalog.find((item) => item.slug === slug);
  if (!row) return;

  const correlationId = createCorrelationId();
  setRowState(slug, {
    status: "running",
    httpStatus: "-",
    code: "-",
    linkHost: "-",
    correlationId,
    detail: "Enviando request..."
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
      const details = body.details || {};
      const upstreamMessage = typeof details.upstreamMessage === "string" ? details.upstreamMessage : "";
      const code = typeof body.code === "string" ? body.code : "UNKNOWN_ERROR";
      const detailParts = [`HTTP ${response.status}`, `code=${code}`];

      if (upstreamMessage) {
        detailParts.push(`upstream=${upstreamMessage}`);
      } else if (body.message) {
        detailParts.push(`message=${body.message}`);
      }

      setRowState(slug, {
        status: classifyHttpError(response.status, upstreamMessage || body.message),
        httpStatus: String(response.status),
        code,
        correlationId: responseCorrelationId,
        linkHost: "-",
        detail: detailParts.join(" | ")
      });
      return;
    }

    const linkHost = new URL(body.link).hostname;
    setRowState(slug, {
      status: "ok",
      httpStatus: String(response.status),
      code: "-",
      correlationId: responseCorrelationId,
      linkHost,
      detail: `success=true | model=${body.model} | plan=${body.plan} | amount=${body.amount}`
    });
  } catch (error) {
    setRowState(slug, {
      status: "error-backend",
      httpStatus: "-",
      code: "FETCH_ERROR",
      linkHost: "-",
      detail: error instanceof Error ? error.message : "Unexpected error"
    });
  }
}

async function runAllSequentially() {
  setAdminActionsDisabled(true);
  catalog.forEach((item) => renderRowState(item.slug));

  try {
    for (const item of catalog) {
      await runSingleTest(item.slug);
      await sleep(delayMs);
    }
  } finally {
    setAdminActionsDisabled(catalog.length === 0);
    catalog.forEach((item) => renderRowState(item.slug));
  }
}

function resetResults() {
  catalog.forEach((item) => {
    state.set(item.slug, initialRowState());
    renderRowState(item.slug);
  });
}

function getAdminSessionToken() {
  const token = sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
  return typeof token === "string" && token.trim() !== "" ? token : null;
}

async function updatePricesFromSheet() {
  const token = getAdminSessionToken();
  if (!token) {
    setUpdateFeedback("Sesion admin invalida. Volve a iniciar sesion.", true);
    return;
  }

  const confirmed = window.confirm(
    "Esto actualiza solo los importes amount del catalogo local desde el Sheet publico. \n" +
      "Se creara un backup si hay cambios. Deseas continuar?"
  );

  if (!confirmed) {
    setUpdateFeedback("Actualizacion cancelada por el usuario.");
    setAdminActionsDisabled(catalog.length === 0);
    catalog.forEach((item) => renderRowState(item.slug));
    return;
  }

  setAdminActionsDisabled(true);
  catalog.forEach((item) => renderRowState(item.slug));
  setUpdateFeedback("Actualizando precios desde Sheet...");

  try {
    const response = await fetch("/api/dev/admin/catalog/update-amounts-from-sheet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-session": token,
        "x-correlation-id": createCorrelationId()
      }
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || body.success !== true) {
      const message = typeof body.message === "string" ? body.message : `HTTP ${response.status}`;
      setUpdateFeedback(`No se pudo actualizar el catalogo. ${message}`, true);
      if (response.status === 401) {
        clearSessionAndReset();
      } else {
        setAdminActionsDisabled(false);
      }
      return;
    }

    setUpdateSummary(body);
    renderUpdateChanges(body.changes);

    if (body.updatedCount > 0) {
      setUpdateFeedback(
        `Catalogo actualizado correctamente. ${body.updatedCount} importe(s) cambiaron. Backup: ${
          body.backupCreated ? "si" : "no"
        }. Reporte: ${body.reportPath}.`
      );
    } else {
      setUpdateFeedback("El catalogo ya esta sincronizado con el Sheet.");
    }

    await loadCatalog();
  } catch (error) {
    setUpdateFeedback(
      `No se pudo actualizar el catalogo. ${
        error instanceof Error ? error.message : "Error desconocido"
      }`,
      true
    );
  } finally {
    setAdminActionsDisabled(catalog.length === 0);
    catalog.forEach((item) => renderRowState(item.slug));
  }
}

function buildTable() {
  catalogBody.replaceChildren();
  rowElements.clear();

  if (catalog.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 11;
    cell.className = "empty";
    cell.textContent = "No se encontraron modelos en /api/dev/catalog.";
    row.appendChild(cell);
    catalogBody.appendChild(row);
    updateSummary();
    return;
  }

  catalog.forEach((item) => {
    state.set(item.slug, initialRowState());

    const row = document.createElement("tr");

    const slugCell = document.createElement("td");
    const slugCode = document.createElement("code");
    slugCode.textContent = item.slug;
    slugCell.appendChild(slugCode);

    const modelCell = document.createElement("td");
    modelCell.textContent = item.modelDescription;

    const planCell = document.createElement("td");
    planCell.textContent = item.planDescription;

    const amountCell = document.createElement("td");
    amountCell.textContent = formatAmount(item.amount);

    const actionsCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const httpStatusCell = document.createElement("td");
    const codeCell = document.createElement("td");
    const linkHostCell = document.createElement("td");
    const correlationIdCell = document.createElement("td");
    const detailCell = document.createElement("td");
    detailCell.className = "message";

    row.appendChild(slugCell);
    row.appendChild(modelCell);
    row.appendChild(planCell);
    row.appendChild(amountCell);
    row.appendChild(actionsCell);
    row.appendChild(statusCell);
    row.appendChild(httpStatusCell);
    row.appendChild(codeCell);
    row.appendChild(linkHostCell);
    row.appendChild(correlationIdCell);
    row.appendChild(detailCell);

    rowElements.set(item.slug, {
      actions: actionsCell,
      status: statusCell,
      amount: amountCell,
      httpStatus: httpStatusCell,
      code: codeCell,
      linkHost: linkHostCell,
      correlationId: correlationIdCell,
      detail: detailCell
    });

    catalogBody.appendChild(row);
    renderRowState(item.slug);
  });

  updateSummary();
}

async function loadCatalog() {
  const correlationId = createCorrelationId();
  setBanner("Cargando catalogo...");
  setAdminActionsDisabled(true);

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
    buildTable();
    setAdminActionsDisabled(catalog.length === 0);
    setBanner(`Catalogo cargado: ${catalog.length} modelos disponibles para testing local.`);
  } catch (error) {
    catalog = [];
    buildTable();
    setBanner(
      `No se pudo cargar el catalogo local. ${error instanceof Error ? error.message : "Error desconocido"}`,
      true
    );
  }
}

function clearSessionAndReset() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(ENVIRONMENT_STORAGE_KEY);
  toyotaPlanEnvironment = "sandbox";
  catalog = [];
  state.clear();
  rowElements.clear();
  if (passwordInput instanceof HTMLInputElement) {
    passwordInput.value = "";
  }
  setUpdateSummary({
    updatedCount: 0,
    unchangedCount: 0,
    sheetOnlyCount: 0,
    catalogOnlyCount: 0
  });
  renderUpdateChanges([]);
  setUpdateFeedback("Esperando validacion del catalogo...");
  buildTable();
  setBanner("Sesion cerrada. Vuelve a ingresar para continuar.");
  showLogin();
}

async function handleLogin(event) {
  event.preventDefault();
  loginFeedback.textContent = "";

  const username = usernameInput instanceof HTMLInputElement ? usernameInput.value.trim() : "";
  const password = passwordInput instanceof HTMLInputElement ? passwordInput.value : "";

  try {
    const response = await fetch("/api/dev/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || body.success !== true) {
      loginFeedback.textContent = "Credenciales invalidas";
      return;
    }

    sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
    if (typeof body.adminSessionToken === "string" && body.adminSessionToken.trim() !== "") {
      sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, body.adminSessionToken);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    }
    persistEnvironment(body.toyotaPlanEnvironment);
    if (passwordInput instanceof HTMLInputElement) {
      passwordInput.value = "";
    }
    showAdmin();
    await loadCatalog();
  } catch (_error) {
    loginFeedback.textContent = "No se pudo iniciar sesion en este momento.";
  }
}

function boot() {
  const persistedEnvironment = sessionStorage.getItem(ENVIRONMENT_STORAGE_KEY);
  if (persistedEnvironment) {
    toyotaPlanEnvironment = normalizeEnvironment(persistedEnvironment);
  }
  renderEnvironment();

  if (sessionStorage.getItem(AUTH_STORAGE_KEY) === "true" && getAdminSessionToken()) {
    showAdmin();
    loadCatalog();
  } else {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(ENVIRONMENT_STORAGE_KEY);
    toyotaPlanEnvironment = "sandbox";
    renderEnvironment();
    showLogin();
  }

  loginForm.addEventListener("submit", handleLogin);
  logoutButton.addEventListener("click", clearSessionAndReset);
  testAllButton.addEventListener("click", runAllSequentially);
  resetButton.addEventListener("click", resetResults);
  if (updatePricesButton instanceof HTMLButtonElement) {
    updatePricesButton.addEventListener("click", updatePricesFromSheet);
  }
  if (updatePricesButtonSecondary instanceof HTMLButtonElement) {
    updatePricesButtonSecondary.addEventListener("click", updatePricesFromSheet);
  }
}

boot();
