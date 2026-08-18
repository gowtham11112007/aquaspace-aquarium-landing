/**
 * RAINBOW AQUARIUM & PETS — LIVING REEF CANVAS ENGINE
 * Inspired by playmagicreef.com interactive underwater physics
 * Features: Flocking & swimming fish species, sinusoidal tail physics,
 * ambient bubbles, light caustics, and click-to-feed interaction.
 */

class ReefSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.fishes = [];
    this.bubbles = [];
    this.foodPellets = [];
    this.ripples = [];
    this.lightRays = [];

    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.mouse = { x: -1000, y: -1000, isDown: false };
    this.lastTime = 0;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Populate initial ecosystem
    this.createFishSchool();
    this.createBubbles();
    this.createLightRays();

    // Event Listeners for feeding & ripples
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));

    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  createFishSchool() {
    this.fishes = [];
    // Species definitions
    const species = [
      { name: 'Clownfish', bodyColor: '#ff7043', stripeColor: '#ffffff', finColor: '#d84315', size: 36, speed: 1.4, count: 5 },
      { name: 'Blue Tang', bodyColor: '#1e88e5', stripeColor: '#0d47a1', finColor: '#fbc02d', size: 42, speed: 1.6, count: 3 },
      { name: 'Yellow Tang', bodyColor: '#fbc02d', stripeColor: '#fff9c4', finColor: '#f57f17', size: 38, speed: 1.3, count: 3 },
      { name: 'Royal Gramma', bodyColor: '#8e24aa', stripeColor: '#fbc02d', finColor: '#fbc02d', size: 32, speed: 1.8, count: 4 },
      { name: 'Neon Tetra', bodyColor: '#00e5ff', stripeColor: '#ff1744', finColor: '#80d8ff', size: 24, speed: 2.1, count: 6 },
    ];

    species.forEach(sp => {
      for (let i = 0; i < sp.count; i++) {
        this.fishes.push(new Fish(
          Math.random() * (this.width || 800),
          Math.random() * (this.height || 600) * 0.8 + 50,
          sp
        ));
      }
    });
  }

  createBubbles() {
    this.bubbles = [];
    const count = Math.floor(Math.max(15, (this.width || 800) / 40));
    for (let i = 0; i < count; i++) {
      this.bubbles.push(new Bubble(
        Math.random() * (this.width || 800),
        Math.random() * (this.height || 600),
        Math.random() * 6 + 2
      ));
    }
  }

  createLightRays() {
    this.lightRays = [];
    for (let i = 0; i < 5; i++) {
      this.lightRays.push({
        x: Math.random() * (this.width || 800),
        width: Math.random() * 80 + 40,
        opacity: Math.random() * 0.08 + 0.03,
        speed: Math.random() * 0.001 + 0.0005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  handlePointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Drop food pellets
    for (let i = 0; i < 3; i++) {
      this.foodPellets.push(new FoodPellet(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 10
      ));
    }

    // Create ripple effect
    this.ripples.push(new Ripple(x, y));

    // Show a floating feeding indicator near tap
    this.showFeedBubble(x, y);
  }

  handlePointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  showFeedBubble(x, y) {
    // Subtle feeding sparkle
    for (let i = 0; i < 4; i++) {
      this.bubbles.push(new Bubble(x + (Math.random() - 0.5) * 15, y, Math.random() * 4 + 2, true));
    }
  }

  loop(currentTime) {
    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1) || 0.016;
    this.lastTime = currentTime;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw animated sun caustics rays
    this.drawLightRays(currentTime);

    // 2. Update and draw ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.update(delta);
      r.draw(this.ctx);
      if (r.alpha <= 0) this.ripples.splice(i, 1);
    }

    // 3. Update and draw food pellets
    for (let i = this.foodPellets.length - 1; i >= 0; i--) {
      const p = this.foodPellets[i];
      p.update(delta);
      p.draw(this.ctx);
      if (p.y > this.height - 20 || p.eaten) {
        this.foodPellets.splice(i, 1);
      }
    }

    // 4. Update and draw fish
    this.fishes.forEach(fish => {
      fish.update(delta, this.width, this.height, this.foodPellets, this.mouse);
      fish.draw(this.ctx);
    });

    // 5. Update and draw bubbles
    this.bubbles.forEach(b => {
      b.update(delta, this.width, this.height);
      b.draw(this.ctx);
    });

    requestAnimationFrame((t) => this.loop(t));
  }

  drawLightRays(time) {
    this.ctx.save();
    this.lightRays.forEach(ray => {
      const currentX = ray.x + Math.sin(time * ray.speed + ray.phase) * 60;
      const gradient = this.ctx.createLinearGradient(currentX, 0, currentX + 80, this.height);
      gradient.addColorStop(0, `rgba(56, 189, 248, ${ray.opacity * 1.5})`);
      gradient.addColorStop(0.6, `rgba(34, 211, 238, ${ray.opacity * 0.5})`);
      gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.moveTo(currentX - ray.width / 2, 0);
      this.ctx.lineTo(currentX + ray.width / 2, 0);
      this.ctx.lineTo(currentX + ray.width * 1.8, this.height);
      this.ctx.lineTo(currentX - ray.width * 0.8, this.height);
      this.ctx.closePath();
      this.ctx.fill();
    });
    this.ctx.restore();
  }
}

