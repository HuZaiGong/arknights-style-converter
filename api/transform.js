import {
  appDefaults,
  buildPrompt,
  classifyUpstreamError,
  extractChoiceText,
  makeError,
  validateApiBaseUrl,
  validateTransformPayload
} from "../config.js";

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  for (const [key, value] of Object.entries({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  })) {
    res.setHeader(key, value);
  }

  res.status(statusCode).send(JSON.stringify(payload));
}

function sendError(res, error, extraHeaders = {}) {
  sendJson(res, error.status || 500, {
    ok: false,
    code: error.code,
    message: error.message
  }, extraHeaders);
}

function corsHeaders(origin) {
  if (!origin || !appDefaults.allowedOrigins.includes(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > appDefaults.maxBodyBytes) {
        reject(makeError("body_too_large", 413));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function callChatCompletion({ text, personaKey, intensity, apiBaseUrl, apiKey, model }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appDefaults.requestTimeoutMs);

  try {
    const apiRes = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: buildPrompt({ text, personaKey, intensity }),
        temperature: appDefaults.temperature,
        max_tokens: appDefaults.maxOutputTokens,
        stream: false
      }),
      signal: controller.signal
    });

    const responseText = await apiRes.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      data = { raw: responseText };
    }

    if (!apiRes.ok) {
      throw classifyUpstreamError(apiRes.status, data);
    }

    const result = extractChoiceText(data);
    if (!result) {
      throw makeError("upstream_empty", 502);
    }

    return { ok: true, result, model: data.model || model };
  } catch (error) {
    if (error.name === "AbortError") throw makeError("upstream_timeout", 504);
    if (error?.code && error?.message) throw error;
    throw makeError("network_error", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {}, headers);
    return;
  }

  if (req.method !== "POST") {
    sendError(res, makeError("method_not_allowed", 405), headers);
    return;
  }

  if (!String(req.headers["content-type"] || "").includes("application/json")) {
    sendError(res, makeError("bad_content_type", 415), headers);
    return;
  }

  let payload;

  try {
    const body = await readBody(req);
    payload = JSON.parse(body || "{}");
  } catch (error) {
    sendError(res, error?.code ? error : makeError("bad_json", 400), headers);
    return;
  }

  const validation = validateTransformPayload(payload);
  if (validation.error) {
    sendError(res, validation.error, headers);
    return;
  }

  const apiUrlError = validateApiBaseUrl(validation.value.apiBaseUrl);
  if (apiUrlError) {
    sendError(res, apiUrlError, headers);
    return;
  }

  try {
    const result = await callChatCompletion(validation.value);
    sendJson(res, 200, result, headers);
  } catch (error) {
    sendError(res, error, headers);
  }
}
