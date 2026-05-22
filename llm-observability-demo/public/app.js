const state = {
  conversations: [],
  selectedConversationId: null,
  summary: null,
};

const el = {
  list: document.getElementById("conversationList"),
  thread: document.getElementById("thread"),
  title: document.getElementById("conversationTitle"),
  meta: document.getElementById("conversationMeta"),
  status: document.getElementById("conversationStatus"),
  input: document.getElementById("chatInput"),
  form: document.getElementById("chatForm"),
  sendButton: document.getElementById("sendButton"),
  refresh: document.getElementById("refreshConversations"),
  newConversation: document.getElementById("newConversation"),
  cancelConversation: document.getElementById("cancelConversation"),
  resumeConversation: document.getElementById("resumeConversation"),
  metricConversations: document.getElementById("metricConversations"),
  metricLogs: document.getElementById("metricLogs"),
  metricLatency: document.getElementById("metricLatency"),
  metricErrors: document.getElementById("metricErrors"),
  metricTokens: document.getElementById("metricTokens"),
};

function fmtDate(value) {
  if (!value) {
    return "just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function setLoading(loading) {
  document.body.classList.toggle("loading", loading);
  el.sendButton.disabled = loading;
  el.refresh.disabled = loading;
  el.newConversation.disabled = loading;
  el.cancelConversation.disabled = loading;
  el.resumeConversation.disabled = loading;
}

function renderMetrics(summary) {
  el.metricConversations.textContent = summary?.conversations ?? 0;
  el.metricLogs.textContent = summary?.logs ?? 0;
  el.metricLatency.textContent = `${summary?.avgLatencyMs ?? 0}ms`;
  el.metricErrors.textContent = summary?.errors ?? 0;
  el.metricTokens.textContent = summary?.totalTokens ?? 0;
}

function renderConversations() {
  el.list.innerHTML = "";

  if (state.conversations.length === 0) {
    el.list.innerHTML = `<div class="conversation-card"><div class="title">No conversations yet</div><div class="sub">Create one to start logging inference metadata.</div></div>`;
    return;
  }

  for (const conversation of state.conversations) {
    const button = document.createElement("button");
    button.className = `conversation-card ${conversation.id === state.selectedConversationId ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <div class="title">${escapeHtml(conversation.title)}</div>
      <div class="sub">${escapeHtml(conversation.provider)} · ${escapeHtml(conversation.model)}</div>
      <div class="sub">${conversation.messageCount} messages · ${fmtDate(conversation.lastMessageAt)}</div>
    `;
    button.addEventListener("click", () => selectConversation(conversation.id));
    el.list.appendChild(button);
  }
}

function renderConversation(conversation) {
  if (!conversation) {
    el.title.textContent = "Select a conversation";
    el.meta.textContent = "Short context, near-real-time ingestion, and simple storage.";
    el.status.textContent = "No conversation selected";
    el.status.className = "status-pill";
    el.thread.innerHTML = `<div class="message system">Create or select a conversation to start.</div>`;
    return;
  }

  el.title.textContent = conversation.title;
  el.meta.textContent = `${conversation.provider} · ${conversation.model} · ${conversation.messageCount} message(s)`;
  el.status.textContent = conversation.status;
  el.status.className = `status-pill ${conversation.status}`;
  el.thread.innerHTML = conversation.messages
    .map((message) => {
      const roleClass = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : "system";
      return `
        <div class="message ${roleClass}">
          <div>${escapeHtml(message.content)}</div>
          <span class="meta">${message.role} · ${fmtDate(message.createdAt)}</span>
        </div>
      `;
    })
    .join("");
  el.thread.scrollTop = el.thread.scrollHeight;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadSummary() {
  const response = await fetch("/api/summary");
  const summary = await response.json();
  state.summary = summary;
  renderMetrics(summary);
}

async function loadConversations(preferredId) {
  const response = await fetch("/api/conversations");
  state.conversations = await response.json();
  renderConversations();

  const selected = state.conversations.find((conversation) => conversation.id === (preferredId ?? state.selectedConversationId)) ?? state.conversations[0];
  if (selected) {
    await selectConversation(selected.id, false);
  } else {
    renderConversation(null);
  }
}

async function selectConversation(id, refresh = true) {
  state.selectedConversationId = id;
  renderConversations();

  const response = await fetch(`/api/conversations/${id}`);
  if (!response.ok) {
    renderConversation(null);
    return;
  }

  const conversation = await response.json();
  renderConversation(conversation);

  if (refresh) {
    await loadSummary();
  }
}

async function createConversation() {
  setLoading(true);
  try {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New telemetry session" }),
    });

    const conversation = await response.json();
    if (!response.ok) {
      throw new Error(conversation?.error ?? "Unable to create conversation");
    }

    await loadConversations(conversation.id);
    el.input.focus();
  } catch (error) {
    alert(error instanceof Error ? error.message : "Unable to create conversation");
  } finally {
    setLoading(false);
  }
}

async function sendMessage(content) {
  if (!state.selectedConversationId) {
    await createConversation();
  }

  const conversationId = state.selectedConversationId;
  if (!conversationId) {
    return;
  }

  setLoading(true);
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error ?? "Message send failed");
    }

    el.input.value = "";
    await selectConversation(conversationId);
    await loadConversations(conversationId);
  } catch (error) {
    alert(error instanceof Error ? error.message : "Message send failed");
  } finally {
    setLoading(false);
  }
}

async function setConversationStatus(action) {
  if (!state.selectedConversationId) {
    return;
  }

  setLoading(true);
  try {
    const response = await fetch(`/api/conversations/${state.selectedConversationId}/${action}`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error ?? `Unable to ${action} conversation`);
    }

    await loadConversations(state.selectedConversationId);
  } catch (error) {
    alert(error instanceof Error ? error.message : `Unable to ${action} conversation`);
  } finally {
    setLoading(false);
  }
}

el.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = el.input.value.trim();
  if (!content) {
    return;
  }

  await sendMessage(content);
});

el.refresh.addEventListener("click", async () => {
  setLoading(true);
  try {
    await loadConversations();
    await loadSummary();
  } finally {
    setLoading(false);
  }
});

el.newConversation.addEventListener("click", createConversation);
el.cancelConversation.addEventListener("click", () => setConversationStatus("cancel"));
el.resumeConversation.addEventListener("click", () => setConversationStatus("resume"));

(async function init() {
  await loadSummary();
  await loadConversations();
})();
