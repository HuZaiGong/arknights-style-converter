import { appDefaults, errorMessages, publicAppConfig } from "./config.js";

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
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsForm = document.querySelector("#settingsForm");
const apiUrlInput = document.querySelector("#apiUrlInput");
const apiKeyInput = document.querySelector("#apiKeyInput");
const modelInput = document.querySelector("#modelInput");
const resetSettingsButton = document.querySelector("#resetSettingsButton");
const settingsStatus = document.querySelector("#settingsStatus");

const config = publicAppConfig();
const LOCAL_ENDPOINT = "/api/transform";
const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const isGitHubPages = window.location.hostname.endsWith("github.io");
const TRANSFORM_ENDPOINT = isGitHubPages
  ? config.workerEndpoint
  : (isLocalhost ? LOCAL_ENDPOINT : config.vercelEndpoint);
const SETTINGS_KEY = "arknights-style-converter-settings";
const sampleText = "今天的事情很多，但我会尽力处理完。请大家先保持冷静，等我把重要事项排好顺序。";
let currentResult = "";

function renderPersonaOptions() {
  personaSelect.innerHTML = "";
  const groups = new Map();

  for (const persona of config.personas) {
    const groupName = persona.group || "通用预设";
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(persona);
  }

  for (const [groupName, items] of groups) {
    const optionGroup = document.createElement("optgroup");
    optionGroup.label = groupName;

    for (const persona of items) {
      const option = document.createElement("option");
      option.value = persona.id;
      option.textContent = persona.group === "干员风格" && persona.faction
        ? `${persona.name} / ${persona.faction}`
        : persona.name;
      optionGroup.append(option);
    }

    personaSelect.append(optionGroup);
  }
}

function defaultSettings() {
  return {
    apiBaseUrl: config.defaultApiBaseUrl,
    apiKey: config.defaultApiKey,
    model: config.defaultModel
  };
}

function loadSettings() {
  try {
    return { ...defaultSettings(), ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch (error) {
    return defaultSettings();
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function fillSettingsForm(settings = loadSettings()) {
  apiUrlInput.value = settings.apiBaseUrl;
  apiKeyInput.value = settings.apiKey;
  modelInput.value = settings.model;
}

function readSettingsForm() {
  return {
    apiBaseUrl: apiUrlInput.value.trim() || appDefaults.apiBaseUrl,
    apiKey: apiKeyInput.value.trim() || appDefaults.apiKey,
    model: modelInput.value.trim() || appDefaults.model
  };
}

function setSettingsStatus(message) {
  settingsStatus.textContent = message || "";
}

function toggleSettings(forceOpen) {
  const isOpen = typeof forceOpen === "boolean" ? forceOpen : settingsPanel.hidden;
  settingsPanel.hidden = !isOpen;
  settingsButton.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    apiUrlInput.focus();
  }
}

function userMessageFromError(data, fallback) {
  if (data?.message) return data.message;
  if (data?.code && errorMessages[data.code]) return errorMessages[data.code];
  if (data?.error?.message) return data.error.message;
  if (typeof data?.error === "string") return data.error;
  return fallback || errorMessages.network_error;
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
  charCount.textContent = `${inputText.value.length} / ${config.maxInputLength}`;
}

async function transformText(event) {
  event.preventDefault();

  const text = inputText.value.trim();
  if (!text) {
    setError(errorMessages.empty_input);
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
        intensity: intensityRange.value,
        ...loadSettings()
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
      throw new Error(userMessageFromError(data, errorMessages.upstream_error));
    }

    if (!data.result) {
      throw new Error(errorMessages.upstream_empty);
    }

    setResult(data.result);
  } catch (error) {
    setResult("");
    setError(error.message || errorMessages.network_error);
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
settingsButton.addEventListener("click", () => toggleSettings());
settingsForm.addEventListener("submit", event => {
  event.preventDefault();
  saveSettings(readSettingsForm());
  setSettingsStatus("配置已保存");
  window.setTimeout(() => setSettingsStatus(""), 1600);
});
resetSettingsButton.addEventListener("click", () => {
  const settings = defaultSettings();
  saveSettings(settings);
  fillSettingsForm(settings);
  setSettingsStatus("已恢复默认配置");
  window.setTimeout(() => setSettingsStatus(""), 1600);
});
document.addEventListener("click", event => {
  if (settingsPanel.hidden) return;
  if (settingsPanel.contains(event.target) || settingsButton.contains(event.target)) return;
  toggleSettings(false);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    toggleSettings(false);
  }
});

renderPersonaOptions();
fillSettingsForm();
updateInputStats();
