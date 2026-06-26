import { micromark } from "https://esm.sh/micromark@4";

let userId = localStorage.getItem("userid");
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("userid", userId);
}

const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const receptPanel = document.getElementById("recept-panel");
const boodschappenPanel = document.getElementById("boodschappen-panel");
const tokenInfo = document.getElementById("token-info");
const micBtn = document.getElementById("mic-btn");

const recognition = new webkitSpeechRecognition();
recognition.lang = "nl-NL";
recognition.interimResults = false;

// webspeech api
micBtn.addEventListener("click", () => {
  micBtn.classList.add("btn-active");
  recognition.start();
});

recognition.addEventListener("result", (e) => {
  userInput.value = e.results[0][0].transcript;
});

recognition.addEventListener("end", () => {
  micBtn.classList.remove("btn-active");
});

// Laad geschiedenis bij het starten
const data = await fetch("./api/gethistory", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId }),
});
const history = await data.json();
for (const msg of history) {
  if (msg.role === "user") appendMessage("user", msg.content);
  if (msg.role === "assistant") appendMessage("ai", JSON.parse(msg.content).message);
}

// laad recept en boodschappenlijst bij het starten
const lastAssistant = history.filter(m => m.role === "assistant").at(-1);
if (lastAssistant) {
  const parsed = JSON.parse(lastAssistant.content);
  if (parsed.recept?.naam) updateReceptPanel(parsed.recept);
  if (parsed.boodschappenlijst?.length > 0) updateBoodschappenPanel(parsed.boodschappenlijst);
}

sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleSend();
  }
});

function handleSend() {
  const message = userInput.value.trim();
  if (!message) return;
  userInput.value = "";
  sendMessage(message);
}

async function sendMessage(message) {
  appendMessage("user", message);

  sendBtn.disabled = true;
  sendBtn.textContent = "...";

  const loadingIndicator = appendLoadingBubble();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message }),
    });

    const data = await response.json();

    loadingIndicator.remove();
    appendMessage("ai", data.message, data.tokens?.total_tokens);

    if (data.recept && data.recept.naam) {
      updateReceptPanel(data.recept);
    }

    if (data.boodschappenlijst && data.boodschappenlijst.length > 0) {
      updateBoodschappenPanel(data.boodschappenlijst);
    }
  } catch (error) {
    loadingIndicator.remove();
    appendMessage("ai", "Er ging iets mis. Probeer het opnieuw.");
    console.error(error);
  }

  sendBtn.disabled = false;
  sendBtn.textContent = "Stuur";
}

function appendMessage(role, text, tokens) {
  const isUser = role === "user";
  const wrapper = document.createElement("div");
  wrapper.className = `chat ${isUser ? "chat-end" : "chat-start"}`;

  const avatar = document.createElement("div");
  avatar.className = "chat-image avatar placeholder";
  avatar.innerHTML = `<div class="w-8 rounded-full ${isUser ? "bg-primary" : "bg-base-200"} flex items-center justify-center text-sm">${isUser ? "🧑" : "🤖"}</div>`;

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isUser ? "chat-bubble-primary" : "bg-base-200 text-base-content"} max-w-sm`;

  if (isUser) {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = micromark(text);
    bubble.querySelectorAll("p").forEach(p => p.classList.add("mb-1"));
    bubble.querySelectorAll("ul,ol").forEach(l => l.classList.add("list-disc", "pl-4", "mb-1"));
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);

  if (!isUser && tokens != null) {
    const footer = document.createElement("div");
    footer.className = "chat-footer text-xs text-base-content/40 mt-0.5";
    footer.textContent = `${tokens} tokens`;
    wrapper.appendChild(footer);
  }

  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return wrapper;
}

function appendLoadingBubble() {
  const wrapper = document.createElement("div");
  wrapper.className = "chat chat-start";
  wrapper.innerHTML = `
    <div class="chat-image avatar placeholder">
      <div class="w-8 rounded-full bg-base-200 flex items-center justify-center text-sm">🤖</div>
    </div>
    <div class="chat-bubble bg-base-200 text-base-content">
      <span class="loading loading-dots loading-sm"></span>
    </div>`;
  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return wrapper;
}

function updateReceptPanel(recept) {
  receptPanel.innerHTML = `
    <h3 class="font-bold text-lg mb-2">${recept.naam}</h3>
    <div class="flex gap-3 text-sm text-base-content/70 mb-3">
      <span class="badge badge-outline">👥 ${recept.personen} pers.</span>
      <span class="badge badge-outline">⏱️ ${recept.bereidingstijd}</span>
    </div>
    <ol class="steps steps-vertical gap-0">
      ${recept.stappen.map((stap) => `
        <li class="step step-primary text-sm text-left">
          <span class="ml-2">${stap}</span>
        </li>`).join("")}
    </ol>`;
}

function updateBoodschappenPanel(boodschappenlijst) {
  boodschappenPanel.innerHTML = `
    <ul class="space-y-1">
      ${boodschappenlijst.map(item => `
        <li class="flex items-center gap-2 text-sm py-1 border-b border-base-200 last:border-0">
          <input type="checkbox" class="checkbox checkbox-sm checkbox-primary" />
          <span>${item}</span>
        </li>`).join("")}
    </ul>`;
}
