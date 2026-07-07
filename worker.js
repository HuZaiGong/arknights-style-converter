import {
  appDefaults,
  buildPrompt,
  classifyUpstreamError,
  extractChoiceText,
  makeError,
  validateApiBaseUrl,
  validateTransformPayload
} from "./config.js";

function corsHeaders(origin) {
  if (!origin || !appDefaults.allowedOrigins.includes(origin)) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(payload, status = 200, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...(corsHeaders(origin) || {}),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function errorResponse(error, origin) {
  return jsonResponse({
    ok: false,
    code: error.code,
    message: error.message
  }, error.status || 500, origin);
}

function isJsonRequest(request) {
  return String(request.headers.get("content-type") || "").includes("application/json");
}

function checkBodySize(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > appDefaults.maxBodyBytes) {
    return makeError("body_too_large", 413);
  }
  return null;
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
    if (error.name === "AbortError") {
      throw makeError("upstream_timeout", 504);
    }
    if (error?.code && error?.message) {
      throw error;
    }
    throw makeError("network_error", 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonPayload(request) {
  const body = await request.text();
  if (new TextEncoder().encode(body).length > appDefaults.maxBodyBytes) {
    throw makeError("body_too_large", 413);
  }
  return JSON.parse(body || "{}");
}

async function transform(request, origin) {
  if (!isJsonRequest(request)) {
    return errorResponse(makeError("bad_content_type", 415), origin);
  }

  const bodySizeError = checkBodySize(request);
  if (bodySizeError) {
    return errorResponse(bodySizeError, origin);
  }

  let payload;

  try {
    payload = await readJsonPayload(request);
  } catch (error) {
    return errorResponse(error?.code ? error : makeError("bad_json", 400), origin);
  }

  const validation = validateTransformPayload(payload);
  if (validation.error) {
    return errorResponse(validation.error, origin);
  }

  const apiUrlError = validateApiBaseUrl(validation.value.apiBaseUrl, { restrictHosts: true });
  if (apiUrlError) {
    return errorResponse(apiUrlError, origin);
  }

  try {
    const result = await callChatCompletion(validation.value);
    return jsonResponse(result, 200, origin);
  } catch (error) {
    return errorResponse(error, origin);
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    const headers = corsHeaders(origin);

    if (url.pathname !== "/api/transform") {
      return jsonResponse({ ok: false, code: "not_found", message: makeError("not_found", 404).message }, 404, origin);
    }

    if (!headers) {
      return errorResponse(makeError("origin_not_allowed", 403), origin);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return errorResponse(makeError("method_not_allowed", 405), origin);
    }

    return transform(request, origin);
  }
};