// ----------------------------------------------------
// Fish Agent Entity
// ----------------------------------------------------
class Fish {
  constructor(x, y, species) {
    this.x = x;
    this.y = y;
    this.species = species;
    this.size = species.size;
    this.baseSpeed = species.speed * (0.85 + Math.random() * 0.3);
    this.speed = this.baseSpeed;
    
    this.vx = (Math.random() > 0.5 ? 1 : -1) * this.baseSpeed * (0.6 + Math.random() * 0.4);
    this.vy = (Math.random() - 0.5) * 0.4;
    this.angle = Math.atan2(this.vy, this.vx);
    
    this.tailAngle = 0;
    this.tailSpeed = 6 + Math.random() * 3;
    this.target = null;
    this.swimPhase = Math.random() * Math.PI * 2;
  }

  update(delta, width, height, foodPellets, mouse) {
    this.swimPhase += delta * this.tailSpeed;
    this.tailAngle = Math.sin(this.swimPhase) * 0.35;

    // Check if food pellet is near
    let closestFood = null;
    let minDistance = 240;

    for (let food of foodPellets) {
      if (food.eaten) continue;
      const dx = food.x - this.x;
      const dy = food.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDistance) {
        minDistance = dist;
        closestFood = food;
      }
    }

    if (closestFood) {
      // Seek food
      const targetAngle = Math.atan2(closestFood.y - this.y, closestFood.x - this.x);
      this.angle += this.angleDiff(targetAngle, this.angle) * 0.08;
      this.speed = this.baseSpeed * 2.2;
      this.tailSpeed = 14;

      if (minDistance < 18) {
        closestFood.eaten = true;
        this.speed = this.baseSpeed;
        this.tailSpeed = 8;
      }
    } else {
      // Gentle natural swim
      this.speed = this.baseSpeed;
      this.tailSpeed = 6 + Math.sin(this.swimPhase * 0.5) * 2;

      // Subtle wandering
      this.angle += (Math.random() - 0.5) * 0.04;
      
      // Avoid screen boundaries smoothly
      const margin = 70;
      if (this.x < margin) this.angle += 0.06;
      if (this.x > width - margin) this.angle += 0.06;
      if (this.y < margin) this.angle += 0.06;
      if (this.y > height - margin) this.angle -= 0.06;
    }

    // Velocity update
    this.vx = Math.cos(this.angle) * this.speed * 60 * delta;
    this.vy = Math.sin(this.angle) * this.speed * 60 * delta;

    this.x += this.vx;
    this.y += this.vy;

    // Wrap-around screen bounds
    if (this.x < -60) this.x = width + 50;
    if (this.x > width + 60) this.x = -50;
    if (this.y < -30) this.y = height + 20;
    if (this.y > height + 30) this.y = -20;
  }

  angleDiff(target, current) {
    let diff = target - current;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return diff;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const s = this.size;
    const isFacingLeft = Math.cos(this.angle) < 0;
    if (isFacingLeft) {
      ctx.scale(1, -1);
    }

    // 1. Tail Fin (animated with wag)
    ctx.save();
    ctx.translate(-s * 0.45, 0);
    ctx.rotate(this.tailAngle);
    ctx.fillStyle = this.species.finColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.45, -s * 0.3);
    ctx.quadraticCurveTo(-s * 0.3, 0, -s * 0.45, s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Fish Body (Torpedo/Organic Ellipse)
    ctx.fillStyle = this.species.bodyColor;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, 0);
    ctx.quadraticCurveTo(s * 0.15, -s * 0.32, -s * 0.4, 0);
    ctx.quadraticCurveTo(s * 0.15, s * 0.32, s * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // 3. Species Striping / Markings
    if (this.species.stripeColor) {
      ctx.fillStyle = this.species.stripeColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.09, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      if (this.species.name === 'Clownfish') {
        ctx.beginPath();
        ctx.ellipse(s * 0.25, 0, s * 0.07, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Dorsal & Pectoral Fins
    ctx.fillStyle = this.species.finColor;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.26);
    ctx.quadraticCurveTo(s * 0.05, -s * 0.42, s * 0.2, -s * 0.22);
    ctx.closePath();
    ctx.fill();

    // 5. Cute Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s * 0.32, -s * 0.06, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(s * 0.34, -s * 0.06, s * 0.045, 0, Math.PI * 2);
    ctx.fill();

    // Eye glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s * 0.35, -s * 0.08, s * 0.02, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ----------------------------------------------------
// Bubble Entity
// ----------------------------------------------------
class Bubble {
  constructor(x, y, radius, isSparkle = false) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = (Math.random() * 0.8 + 0.6) * 50;
    this.wobbleSpeed = Math.random() * 4 + 2;
    this.wobbleAmount = Math.random() * 1.5 + 0.5;
    this.phase = Math.random() * Math.PI * 2;
    this.opacity = Math.random() * 0.4 + 0.2;
    this.isSparkle = isSparkle;
  }

  update(delta, width, height) {
    this.y -= this.speed * delta;
    this.phase += this.wobbleSpeed * delta;
    this.x += Math.sin(this.phase) * this.wobbleAmount * 0.4;

    if (this.y < -20) {
      this.y = height + 15;
      this.x = Math.random() * width;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity * 0.25})`;
    ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.85})`;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bubble highlight reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.35, this.y - this.radius * 0.35, this.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ----------------------------------------------------
// Food Pellet Entity
// ----------------------------------------------------
class FoodPellet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vy = Math.random() * 20 + 35;
    this.vx = (Math.random() - 0.5) * 12;
    this.size = Math.random() * 2 + 3;
    this.eaten = false;
    this.color = '#fbbf24';
  }

  update(delta) {
    this.y += this.vy * delta;
    this.x += this.vx * delta;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ----------------------------------------------------
// Water Ripple Entity
// ----------------------------------------------------
class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.maxRadius = 65;
    this.alpha = 0.8;
  }

  update(delta) {
    this.radius += 55 * delta;
    this.alpha -= 0.9 * delta;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, this.alpha)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new ReefSimulator('reefCanvas');
});
