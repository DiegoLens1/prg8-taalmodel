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
  recognition.start();
});

recognition.addEventListener("result", (e) => {
  userInput.value = e.results[0][0].transcript;
});

recognition.addEventListener("end", () => {
});

// Laad geschiedenis bij het starten
const data = await fetch("./api/gethistory", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId }),
});
const history = await data.json();
console.log(history);
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

  const loadingIndicator = appendMessage("ai", "Even nadenken...");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message }),
    });

    const data = await response.json();

    loadingIndicator.remove();
    const bubble = appendMessage("ai", data.message);
    if (data.tokens) {
      const tokenSmall = document.createElement("small");
      tokenSmall.textContent = `${data.tokens.total_tokens} tokens`;
      bubble.appendChild(tokenSmall);
    }

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

// Voeg een chatbericht toe
function appendMessage(role, text) {
  const bubble = document.createElement("div");
  if (role === "ai") {
    bubble.innerHTML = micromark("AI: " + text);
  } else {
    bubble.textContent = "Jij: " + text;
  }
  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return bubble;
}

// Update recept
function updateReceptPanel(recept) {
  receptPanel.innerHTML = `
    <p class="">${recept.naam}</p>
    <div class="">
      <span>👥 ${recept.personen} personen</span>
      <span>⏱️ ${recept.bereidingstijd}</span>
    </div>
    <ol class="">
      ${recept.stappen.map((stap) => `<li>${stap}</li>`).join("")}
    </ol>
  `;
}

// Update boodschappenlijst
function updateBoodschappenPanel(boodschappenlijst) {
  boodschappenPanel.innerHTML = `<ul>${boodschappenlijst.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}
