import { api } from "/js/common.js";

const MAX_HISTORY = 20;

function loadHistoryFor(key) {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryFor(key, history) {
  try { sessionStorage.setItem(key, JSON.stringify(history)); } catch { /* ignore */ }
}

export function initChatWidget({
  formId,
  inputId,
  sendBtnId,
  messagesId,
  clearBtnId,
  historyKey
}) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const sendBtn = document.getElementById(sendBtnId);
  const messagesEl = document.getElementById(messagesId);
  const clearBtn = document.getElementById(clearBtnId);

  if (!form || !input || !messagesEl) return;

  let history = loadHistoryFor(historyKey);

  function renderAll() {
    messagesEl.innerHTML = "";
    if (history.length === 0) {
      const hint = document.createElement("div");
      hint.className = "chatMsg model";
      hint.textContent = "Hi! Ask me anything.";
      messagesEl.appendChild(hint);
      return;
    }
    for (const msg of history) addMessageEl(msg.role, msg.text);
  }

  function addMessageEl(role, text, extraClass) {
    const div = document.createElement("div");
    div.className = "chatMsg " + role + (extraClass ? " " + extraClass : "");
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  async function send(message) {
    const trimmed = message.trim();
    if (!trimmed) return;

    input.value = "";
    sendBtn.disabled = true;
    input.disabled = true;

    addMessageEl("user", trimmed);

    const thinking = addMessageEl("model", "Thinking...", "typing");

    const historyForApi = history.slice(-MAX_HISTORY);

    try {
      const data = await api("/api/chat", "POST", {
        message: trimmed,
        history: historyForApi
      });

      thinking.remove();

      const reply = String(data?.reply || "").trim() || "(no response)";
      addMessageEl("model", reply);

      history.push({ role: "user", text: trimmed });
      history.push({ role: "model", text: reply });
      if (history.length > MAX_HISTORY * 2) {
        history = history.slice(-MAX_HISTORY * 2);
      }
      saveHistoryFor(historyKey, history);
    } catch (e) {
      thinking.remove();
      addMessageEl("model", e?.message || "Chat failed.", "error");
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener("submit", (evt) => {
    evt.preventDefault();
    send(input.value);
  });

  clearBtn?.addEventListener("click", () => {
    history = [];
    saveHistoryFor(historyKey, history);
    renderAll();
    input.focus();
  });

  renderAll();
}

export function initChat() {
  initChatWidget({
    formId: "chatForm",
    inputId: "chatInput",
    sendBtnId: "chatSendBtn",
    messagesId: "chatMessages",
    clearBtnId: "chatClearBtn",
    historyKey: "chatHistory_qr"
  });

  initChatWidget({
    formId: "workspaceChatForm",
    inputId: "workspaceChatInput",
    sendBtnId: "workspaceChatSendBtn",
    messagesId: "workspaceChatMessages",
    clearBtnId: "workspaceChatClearBtn",
    historyKey: "chatHistory_workspace"
  });
}
