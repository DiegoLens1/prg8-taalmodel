import express from "express";
import { callAssistant, getUserChat } from "./chat.js";

const app = express();
app.use(express.json());

app.use(express.static("public"));

//frontend
app.get("/", (req, res) => {
  res.sendFile("public/index.html", { root: "." });
});

// Geschiedenis ophalen voor user
app.post("/api/gethistory", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is verplicht" });
  const history = getUserChat(userId).filter((m) => m.role !== "system");
  res.json(history);
});

// chat voor ai
app.post("/api/chat", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "userId en message zijn verplicht" });
  }

  try {
    const response = await callAssistant(userId, message);
    res.json(response);
  } catch (error) {
    console.error("Fout bij AI aanroep:", error);
    res.status(500).json({ error: "Er ging iets mis met de AI" });
  }
});

app.listen(3000, () => console.log("Mise en Place draait op http://localhost:3000"));
