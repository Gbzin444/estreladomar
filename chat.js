import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getDatabase, ref, push, onChildAdded, remove, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { 
  getStorage, ref as sRef, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// 🔧 CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBbCOS02NPFgFKK8X6tIG-4gwFCZ2WgyZY",
  authDomain: "sneth-chat-51c06.firebaseapp.com",
  databaseURL: "https://sneth-chat-51c06-default-rtdb.firebaseio.com",
  projectId: "sneth-chat-51c06",
  storageBucket: "sneth-chat-51c06.appspot.com",
  messagingSenderId: "245152719854",
  appId: "1:245152719854:web:a5867e51fa8ff7609be4ff",
  measurementId: "G-KT5R9DG6Z5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
const chatRef = ref(db, "chat");

// 📥 EXIBIR MENSAGENS
const messagesDiv = document.getElementById("messages");
onChildAdded(chatRef, (snapshot) => {
  const data = snapshot.val();
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(data.sender === localStorage.getItem("username") ? "mine" : "other");
  div.innerHTML = `
    <span class="sender">${data.sender}</span>: ${data.text || ""}
    ${data.fileURL ? `<br><a href="${data.fileURL}" target="_blank"><img src="${data.fileURL}" class="chat-image"></a>` : ""}
    ${data.sender === localStorage.getItem("username") ? `<button class="delete-btn" data-id="${snapshot.key}">Excluir</button>` : ""}
  `;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// 🗑️ DELETAR MENSAGEM
messagesDiv.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const key = e.target.getAttribute("data-id");
    remove(ref(db, `chat/${key}`));
    e.target.parentElement.remove();
  }
});

// ✉️ ENVIAR MENSAGEM
const sendBtn = document.getElementById("sendBtn");
const msgInput = document.getElementById("msgInput");
const nameInput = document.getElementById("nameInput");
const fileBtn = document.getElementById("fileBtn");
const fileInput = document.getElementById("fileInput");

sendBtn.onclick = async () => {
  const sender = nameInput.value.trim();
  if (!sender) return alert("Digite seu nome!");
  localStorage.setItem("username", sender);

  const text = msgInput.value.trim();
  if (!text) return;

  await push(chatRef, {
    sender,
    text,
    timestamp: serverTimestamp()
  });

  msgInput.value = "";

  if (text.toLowerCase().includes("@chatgpt")) {
    const pergunta = text.replace("@chatgpt", "").trim();
    responderComChatGPT(pergunta);
  }
};

// 📎 ENVIAR ARQUIVO
fileBtn.onclick = () => fileInput.click();

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const sender = nameInput.value.trim() || "Anônimo";
  localStorage.setItem("username", sender);

  const storageRef = sRef(storage, `files/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await push(chatRef, {
    sender,
    text: `📎 Enviou um arquivo: ${file.name}`,
    fileURL: url,
    timestamp: serverTimestamp()
  });
};

// 🤖 CHATGPT
async function responderComChatGPT(pergunta) {
  const apiKey = "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";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Você é o ChatGPT dentro de um chat global amigável." },
        { role: "user", content: pergunta }
      ],
      max_tokens: 120,
      temperature: 0.7
    })
  });

  const data = await res.json();
  const resposta = data.choices?.[0]?.message?.content || "Desculpe, não entendi.";

  await push(chatRef, {
    sender: "ChatGPT",
    text: resposta,
    timestamp: serverTimestamp()
  });
}
