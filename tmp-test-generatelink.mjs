import "dotenv/config";

const tokenParams = new URLSearchParams({
  client_id: process.env.TOYOTA_PLAN_CLIENT_ID,
  client_secret: process.env.TOYOTA_PLAN_CLIENT_SECRET,
  grant_type: "client_credentials",
  scope: process.env.TOYOTA_PLAN_SCOPE || "ext-link/write"
});

const tokenRes = await fetch(process.env.TOYOTA_PLAN_TOKEN_URL_SANDBOX, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: tokenParams
});

const tokenJson = await tokenRes.json();

console.log("TOKEN RESULT:", {
  status: tokenRes.status,
  ok: tokenRes.ok,
  token_type: tokenJson.token_type,
  expires_in: tokenJson.expires_in,
  access_token_loaded: !!tokenJson.access_token,
  access_token_length: tokenJson.access_token?.length,
  error: tokenJson.error,
  message: tokenJson.message
});

if (!tokenRes.ok || !tokenJson.access_token) {
  process.exit(1);
}

const payload = {
  modelId: "114",
  planId: "113",
  amount: 558824.14,
  seller: "HOM"
};

const linkRes = await fetch(process.env.TOYOTA_PLAN_GENERATE_LINK_URL_SANDBOX, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${tokenJson.access_token}`
  },
  body: JSON.stringify(payload)
});

const raw = await linkRes.text();

let linkJson = {};
try {
  linkJson = JSON.parse(raw);
} catch {
  linkJson = { raw };
}

let linkHost = null;
let linkLoaded = false;
let linkLength = null;

if (linkJson.link) {
  linkLoaded = true;
  linkLength = linkJson.link.length;
  try {
    linkHost = new URL(linkJson.link).hostname;
  } catch {}
}

console.log("GENERATE LINK RESULT:", {
  status: linkRes.status,
  ok: linkRes.ok,
  success: linkJson.success,
  link_loaded: linkLoaded,
  link_length: linkLength,
  link_host: linkHost,
  message: linkJson.message,
  error: linkJson.error,
  response: linkJson.link ? "[LINK_REDACTED]" : linkJson
});
