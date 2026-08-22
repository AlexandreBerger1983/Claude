/**
 * Joystick virtuel sur canvas - fonctionne au toucher et à la souris.
 * Émet un événement "joystick:move" avec { linear, angular } normalisés de -100 à 100.
 */
class VirtualJoystick {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cx = canvas.width / 2;
    this.cy = canvas.height / 2;
    this.radius = canvas.width / 2 - 10;
    this.knobRadius = 28;
    this.knobX = this.cx;
    this.knobY = this.cy;
    this.active = false;

    this._draw();
    this._bind();
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener("mousedown",  e => this._start(e));
    c.addEventListener("mousemove",  e => this._move(e));
    c.addEventListener("mouseup",    () => this._end());
    c.addEventListener("mouseleave", () => this._end());
    c.addEventListener("touchstart", e => { e.preventDefault(); this._start(e.touches[0]); }, { passive: false });
    c.addEventListener("touchmove",  e => { e.preventDefault(); this._move(e.touches[0]); }, { passive: false });
    c.addEventListener("touchend",   e => { e.preventDefault(); this._end(); });
  }

  _clientPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (this.canvas.height / rect.height),
    };
  }

  _start(e) {
    this.active = true;
    this._move(e);
  }

  _move(e) {
    if (!this.active) return;
    const pos = this._clientPos(e);
    const dx = pos.x - this.cx;
    const dy = pos.y - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamp = Math.min(dist, this.radius);
    const angle = Math.atan2(dy, dx);

    this.knobX = this.cx + Math.cos(angle) * clamp;
    this.knobY = this.cy + Math.sin(angle) * clamp;

    const linear  = -((this.knobY - this.cy) / this.radius) * 100;
    const angular =  ((this.knobX - this.cx) / this.radius) * 100;

    this.canvas.dispatchEvent(new CustomEvent("joystick:move", {
      detail: { linear: Math.round(linear), angular: Math.round(angular) },
      bubbles: true,
    }));
    this._draw();
  }

  _end() {
    if (!this.active) return;
    this.active = false;
    this.knobX = this.cx;
    this.knobY = this.cy;
    this.canvas.dispatchEvent(new CustomEvent("joystick:move", {
      detail: { linear: 0, angular: 0 },
      bubbles: true,
    }));
    this._draw();
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Zone
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1d27";
    ctx.fill();
    ctx.strokeStyle = "#2d3148";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Croix centrale
    ctx.strokeStyle = "#2d3148";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.cx - this.radius, this.cy);
    ctx.lineTo(this.cx + this.radius, this.cy);
    ctx.moveTo(this.cx, this.cy - this.radius);
    ctx.lineTo(this.cx, this.cy + this.radius);
    ctx.stroke();

    // Knob
    const grad = ctx.createRadialGradient(
      this.knobX - 4, this.knobY - 4, 2,
      this.knobX, this.knobY, this.knobRadius
    );
    grad.addColorStop(0, "#86efac");
    grad.addColorStop(1, "#16a34a");
    ctx.beginPath();
    ctx.arc(this.knobX, this.knobY, this.knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
