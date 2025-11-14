// player.js - Player functionality and shooting mechanics

class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = 60;
    this.height = 60;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - 100;
    this.speed = 10;
    this.powerUp = null;
    this.powerUpTimer = 0;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.weaponLevel = 1;
    this.weaponCooldown = 0;
    this.weaponHeat = 0;
    this.maxHeat = 100;
  }

  update(keys, sounds, beams) {
    // Player movement
    if (keys.left) this.x -= this.speed;
    if (keys.right) this.x += this.speed;
    
    // Keep player within screen bounds
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.canvas.width) this.x = this.canvas.width - this.width;
    
    // Weapon cooldown
    if (this.weaponCooldown > 0) {
      this.weaponCooldown--;
    }
    
    // Shooting logic
    if (keys.shoot && this.weaponCooldown <= 0) {
      console.log("Shooting beam from player.js!");
      this.shoot(sounds, beams);
    }
    
    // Invincibility timer
    if (this.invincible) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }
    
    // Power-up timer
    if (this.powerUp) {
      this.powerUpTimer--;
      if (this.powerUpTimer <= 0) {
        this.powerUp = null;
      }
    }
  }
  
  shoot(sounds, beams) {
    // Base beam properties - Enhanced for more power
    const baseBeam = {
      x: this.x + this.width / 2,
      y: this.y,
      width: 8,            // Wider beam (was 6)
      height: 40,          // Longer beam (was 20)
      speed: 20,           // Faster beam (was 15)
      color: '#00ffff',    // Cyan color
      power: 10,           // Much higher damage (was 1)
      glowIntensity: 1.5   // Stronger glow effect (was 1.0)
    };
    
    // Add the beam to the array
    beams.push({...baseBeam});
    
    // Handle power-ups
    if (this.powerUp === 'TRIPLE') {
      // Triple shot power-up
      beams.push({...baseBeam, x: baseBeam.x - 20});
      beams.push({...baseBeam, x: baseBeam.x + 20});
      this.weaponCooldown = 15;
    } else if (this.powerUp === 'RAPID') {
      // Rapid fire power-up
      this.weaponCooldown = 5;
    } else {
      // Standard cooldown
      this.weaponCooldown = 15;
    }
    
    // Play sound effect
    sounds.shoot.currentTime = 0;
    sounds.shoot.play();
    
    return beams;
  }
  
  shootSpecialBeam(sounds, beams) {
    if (this.weaponCooldown > 0) return beams;
    
    // Special wide beam with high damage
    beams.push({
      x: this.x - 50,
      y: this.y,
      width: 150,
      height: 60,         // Taller beam (was 50)
      speed: 15,          // Faster (was 10)
      color: '#ff0000',   // Red color
      power: 20,          // Higher damage (was 3)
      isSpecial: true,
      lifetime: 20        // Longer lifetime (was 15)
    });
    
    // Long cooldown for special attack
    this.weaponCooldown = 60;
    
    // Play sound
    sounds.shoot.currentTime = 0;
    sounds.shoot.play();
    
    return beams;
  }
  
  draw(ctx) {
    // Only draw player if not invincible or blinking
    if (!this.invincible || Math.floor(Date.now() / 100) % 2) {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ffff';
      
      // Ship body
      ctx.fillStyle = '#3366ff';
      ctx.beginPath();
      ctx.moveTo(this.x + this.width/2, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.lineTo(this.x, this.y + this.height);
      ctx.closePath();
      ctx.fill();
      
      // Cockpit
      ctx.fillStyle = '#aaddff';
      ctx.beginPath();
      ctx.moveTo(this.x + this.width/2, this.y + 10);
      ctx.lineTo(this.x + this.width/2 + 10, this.y + 25);
      ctx.lineTo(this.x + this.width/2 - 10, this.y + 25);
      ctx.closePath();
      ctx.fill();
      
      // Engine flame
      ctx.fillStyle = '#ff9900';
      ctx.beginPath();
      const flameHeight = 10 + Math.sin(Date.now() / 100) * 5;
      ctx.moveTo(this.x + this.width/2 - 10, this.y + this.height);
      ctx.lineTo(this.x + this.width/2 + 10, this.y + this.height);
      ctx.lineTo(this.x + this.width/2, this.y + this.height + flameHeight);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }
  }
  
  activatePowerUp(type, powerUpTypes) {
    this.powerUp = type;
    this.powerUpTimer = powerUpTypes[type].duration;
    this.invincible = true;
    this.invincibleTimer = powerUpTypes[type].duration;
  }
}

// Export the Player class
window.Player = Player; 