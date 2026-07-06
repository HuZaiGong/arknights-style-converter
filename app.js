const form = document.querySelector("#converterForm");
const inputText = document.querySelector("#inputText");
const personaSelect = document.querySelector("#personaSelect");
const intensityRange = document.querySelector("#intensityRange");
const intensityValue = document.querySelector("#intensityValue");
const submitButton = document.querySelector("#submitButton");
const resultBox = document.querySelector("#resultBox");
const errorLine = document.querySelector("#errorLine");
const charCount = document.querySelector("#charCount");
const copyButton = document.querySelector("#copyButton");
const sampleButton = document.querySelector("#sampleButton");

const API_BASE_URL = "https://kenari.id/v1";
const API_KEY = "kn-1f8111f1f7d17bd76aae6bae01a90fc4188ff278b2ac4190";
const MODEL = "deepseek-v4-flash:free";
const MAX_OUTPUT_TOKENS = 2400;

const personas = {
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

const sampleText = "今天的事情很多，但我会尽力处理完。请大家先保持冷静，等我把重要事项排好顺序。";
let currentResult = "";

function buildPrompt({ text, personaKey, intensity }) {
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

function extractChoiceText(data) {
  const choice = data.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => typeof part === "string" ? part : part?.text || "")
      .join("")
      .trim();
  }
  if (typeof choice?.text === "string") return choice.text.trim();
  if (typeof data.output_text === "string") return data.output_text.trim();

  return "";
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
  submitButton.querySelector("span").textContent = isBusy ? "转换中" : "执行转换";
  submitButton.querySelector("small").textContent = isBusy ? "SYNC" : "DEPLOY";
}

function setResult(text) {
  currentResult = text;
  copyButton.disabled = !text;
  resultBox.innerHTML = "";

  if (!text) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "等待输入。终端将返回重构后的通信文本。";
    resultBox.append(placeholder);
    return;
  }

  const output = document.createElement("p");
  output.textContent = text;
  resultBox.append(output);
}

function setError(message) {
  errorLine.textContent = message || "";
}

function updateInputStats() {
  charCount.textContent = `${inputText.value.length} / 4000`;
}

async function transformText(event) {
  event.preventDefault();

  const text = inputText.value.trim();
  if (!text) {
    setError("请输入需要转换的内容。");
    inputText.focus();
    return;
  }

  setBusy(true);
  setError("");
  setResult("正在接入罗德岛通信节点，请稍候...");

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: buildPrompt({ text, personaKey: personaSelect.value, intensity: intensityRange.value }),
        temperature: 0.82,
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: false
      })
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      data = { raw: responseText };
    }

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || responseText || "转换失败。");
    }

    const result = extractChoiceText(data);
    if (!result) {
      throw new Error("API 没有返回可用文本。");
    }

    setResult(result);
  } catch (error) {
    setResult("");
    setError(error.message || "转换失败，请检查 API 配置或浏览器跨域限制。");
  } finally {
    setBusy(false);
  }
}

async function copyResult() {
  if (!currentResult) return;

  try {
    await navigator.clipboard.writeText(currentResult);
    copyButton.textContent = "已复制";
    window.setTimeout(() => {
      copyButton.textContent = "复制";
    }, 1200);
  } catch (error) {
    setError("复制失败，请手动选中结果文本。");
  }
}

form.addEventListener("submit", transformText);
inputText.addEventListener("input", updateInputStats);
intensityRange.addEventListener("input", () => {
  intensityValue.textContent = intensityRange.value;
});
copyButton.addEventListener("click", copyResult);
sampleButton.addEventListener("click", () => {
  inputText.value = sampleText;
  updateInputStats();
  setError("");
  inputText.focus();
});

updateInputStats();
