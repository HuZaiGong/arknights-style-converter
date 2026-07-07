import { appDefaults, errorMessages, publicAppConfig } from "./config.js";

const form = document.querySelector("#converterForm");
const inputText = document.querySelector("#inputText");
const personaSelect = document.querySelector("#personaSelect");
const personaSearchInput = document.querySelector("#personaSearchInput");
const personaFilterButtons = Array.from(document.querySelectorAll(".persona-filter"));
const personaCurrent = document.querySelector("#personaCurrent");
const personaResults = document.querySelector("#personaResults");
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
let selectedPersonaId = "terminal";
let personaSearchQuery = "";
let personaCategoryFilter = "all";
let currentResult = "";

function personaMeta(persona) {
  const meta = [];
  if (persona.faction) meta.push(persona.faction);
  if (persona.class) meta.push(persona.class);
  if (persona.rarity) meta.push(`${persona.rarity}★`);
  return meta.join(" · ");
}

function personaSearchText(persona) {
  return [
    persona.name,
    persona.group,
    persona.faction,
    persona.class,
    persona.archetype,
    ...(persona.tags || [])
  ].filter(Boolean).join(" ").toLowerCase();
}

function filteredPersonas() {
  const query = personaSearchQuery.trim().toLowerCase();

  return config.personas.filter(persona => {
    const isOperator = persona.group === "干员风格";
    if (personaCategoryFilter === "base" && isOperator) return false;
    if (personaCategoryFilter === "operator" && !isOperator) return false;
    if (!query) return true;
    return personaSearchText(persona).includes(query);
  });
}

function syncPersonaSelect() {
  personaSelect.innerHTML = "";
  for (const persona of config.personas) {
    const option = document.createElement("option");
    option.value = persona.id;
    option.textContent = persona.name;
    personaSelect.append(option);
  }
  personaSelect.value = selectedPersonaId;
}

function selectPersona(personaId) {
  const persona = config.personas.find(item => item.id === personaId) || config.personas[0];
  selectedPersonaId = persona.id;
  personaSelect.value = persona.id;
  personaCurrent.textContent = persona.group === "干员风格" && persona.faction
    ? `${persona.name} / ${personaMeta(persona)}`
    : persona.name;
  renderPersonaResults();
}

function renderPersonaResults() {
  const results = filteredPersonas();
  personaResults.innerHTML = "";

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "persona-empty";
    empty.textContent = "未找到匹配的语气预设";
    personaResults.append(empty);
    return;
  }

  for (const persona of results) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `persona-result${persona.id === selectedPersonaId ? " is-selected" : ""}`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(persona.id === selectedPersonaId));
    item.dataset.personaId = persona.id;

    const title = document.createElement("strong");
    title.textContent = persona.name;
    item.append(title);

    const meta = document.createElement("span");
    meta.textContent = persona.group === "干员风格"
      ? [personaMeta(persona), ...(persona.tags || []).slice(0, 3)].filter(Boolean).join(" · ")
      : persona.group;
    item.append(meta);

    item.addEventListener("click", () => selectPersona(persona.id));
    personaResults.append(item);
  }
}

function renderPersonaOptions() {
  syncPersonaSelect();
  selectPersona(selectedPersonaId);
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
        persona: selectedPersonaId,
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
personaSearchInput.addEventListener("input", () => {
  personaSearchQuery = personaSearchInput.value;
  renderPersonaResults();
});
personaFilterButtons.forEach(button => {
  button.addEventListener("click", () => {
    personaCategoryFilter = button.dataset.filter || "all";
    personaFilterButtons.forEach(item => item.classList.toggle("is-active", item === button));
    renderPersonaResults();
  });
});
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
