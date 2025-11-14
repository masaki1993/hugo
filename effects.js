// effects.js - Visual effects, particles, and animations

class EffectsManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.particles = [];
    this.stars = [];
    this.powerUps = [];
  }

  // Create the star background
  createStarfield() {
    this.stars = [];
    
    // Small stars
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: 0.2 + Math.random() * 1.0,
        size: 0.5 + Math.random() * 1.5,
        twinkle: Math.random() > 0.7,
        twinkleSpeed: 0.02 + Math.random() * 0.05,
        brightness: Math.random(),
        type: 'small'
      });
    }
    
    // Big stars
    for (let i = 0; i < 30; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: 0.05 + Math.random() * 0.1,
        size: 2 + Math.random() * 2,
        color: this.getRandomStarColor(),
        type: 'big'
      });
    }
    
    // Star clusters
    for (let i = 0; i < 8; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: 0.01 + Math.random() * 0.02,
        size: 30 + Math.random() * 80,
        opacity: 0.01 + Math.random() * 0.1,
        type: 'cluster'
      });
    }
    
    // Nebulae
    for (let i = 0; i < 3; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: 0.005,
        size: 150 + Math.random() * 200,
        opacity: 0.05 + Math.random() * 0.1,
        color: this.getRandomNebulaColor(),
        type: 'nebula'
      });
    }
  }
  
  getRandomStarColor() {
    const colors = [
      '#ffffff', // White
      '#ffffdd', // Light yellow
      '#ddddff', // Light blue
      '#ffdddd'  // Light red
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  getRandomNebulaColor() {
    const colors = [
      'rgba(100, 100, 255, 0.1)', // Blue nebula
      'rgba(255, 100, 100, 0.1)', // Red nebula
      'rgba(100, 255, 100, 0.1)', // Green nebula
      'rgba(255, 100, 255, 0.1)'  // Purple nebula
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  updateStars() {
    this.stars.forEach(star => {
      star.y += star.speed;
      
      // Reset stars that move off screen
      if (star.y > this.canvas.height) {
        star.y = 0;
        star.x = Math.random() * this.canvas.width;
      }
      
      // Update twinkling effect
      if (star.twinkle) {
        star.brightness += star.twinkleSpeed;
        if (star.brightness > 1 || star.brightness < 0.2) {
          star.twinkleSpeed *= -1;
        }
      }
    });
  }

  drawStars(ctx) {
    this.stars.forEach(star => {
      ctx.save();
      
      if (star.type === 'small') {
        // Small stars
        const opacity = star.twinkle ? star.brightness : 1;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      } 
      else if (star.type === 'big') {
        // Big stars with glow
        ctx.shadowBlur = 5;
        ctx.shadowColor = star.color;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (star.type === 'cluster') {
        // Star clusters
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size
        );
        gradient.addColorStop(0, `rgba(100, 100, 255, ${star.opacity})`);
        gradient.addColorStop(1, 'rgba(100, 100, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (star.type === 'nebula') {
        // Nebulae
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size
        );
        gradient.addColorStop(0, star.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
  }

  // Create explosion particles
  createExplosion(x, y, color, count = 30) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const size = 1 + Math.random() * 3;
      const life = 30 + Math.random() * 60;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color,
        life,
        maxLife: life,
        gravity: 0.05,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }
    
    // Add a shockwave effect
    this.particles.push({
      x,
      y,
      size: 5,
      maxSize: 50,
      color: 'rgba(255, 255, 255, 0.5)',
      life: 20,
      maxLife: 20,
      type: 'wave'
    });
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      if (particle.type === 'wave') {
        // Shockwave update
        particle.life--;
        if (particle.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
      else {
        // Regular particle update
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.rotation += particle.rotationSpeed;
        particle.life--;
        
        if (particle.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }
  }

  drawParticles(ctx) {
    this.particles.forEach(particle => {
      ctx.save();
      
      if (particle.type === 'wave') {
        // Explosion shockwave
        const progress = 1 - particle.life / particle.maxLife;
        const currentSize = particle.size + (particle.maxSize - particle.size) * progress;
        
        ctx.strokeStyle = particle.color;
        ctx.globalAlpha = (1 - progress) * 0.7;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2);
        ctx.stroke();
      }
      else {
        // Regular particles
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        const alpha = particle.life / particle.maxLife;
        ctx.globalAlpha = alpha;
        
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
      }
      
      ctx.restore();
    });
  }

  // Create power-up items
  spawnPowerUp(x, y, type, powerUpTypes) {
    const powerUpType = type || Object.keys(powerUpTypes)[Math.floor(Math.random() * Object.keys(powerUpTypes).length)];
    
    this.powerUps.push({
      x,
      y,
      type: powerUpType,
      width: 20,
      height: 20,
      speed: 1,
      rotation: 0,
      rotationSpeed: 0.02 + Math.random() * 0.02
    });
  }

  updatePowerUps() {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      powerUp.y += powerUp.speed;
      powerUp.rotation += powerUp.rotationSpeed;
      
      // Remove if offscreen
      if (powerUp.y > this.canvas.height) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  drawPowerUps(ctx, powerUpTypes) {
    this.powerUps.forEach(powerUp => {
      ctx.save();
      
      // Apply rotation around center
      ctx.translate(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
      ctx.rotate(powerUp.rotation);
      
      // Glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = powerUpTypes[powerUp.type].color;
      
      // Gradient fill
      const gradient = ctx.createRadialGradient(
        0, 0, 0,
        0, 0, powerUp.width/2
      );
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(0.5, powerUpTypes[powerUp.type].color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, powerUp.width/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Power-up symbol
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let symbol;
      switch(powerUp.type) {
        case 'SHIELD': symbol = 'S'; break;
        case 'RAPID': symbol = 'R'; break;
        case 'TRIPLE': symbol = 'T'; break;
        case 'LASER': symbol = 'L'; break;
        default: symbol = '?';
      }
      
      ctx.fillText(symbol, 0, 0);
      
      ctx.restore();
    });
  }

  // Create screen shake effect
  createScreenShake() {
    document.body.style.animation = 'shake 0.5s';
    setTimeout(() => {
      document.body.style.animation = '';
    }, 500);
  }

  // Show level up message
  showLevelUp(level, isBoSS) {
    // Level up message
    const levelUpDisplay = document.createElement('div');
    levelUpDisplay.className = 'level-up';
    levelUpDisplay.textContent = `LEVEL ${level}`;
    document.body.appendChild(levelUpDisplay);
    
    // Remove after animation
    setTimeout(() => {
      levelUpDisplay.remove();
    }, 2000);
    
    // Boss alert if applicable
    if (isBoSS) {
      const bossAlert = document.createElement('div');
      bossAlert.className = 'boss-alert';
      bossAlert.textContent = 'BOSS APPROACHING';
      document.body.appendChild(bossAlert);
      
      setTimeout(() => {
        bossAlert.remove();
      }, 3000);
    }
  }
}

// Export the EffectsManager class
window.EffectsManager = EffectsManager; 