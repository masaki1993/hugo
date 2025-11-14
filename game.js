// game.js - Main game logic and initialization

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Canvas sizing
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Game state
    this.gameState = {
      level: 1,
      score: 0,
      highScore: this.loadHighScore(),
      lives: 3,
      isPaused: false,
      isGameOver: false,
      isStarted: false
    };
    
    // Power-up types
    this.powerUpTypes = {
      SHIELD: { color: '#ff00ff', duration: 1200, name: '無敵' },
      RAPID: { color: '#ffff00', duration: 900, name: '連射' },
      TRIPLE: { color: '#00ffff', duration: 900, name: '3連射' },
      LASER: { color: '#ff0000', duration: 600, name: 'レーザー' }
    };
    
    // Game objects
    this.beams = [];
    this.enemyBeams = [];
    this.lastUpdateTime = 0;
    
    // Input handling
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      shoot: false
    };
    
    // Create system classes
    this.effects = new EffectsManager(this.canvas);
    this.player = new Player(this.canvas);
    
    // Sound effects
    this.sounds = {
      shoot: new Audio('data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTtvAAB/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/'),
      explosion: new Audio('data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTtvAAB/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/'),
      powerUp: new Audio('data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTtvAAB/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/')
    };
    
    // Set sound volumes
    this.sounds.shoot.volume = 0.4;
    this.sounds.explosion.volume = 0.5;
    this.sounds.powerUp.volume = 0.6;
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  // Load high score from localStorage
  loadHighScore() {
    const savedHighScore = localStorage.getItem('spaceInvaderHighScore');
    return savedHighScore ? parseInt(savedHighScore) : 0;
  }
  
  // Save high score to localStorage
  saveHighScore() {
    localStorage.setItem('spaceInvaderHighScore', this.gameState.highScore);
  }
  
  // Initialize game
  init() {
    // Create starfield
    this.effects.createStarfield();
    
    // Position player
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - 100;
    
    // Create initial enemy formation
    this.createNewFormation();
    
    // Update UI displays
    this.updateScore();
    this.updateHighScore();
    this.updateLevel();
    this.updateLives();
    
    // Set last update time
    this.lastUpdateTime = Date.now();
  }
  
  // Set up all event listeners
  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (!this.gameState.isStarted) return;
      if (e.key === 'ArrowLeft') this.keys.left = true;
      if (e.key === 'ArrowRight') this.keys.right = true;
      if (e.key === ' ' || e.key === 'Space') this.keys.shoot = true;
      if (e.key === 'h' || e.key === 'H') this.togglePause();
      
      console.log("Key pressed:", e.key, "keys.shoot:", this.keys.shoot);
    });
    
    // Backup keyCode detection for Space
    document.addEventListener('keydown', (e) => {
      if (!this.gameState.isStarted) return;
      // Space key (keyCode: 32)
      if (e.keyCode === 32 || e.which === 32) {
        this.keys.shoot = true;
        console.log("Space key via keyCode! keys.shoot:", this.keys.shoot);
        
        // Emergency direct beam firing
        if (this.player.weaponCooldown <= 0) {
          this.player.shoot(this.sounds, this.beams);
        }
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = false;
      if (e.key === 'ArrowRight') this.keys.right = false;
      if (e.key === ' ' || e.key === 'Space') this.keys.shoot = false;
    });
    
    // Mobile controls
    document.getElementById('yellowBeamBtn').addEventListener('touchstart', () => this.keys.shoot = true);
    document.getElementById('yellowBeamBtn').addEventListener('touchend', () => this.keys.shoot = false);
    document.getElementById('blueBeamBtn').addEventListener('click', () => this.player.shootSpecialBeam(this.sounds, this.beams));
    
    // Canvas click for emergency shooting
    this.canvas.addEventListener('click', () => {
      if (!this.gameState.isStarted || this.gameState.isPaused || this.gameState.isGameOver) return;
      
      console.log("Canvas clicked - emergency shooting");
      if (this.player.weaponCooldown <= 0) {
        this.player.shoot(this.sounds, this.beams);
      }
    });
    
    // Start button
    document.getElementById('startBtn').addEventListener('click', () => this.startGame());
    
    // Return to games button
    document.getElementById('reloadBtn').addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
  
  // Resize canvas to match window size
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  // Start the game
  startGame() {
    document.getElementById('startScreen').style.display = 'none';
    this.gameState.isStarted = true;
    this.resetGame();
    this.gameLoop();
  }
  
  // Create a new enemy formation
  createNewFormation() {
    this.formation = new Formation(this.gameState.level, this.canvas);
    this.enemies = this.formation.enemies;
  }
  
  // Main game loop
  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
  
  // Update all game objects
  update() {
    if (!this.gameState.isStarted || this.gameState.isPaused || this.gameState.isGameOver) return;
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // Update player
    this.player.update(this.keys, this.sounds, this.beams);
    
    // Update enemy formation
    this.formation.update(elapsedTime, this.enemyBeams);
    
    // Check if all enemies are defeated
    if (this.enemies.length === 0) {
      console.log("All enemies defeated! Moving to next level.");
      this.levelUp();
    }
    
    // Check if any enemies have reached the bottom of the screen
    this.checkEnemiesReachedBottom();
    
    // Update beams and check collisions
    this.updateBeams(elapsedTime);
    
    // Update power-ups
    this.updatePowerUps();
    
    // Update visual effects
    this.effects.updateParticles();
    this.effects.updateStars();
    
    // Update power-up status display
    this.updatePowerUpStatus();
  }
  
  // Check if enemies have reached the bottom of the screen
  checkEnemiesReachedBottom() {
    const dangerZone = this.canvas.height - 150; // Safe zone above player
    
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.y + enemy.height > dangerZone) {
        // Enemy has reached the bottom - lose a life
        this.loseLife();
        
        // Create explosion
        this.effects.createExplosion(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
          enemy.color,
          20
        );
        
        // Remove the enemy
        this.enemies.splice(i, 1);
        const formationIndex = this.formation.enemies.indexOf(enemy);
        if (formationIndex !== -1) {
          this.formation.enemies.splice(formationIndex, 1);
        }
        
        // Only handle one enemy per frame to avoid multiple life loss
        break;
      }
    }
  }
  
  // Update beams and handle collisions
  updateBeams(elapsedTime) {
    // Update player beams
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const beam = this.beams[i];
      
      // Special beam lifetime check
      if (beam.isSpecial) {
        beam.lifetime--;
        if (beam.lifetime <= 0) {
          this.beams.splice(i, 1);
          continue;
        }
      } else {
        // Regular beam movement
        beam.y -= beam.speed;
        
        // Remove beams that go off screen
        if (beam.y + beam.height < 0) {
          this.beams.splice(i, 1);
          continue;
        }
      }
      
      // Check collisions with enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        
        if (this.checkCollision(beam, enemy)) {
          // Handle beam hit
          if (beam.isSpecial) {
            // Special beam instantly destroys
            enemy.health = 0;
          } else {
            // Regular beam reduces health and is consumed
            enemy.health -= beam.power;
            this.beams.splice(i, 1);
          }
          
          // Check if enemy is destroyed
          if (enemy.health <= 0) {
            this.destroyEnemy(enemy, j);
          }
          
          // Break loop if beam was removed
          if (!beam.isSpecial) break;
        }
      }
    }
    
    // Update enemy beams
    for (let i = this.enemyBeams.length - 1; i >= 0; i--) {
      const beam = this.enemyBeams[i];
      
      // Update based on beam type
      if (beam.isLaser) {
        beam.lifetime--;
        if (beam.lifetime <= 0) {
          this.enemyBeams.splice(i, 1);
          continue;
        }
      } else {
        // Update position based on angle or default downward
        if (beam.angle !== undefined) {
          beam.x += Math.cos(beam.angle) * beam.speed;
          beam.y += Math.sin(beam.angle) * beam.speed;
        } else {
          beam.y += beam.speed;
        }
      }
      
      // Remove off-screen beams
      if (beam.y > this.canvas.height || beam.x < 0 || beam.x > this.canvas.width) {
        this.enemyBeams.splice(i, 1);
        continue;
      }
      
      // Check collision with player
      if (!this.player.invincible && this.checkCollision(this.player, beam)) {
        this.enemyBeams.splice(i, 1);
        this.loseLife();
      }
    }
  }
  
  // Handle enemy destruction
  destroyEnemy(enemy, index) {
    // Add score
    this.gameState.score += enemy.points;
    this.updateScore();
    
    // Update high score if needed
    if (this.gameState.score > this.gameState.highScore) {
      this.gameState.highScore = this.gameState.score;
      this.updateHighScore();
      this.saveHighScore();
    }
    
    // Create explosion effect
    this.effects.createExplosion(
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2,
      enemy.color,
      30 // more particles
    );
    
    // Remove enemy from arrays
    this.enemies.splice(index, 1);
    const formationIndex = this.formation.enemies.indexOf(enemy);
    if (formationIndex !== -1) {
      this.formation.enemies.splice(formationIndex, 1);
    }
    
    // Play explosion sound
    this.sounds.explosion.currentTime = 0;
    this.sounds.explosion.play();
    
    // Chance to drop power-up
    if (Math.random() < 0.15) { // increased drop chance
      this.effects.spawnPowerUp(
        enemy.x + enemy.width / 2 - 10,
        enemy.y + enemy.height / 2,
        null,
        this.powerUpTypes
      );
    }
  }
  
  // Update power-ups and check collisions
  updatePowerUps() {
    this.effects.updatePowerUps();
    
    for (let i = this.effects.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.effects.powerUps[i];
      
      // Check collision with player
      if (this.checkCollision(this.player, powerUp)) {
        this.activatePowerUp(powerUp.type);
        this.effects.powerUps.splice(i, 1);
        
        // Play power-up sound
        this.sounds.powerUp.currentTime = 0;
        this.sounds.powerUp.play();
      }
    }
  }
  
  // Activate power-up on player
  activatePowerUp(type) {
    this.player.activatePowerUp(type, this.powerUpTypes);
    this.updatePowerUpStatus();
  }
  
  // Draw everything
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background stars
    this.effects.drawStars(this.ctx);
    
    // Draw player
    this.player.draw(this.ctx);
    
    // Draw beams
    this.drawBeams();
    
    // Draw enemies
    this.formation.draw(this.ctx);
    
    // Draw power-ups
    this.effects.drawPowerUps(this.ctx, this.powerUpTypes);
    
    // Draw particles
    this.effects.drawParticles(this.ctx);
  }
  
  // Draw all beams
  drawBeams() {
    // Draw player beams
    this.beams.forEach(beam => {
      this.ctx.save();
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = beam.color;
      this.ctx.fillStyle = beam.color;
      
      // Beam body
      this.ctx.fillRect(beam.x - beam.width/2, beam.y - beam.height, beam.width, beam.height);
      
      // Beam tip
      this.ctx.beginPath();
      this.ctx.moveTo(beam.x - beam.width/2, beam.y - beam.height);
      this.ctx.lineTo(beam.x + beam.width/2, beam.y - beam.height);
      this.ctx.lineTo(beam.x, beam.y - beam.height - 10);
      this.ctx.closePath();
      this.ctx.fill();
      
      this.ctx.restore();
    });
    
    // Draw enemy beams
    this.enemyBeams.forEach(beam => {
      this.ctx.save();
      
      if (beam.isWarning) {
        // Laser warning beam
        this.ctx.fillStyle = beam.color;
        this.ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
      }
      else if (beam.isLaser) {
        // Laser beam with animation
        const phase = Date.now() % 1000 / 1000;
        const intensity = 0.5 + Math.sin(phase * Math.PI * 2) * 0.3;
        
        // Outer glow
        const gradient = this.ctx.createLinearGradient(beam.x, 0, beam.x + beam.width, 0);
        gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity * 0.2})`);
        gradient.addColorStop(0.5, `rgba(255, 0, 0, ${intensity * 0.7})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${intensity * 0.2})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
        
        // Inner beam
        this.ctx.fillStyle = '#ffffff';
        const innerWidth = beam.width * 0.3;
        this.ctx.fillRect(beam.x + (beam.width - innerWidth)/2, beam.y, innerWidth, beam.height);
        
        // Pulsing effect
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2 * intensity;
        this.ctx.beginPath();
        this.ctx.moveTo(beam.x + beam.width/2, beam.y);
        this.ctx.lineTo(beam.x + beam.width/2, beam.y + beam.height);
        this.ctx.stroke();
      } else {
        // Standard beam
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = beam.color;
        this.ctx.fillStyle = beam.color;
        
        if (beam.angle !== undefined) {
          // Angled beam (circular)
          this.ctx.beginPath();
          this.ctx.arc(beam.x, beam.y, beam.width/2, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          // Downward beam (triangular)
          this.ctx.beginPath();
          this.ctx.moveTo(beam.x, beam.y);
          this.ctx.lineTo(beam.x + beam.width, beam.y);
          this.ctx.lineTo(beam.x + beam.width/2, beam.y + beam.height);
          this.ctx.closePath();
          this.ctx.fill();
        }
      }
      
      this.ctx.restore();
    });
  }
  
  // Check collision between two objects
  checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
  }
  
  // Level up
  levelUp() {
    if (this.gameState.isGameOver) return;
    
    this.gameState.level++;
    console.log(`Level up! Now at level ${this.gameState.level}`);
    
    // Show level up notification
    this.effects.showLevelUp(this.gameState.level, this.gameState.level % 5 === 0);
    
    // Update level display
    this.updateLevel();
    
    // Award bonus points
    this.gameState.score += this.gameState.level * 100;
    this.updateScore();
    
    // Check if score exceeds high score
    if (this.gameState.score > this.gameState.highScore) {
      this.gameState.highScore = this.gameState.score;
      this.updateHighScore();
      this.saveHighScore();
    }
    
    // Create new enemy formation
    this.createNewFormation();
  }
  
  // Reset game state
  resetGame() {
    if (this.gameState.isGameOver) {
      this.gameState.isGameOver = false;
      this.gameState.score = 0;
      this.gameState.level = 1;
      this.gameState.lives = 3;
    }
    
    // Reset player
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - 100;
    this.player.invincible = false;
    this.player.invincibleTimer = 0;
    this.player.powerUp = null;
    this.player.powerUpTimer = 0;
    
    // Clear arrays
    this.beams = [];
    this.enemies = [];
    this.enemyBeams = [];
    this.effects.powerUps = [];
    this.effects.particles = [];
    
    // Create initial formation
    this.createNewFormation();
    
    // Reset UI
    this.updateScore();
    this.updateHighScore();
    this.updateLevel();
    this.updateLives();
    
    // Remove game over element if exists
    const gameOverElement = document.getElementById('game-over');
    if (gameOverElement) {
      gameOverElement.style.display = 'none';
    }
    
    // Initialize
    this.init();
  }
  
  // Lose a life
  loseLife() {
    this.gameState.lives--;
    this.updateLives();
    
    // Screen shake effect
    this.effects.createScreenShake();
    
    // Temporary invincibility
    this.player.invincible = true;
    this.player.invincibleTimer = 120;
    
    // Check for game over
    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }
  
  // Game over
  gameOver() {
    this.gameState.isGameOver = true;
    
    // Create game over display
    const gameOverElement = document.createElement('div');
    gameOverElement.id = 'game-over';
    
    // Show final score and high score
    let gameOverText = `GAME OVER<br>`;
    gameOverText += `<span style="font-size: 24px">最終スコア: ${this.gameState.score}</span><br>`;
    
    if (this.gameState.score >= this.gameState.highScore) {
      gameOverText += `<span style="font-size: 24px; color: gold;">ハイスコア達成!</span><br>`;
    } else {
      gameOverText += `<span style="font-size: 24px">ハイスコア: ${this.gameState.highScore}</span><br>`;
    }
    
    gameOverText += `<span style="font-size: 20px">クリックしてリスタート</span>`;
    gameOverElement.innerHTML = gameOverText;
    
    document.body.appendChild(gameOverElement);
    
    // Click to restart
    document.addEventListener('click', () => this.resetGame(), { once: true });
  }
  
  // Toggle pause
  togglePause() {
    this.gameState.isPaused = !this.gameState.isPaused;
    document.getElementById('pauseOverlay').style.display = 
      this.gameState.isPaused ? 'flex' : 'none';
  }
  
  // Update UI elements
  updateLives() {
    document.getElementById('lives').textContent = '❤'.repeat(this.gameState.lives);
  }
  
  updateScore() {
    document.getElementById('score').textContent = `Score: ${this.gameState.score}`;
  }
  
  updateHighScore() {
    document.getElementById('highScore').textContent = `High Score: ${this.gameState.highScore}`;
  }
  
  updateLevel() {
    document.getElementById('level').textContent = `Level: ${this.gameState.level}`;
  }
  
  updatePowerUpStatus() {
    const statusElement = document.getElementById('powerUpStatus');
    if (this.player.powerUp) {
      const timeLeft = Math.ceil(this.player.powerUpTimer / 60);
      statusElement.textContent = `${this.powerUpTypes[this.player.powerUp].name}: ${timeLeft}秒`;
    } else {
      statusElement.textContent = '';
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
}); 