export const appDefaults = {
  apiBaseUrl: "https://kenari.id/v1",
  apiKey: "kn-1f8111f1f7d17bd76aae6bae01a90fc4188ff278b2ac4190",
  model: "deepseek-v4-flash:free",
  temperature: 0.82,
  maxInputLength: 4000,
  maxOutputTokens: 2400,
  requestTimeoutMs: 45000,
  maxBodyBytes: 64 * 1024,
  workerEndpoint: "https://arknights-style-converter-api.1421201386.workers.dev/api/transform",
  allowedOrigins: [
    "https://huzaigong.github.io",
    "http://127.0.0.1:4173",
    "http://localhost:4173"
  ],
  allowedApiHosts: ["kenari.id"]
};

export const personas = {
  terminal: {
    name: "罗德岛终端",
    instruction:
      "像罗德岛作战终端的系统通报一样表达：冷静、克制、信息密度高，带有战术任务、医疗企业和灾害现场的语感。"
  },
  amiya: {
    name: "阿米娅式",
    instruction:
      "语气温和、坚定、带有责任感和同理心；措辞像年轻指挥者在压力下仍努力保持清晰。"
  },
  kaltsit: {
    name: "凯尔希式",
    instruction:
      "语气理性、冷淡、略带审判感；句子更长，带有医学、历史、风险评估和因果推断的表达。"
  },
  w: {
    name: "W式",
    instruction:
      "语气轻佻、挑衅、危险但不粗俗；像在爆炸前留下玩笑，保留一点漫不经心的威胁感。"
  },
  silverash: {
    name: "银灰式",
    instruction:
      "语气沉稳、贵族式、战略家口吻；强调筹码、局势、盟约和长期利益，措辞礼貌但有压迫感。"
  },
  exusiai: {
    name: "能天使式",
    instruction:
      "语气轻快、直率、有行动力；保留乐观节奏，但仍套入罗德岛任务与城市危机的语境。"
  }
};

export const errorMessages = {
  bad_json: "请求数据无法解析。",
  bad_content_type: "请求格式不正确，请使用 JSON。",
  body_too_large: "请求内容过大，请缩短输入后再试。",
  empty_input: "请输入需要转换的内容。",
  input_too_long: "输入过长，请缩短后再试。",
  bad_api_url: "API URL 无效，请检查设置菜单中的地址。",
  api_host_not_allowed: "该 API URL 未被当前 Worker 允许。",
  origin_not_allowed: "当前页面来源未被 Worker 允许。",
  upstream_auth: "上游 API 拒绝请求，请检查 API Key、余额或模型权限。",
  upstream_timeout: "上游 API 响应超时，请稍后再试。",
  upstream_empty: "模型没有返回可用文本，请稍后重试或更换模型。",
  upstream_error: "上游 API 请求失败，请检查 API 配置。",
  network_error: "无法连接转换服务，请检查网络或 Worker 状态。",
  not_found: "请求路径不存在。",
  method_not_allowed: "请求方法不被支持。"
};

export function buildPrompt({ text, personaKey, intensity }) {
  const persona = personas[personaKey] || personas.terminal;
  const normalizedIntensity = Math.min(100, Math.max(0, Number(intensity) || 65));
  const intensityGuide =
    normalizedIntensity < 35
      ? "轻度改写：保留原意和日常可读性，只加入少量战术工业与罗德岛终端质感。"
      : normalizedIntensity < 75
        ? "中度改写：明显提升明日方舟式冷峻叙事、任务口吻和末世城市氛围，但不要让句子难懂。"
        : "高度改写：强化档案、作战简报、危机通告、角色语气和压迫感，可适度重组句子。";

  return [
    {
      role: "system",
      content: [
        "你是一个中文文本风格转换器。",
        "目标：把用户输入改写成受《明日方舟》启发的表达风格。",
        "风格关键词：罗德岛、作战记录、终端通报、矿石病、灾害预警、移动城市、冷峻工业、克制情绪、战术报告。",
        "要求：只输出改写后的文本，不解释过程，不添加标题，不引用或复刻原作台词，不声称文本来自官方。",
        "保持用户原意；不要加入用户没有表达的实质事实；如果原文是问题，改写后仍保持问题意图。",
        `当前预设：${persona.name}。${persona.instruction}`,
        intensityGuide
      ].join("\n")
    },
    {
      role: "user",
      content: `请改写这段话：\n${text}`
    }
  ];
}

export function extractChoiceText(data) {
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => typeof part === "string" ? part : part?.text || "")
      .join("")
      .trim();
  }
  if (typeof choice?.text === "string") return choice.text.trim();
  if (typeof data?.output_text === "string") return data.output_text.trim();

  return "";
}

export function makeError(code, status = 400, details = undefined) {
  return {
    ok: false,
    code,
    status,
    message: errorMessages[code] || errorMessages.upstream_error,
    details
  };
}

export function normalizeClientConfig(payload = {}) {
  const apiBaseUrl = String(payload.apiBaseUrl || appDefaults.apiBaseUrl).trim().replace(/\/+$/, "");
  const apiKey = String(payload.apiKey || appDefaults.apiKey).trim();
  const model = String(payload.model || appDefaults.model).trim();

  return { apiBaseUrl, apiKey, model };
}

export function validateApiBaseUrl(apiBaseUrl, { restrictHosts = false } = {}) {
  let url;

  try {
    url = new URL(apiBaseUrl);
  } catch (error) {
    return makeError("bad_api_url", 400);
  }

  if (!["https:", "http:"].includes(url.protocol) || !url.hostname) {
    return makeError("bad_api_url", 400);
  }

  if (restrictHosts) {
    if (url.protocol !== "https:") {
      return makeError("bad_api_url", 400);
    }
    if (!appDefaults.allowedApiHosts.includes(url.hostname)) {
      return makeError("api_host_not_allowed", 403);
    }
  }

  return null;
}

export function validateTransformPayload(payload = {}) {
  const text = String(payload.text || "").trim();
  const personaKey = String(payload.persona || "terminal");
  const intensity = Number(payload.intensity ?? 65);

  if (!text) return { error: makeError("empty_input", 400) };
  if (text.length > appDefaults.maxInputLength) {
    return { error: makeError("input_too_long", 400, { maxInputLength: appDefaults.maxInputLength }) };
  }

  return {
    value: {
      text,
      personaKey,
      intensity,
      ...normalizeClientConfig(payload)
    }
  };
}

export function classifyUpstreamError(status, data) {
  const rawMessage = String(data?.error?.message || data?.message || data?.raw || "").toLowerCase();

  if ([401, 403].includes(status) || rawMessage.includes("key") || rawMessage.includes("auth") || rawMessage.includes("balance") || rawMessage.includes("price")) {
    return makeError("upstream_auth", 502);
  }

  return makeError("upstream_error", 502);
}

export function publicAppConfig() {
  return {
    defaultApiBaseUrl: appDefaults.apiBaseUrl,
    defaultApiKey: appDefaults.apiKey,
    defaultModel: appDefaults.model,
    workerEndpoint: appDefaults.workerEndpoint,
    maxInputLength: appDefaults.maxInputLength
  };
}
