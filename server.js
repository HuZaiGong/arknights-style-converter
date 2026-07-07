import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appDefaults,
  buildPrompt,
  classifyUpstreamError,
  extractChoiceText,
  makeError,
  validateApiBaseUrl,
  validateTransformPayload
} from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, error) {
  sendJson(res, error.status || 500, {
    ok: false,
    code: error.code,
    message: error.message
  });
}

function readRequestBody(req) {
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

async function handleTransform(req, res) {
  if (!String(req.headers["content-type"] || "").includes("application/json")) {
    sendError(res, makeError("bad_content_type", 415));
    return;
  }

  let payload;

  try {
    const body = await readRequestBody(req);
    payload = JSON.parse(body || "{}");
  } catch (error) {
    sendError(res, error?.code ? error : makeError("bad_json", 400));
    return;
  }

  const validation = validateTransformPayload(payload);
  if (validation.error) {
    sendError(res, validation.error);
    return;
  }

  const apiUrlError = validateApiBaseUrl(validation.value.apiBaseUrl);
  if (apiUrlError) {
    sendError(res, apiUrlError);
    return;
  }

  try {
    const result = await callChatCompletion(validation.value);
    sendJson(res, 200, result);
  } catch (error) {
    sendError(res, error);
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && requestUrl.pathname === "/api/transform") {
    handleTransform(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }

  sendError(res, makeError("method_not_allowed", 405));
});

server.listen(PORT, HOST, () => {
  console.log(`Arknights style converter running at http://${HOST}:${PORT}`);
});
