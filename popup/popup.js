const noKeySection = document.getElementById("no-key");
const hasKeySection = document.getElementById("has-key");
const apiKeyInput = document.getElementById("api-key-input");
const saveBtn = document.getElementById("save-btn");
const deleteBtn = document.getElementById("delete-btn");
const maskedKeyEl = document.getElementById("masked-key");

function maskKey(key) {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function showNoKey() {
  noKeySection.style.display = "block";
  hasKeySection.style.display = "none";
  apiKeyInput.value = "";
}

function showHasKey(key) {
  noKeySection.style.display = "none";
  hasKeySection.style.display = "block";
  maskedKeyEl.textContent = maskKey(key);
}

chrome.storage.sync.get("openai_api_key", (data) => {
  if (data.openai_api_key) {
    showHasKey(data.openai_api_key);
  } else {
    showNoKey();
  }
});

saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;

  chrome.storage.sync.set({ openai_api_key: key }, () => {
    showHasKey(key);
  });
});

deleteBtn.addEventListener("click", () => {
  chrome.storage.sync.remove("openai_api_key", () => {
    showNoKey();
  });
});

// 트리거 모드 토글
const toggleBtns = document.querySelectorAll(".toggle-btn");

chrome.storage.sync.get("trigger_mode", (data) => {
  const mode = data.trigger_mode || "auto";
  toggleBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
});

toggleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    toggleBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    chrome.storage.sync.set({ trigger_mode: btn.dataset.mode });
  });
});
