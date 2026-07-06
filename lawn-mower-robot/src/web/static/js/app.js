/**
 * Application principale - connexion Socket.IO et gestion de l'interface.
 */
const socket = io({ transports: ["websocket", "polling"] });
const joystick = new VirtualJoystick(document.getElementById("joystick"));

// --- Utilitaires DOM ---
const $ = id => document.getElementById(id);

// --- Indicateur connexion ---
socket.on("connect", () => {
  $("connection-indicator").textContent = "Connecté";
  $("connection-indicator").className = "connected";
});
socket.on("disconnect", () => {
  $("connection-indicator").textContent = "Déconnecté";
  $("connection-indicator").className = "disconnected";
  socket.emit("stop");
});

// --- Mise à jour état ---
socket.on("status", data => {
  $("status-mode").textContent = data.mode || "—";
  $("status-blade").textContent = data.blade_running ? "🟢 ON" : "🔴 OFF";
  $("status-obstacle").textContent = data.obstacle_ahead ? "⚠️ Obstacle" : "✅ Libre";

  const dist = data.distances || {};
  $("dist-front").textContent = fmt(dist.front);
  $("dist-rear").textContent  = fmt(dist.rear);
  $("dist-left").textContent  = fmt(dist.left);
  $("dist-right").textContent = fmt(dist.right);

  if (data.arms) {
    $("angles-left").textContent  = fmtAngles(data.arms.left);
    $("angles-right").textContent = fmtAngles(data.arms.right);
  }

  // Bandeau de sécurité (personne/animal/inclinaison/collision)
  const safety = data.safety || {};
  const safetyBar = $("safety-bar");
  if (safetyBar) {
    const hazards = safety.hazards || [];
    if (hazards.length) {
      const labels = { person: "👤 Personne/animal", tilt: "⚠️ Inclinaison", bumper: "💥 Collision" };
      safetyBar.textContent = "SÉCURITÉ — Lame coupée : " + hazards.map(h => labels[h] || h).join(", ");
      safetyBar.classList.remove("hidden");
    } else {
      safetyBar.classList.add("hidden");
    }
  }

  const isEmergency = data.mode === "EMERGENCY";
  $("emergency-bar").classList.toggle("hidden", !isEmergency);
});

function fmt(v) {
  if (v === undefined || v === null) return "—";
  if (v >= 999) return "∞";
  return v + " cm";
}
function fmtAngles(arr) {
  if (!arr) return "—";
  return arr.map(a => Math.round(a) + "°").join(" / ");
}

// --- Joystick ---
let moveThrottle = null;
document.getElementById("joystick").addEventListener("joystick:move", e => {
  const { linear, angular } = e.detail;
  if (moveThrottle) return;
  moveThrottle = setTimeout(() => { moveThrottle = null; }, 50);
  socket.emit("move", { linear, angular });
});

// --- Boutons déplacement ---
$("btn-stop").addEventListener("click", () => socket.emit("stop"));

// --- Boutons lame ---
$("btn-blade-start").addEventListener("click", () => socket.emit("blade", { action: "start" }));
$("btn-blade-stop").addEventListener("click",  () => socket.emit("blade", { action: "stop" }));

// --- Boutons tonte ---
$("btn-mow-start").addEventListener("click", () => socket.emit("mow_start"));
$("btn-mow-stop").addEventListener("click",  () => socket.emit("mow_stop"));

// --- Boutons bras ---
document.querySelectorAll(".arm-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    socket.emit("arm", { command: btn.dataset.cmd });
  });
});

// --- Arrêt d'urgence ---
$("btn-emergency").addEventListener("click", () => {
  if (confirm("Confirmer l'arrêt d'urgence ?")) {
    socket.emit("emergency_stop");
  }
});
$("btn-reset-emergency").addEventListener("click", () => {
  socket.emit("reset_emergency");
});

// --- Contrôle clavier (ZQSD / flèches) ---
const keysDown = new Set();
let keyInterval = null;

const keyMap = {
  ArrowUp: "w", z: "w", Z: "w",
  ArrowDown: "s", s: "s", S: "s",
  ArrowLeft: "a", q: "a", Q: "a",
  ArrowRight: "d", d: "d", D: "d",
};

document.addEventListener("keydown", e => {
  const mapped = keyMap[e.key];
  if (!mapped) return;
  e.preventDefault();
  keysDown.add(mapped);
  if (!keyInterval) keyInterval = setInterval(sendKeyMove, 80);
});
document.addEventListener("keyup", e => {
  const mapped = keyMap[e.key];
  if (!mapped) return;
  keysDown.delete(mapped);
  if (keysDown.size === 0) {
    clearInterval(keyInterval);
    keyInterval = null;
    socket.emit("move", { linear: 0, angular: 0 });
  }
});

function sendKeyMove() {
  let linear = 0, angular = 0;
  if (keysDown.has("w")) linear  =  70;
  if (keysDown.has("s")) linear  = -70;
  if (keysDown.has("a")) angular = -60;
  if (keysDown.has("d")) angular =  60;
  socket.emit("move", { linear, angular });
}
