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

const TRANSFORM_ENDPOINT = "https://arknights-style-converter-api.1421201386.workers.dev/api/transform";
const sampleText = "今天的事情很多，但我会尽力处理完。请大家先保持冷静，等我把重要事项排好顺序。";
let currentResult = "";

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
    const response = await fetch(TRANSFORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        persona: personaSelect.value,
        intensity: intensityRange.value
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
      throw new Error(data.error || data.message || responseText || "转换失败。");
    }

    if (!data.result) {
      throw new Error("API 没有返回可用文本。");
    }

    setResult(data.result);
  } catch (error) {
    setResult("");
    setError(error.message || "转换失败，请检查 Worker 代理配置。");
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
