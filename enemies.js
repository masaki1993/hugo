// enemies.js - Enemy formations and behavior

// Enemy types definition
const ENEMY_TYPES = {
  BASIC: { color: 'red', health: 1, points: 10, size: 30 },
  SPEEDER: { color: 'blue', health: 1, points: 20, size: 25, speed: 2 },
  TANK: { color: '#ff6600', health: 3, points: 30, size: 40 },
  BOMBER: { color: '#cc00cc', health: 2, points: 40, size: 35 },
  ELITE: { color: '#00cc00', health: 4, points: 60, size: 40 },
  BOSS: { color: '#ff0066', health: 10, points: 100, size: 60 }
};

// Formation patterns
const FORMATION_PATTERNS = {
  ZIGZAG: 'zigzag',
  CIRCLE: 'circle',
  WAVE: 'wave',
  VSHAPE: 'vshape'
};

class Formation {
  constructor(level, canvas) {
    this.canvas = canvas;
    this.level = level;
    this.enemies = [];
    
    // Scale difficulty based on level according to requirements
    // Level 1: Slow, few enemies, low attack rate
    // Level 2: Normal, more enemies, normal attack rate
    // Level 3: Slightly fast, even more enemies, slightly high attack rate
    // Level 4: Fast, many enemies, high attack rate, special attacks
    // Level 5+: Very fast, many enemies, very high attack rate, boss
    
    // Base speed scaling
    if (level === 1) {
      this.baseSpeed = 0.3; // Slow
    } else if (level === 2) {
      this.baseSpeed = 0.5; // Normal
    } else if (level === 3) {
      this.baseSpeed = 0.7; // Slightly fast
    } else if (level === 4) {
      this.baseSpeed = 0.9; // Fast
    } else {
      this.baseSpeed = 1.1; // Very fast
    }
    
    // Attack interval scaling
    if (level === 1) {
      this.attackInterval = 2000; // Low attack rate
    } else if (level === 2) {
      this.attackInterval = 1500; // Normal attack rate
    } else if (level === 3) {
      this.attackInterval = 1200; // Slightly high attack rate
    } else if (level === 4) {
      this.attackInterval = 800; // High attack rate
    } else {
      this.attackInterval = 600; // Very high attack rate
    }
    
    this.movementTimer = 0;
    this.attackTimer = 0;
    
    this.isBossLevel = level % 5 === 0; // Boss every 5 levels
    this.direction = 1; // 1: right, -1: left
    this.dropDistance = 15;
    
    // Pattern selection based on level
    if (level === 1) {
      this.pattern = 'ZIGZAG'; // Basic movement for level 1
    } else if (level === 2) {
      this.pattern = 'WAVE'; // Horizontal back and forth for level 2
    } else if (level === 3) {
      this.pattern = 'CIRCLE'; // Random high-speed movement for level 3
    } else {
      this.pattern = 'VSHAPE'; // Complex pattern for level 4+
    }
    
    // Create the formation based on level type
    if (this.isBossLevel) {
      this.createBossFormation();
    } else {
      this.createFormation();
    }
    
    console.log(`Level ${level} formation created with ${this.enemies.length} enemies. Boss level: ${this.isBossLevel}`);
  }
  
  // Select formation pattern based on level
  selectPattern(level) {
    const patterns = ['ZIGZAG', 'CIRCLE', 'WAVE', 'VSHAPE'];
    return patterns[(level - 1) % patterns.length];
  }
  
  // Create standard enemy formation
  createFormation() {
    // Scale number of enemies based on level
    let rows, cols;
    
    if (this.level === 1) {
      // Level 1: Few enemies
      rows = 3;
      cols = 6;
    } else if (this.level === 2) {
      // Level 2: More enemies
      rows = 4;
      cols = 8;
    } else if (this.level === 3) {
      // Level 3: Even more enemies
      rows = 5;
      cols = 9;
    } else {
      // Level 4+: Many enemies
      rows = 5;
      cols = 10;
    }
    
    console.log(`Creating formation with ${rows} rows and ${cols} columns for level ${this.level}`);
    
    const startX = (this.canvas.width - (cols * 40)) / 2;
    const spacing = 40;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Enemy position
        const x = startX + col * spacing;
        const y = 50 + row * spacing;
        
        // Determine enemy type based on row and level
        let type, color, health, points, size;
        
        if (row === 0) {
          // Top row - stronger enemies
          type = this.level >= 3 ? 'ELITE' : 'TANK';
          color = type === 'ELITE' ? '#9900ff' : '#ff6600';
          health = Math.floor(1 + this.level * 0.3);
          points = 100 + this.level * 20;
          size = { width: 30, height: 30 };
        } else if (row === rows - 1) {
          // Bottom row - fast enemies
          type = 'SPEEDER';
          color = '#00ccff';
          health = Math.max(1, Math.floor(this.level * 0.2));
          points = 50 + this.level * 10;
          size = { width: 25, height: 20 };
        } else if (row === Math.floor(rows / 2)) {
          // Middle row - bombers
          type = this.level >= 2 ? 'BOMBER' : 'BASIC';
          color = type === 'BOMBER' ? '#ff00cc' : '#ff0000';
          health = Math.floor(1 + this.level * 0.2);
          points = 75 + this.level * 15;
          size = { width: 28, height: 28 };
        } else {
          // Other rows - basic enemies
          type = 'BASIC';
          color = '#ff0000';
          health = Math.max(1, Math.floor(1 + this.level * 0.1));
          points = 50 + this.level * 5;
          size = { width: 25, height: 25 };
        }
        
        // Add random high-speed movement in Level 3+
        let randomSpeedBoost = 0;
        if (this.level >= 3 && Math.random() < 0.2) {
          randomSpeedBoost = 0.5; // Some enemies move faster in level 3+
        }
        
        // Add special laser attack capability in Level 4+
        const canFireLaser = this.level >= 4 && row === 0 && Math.random() < 0.3;
        
        // Create enemy object
        const enemy = {
          x: x,
          y: y,
          width: size.width,
          height: size.height,
          speed: this.baseSpeed + randomSpeedBoost,
          color: color,
          health: health,
          maxHealth: health,
          points: points,
          type: type,
          isBoss: false,
          row: row,
          col: col,
          originalX: x,
          originalY: y,
          lastShot: 0,
          shotInterval: 2000 + Math.random() * 3000,
          canFireLaser: canFireLaser
        };
        
        this.enemies.push(enemy);
      }
    }
  }
  
  // Create boss formation
  createBossFormation() {
    console.log(`Creating boss formation for level ${this.level}`);
    
    // Boss health scales with level
    const bossHealth = 15 + (this.level * 3); // Reduced health (was 20 + this.level * 5)
    
    // Create boss enemy
    const bossEnemy = {
      x: this.canvas.width / 2 - 60,
      y: 80,
      width: 120,
      height: 120,
      color: '#ff0066',
      health: bossHealth,
      maxHealth: bossHealth,
      points: 500 * Math.floor(this.level / 5),
      type: 'BOSS',
      isBoss: true,
      lastShot: 0,
      shotInterval: 1000 - Math.min(500, this.level * 50),
      attackPattern: 0
    };
    
    this.enemies.push(bossEnemy);
    
    // Add guard enemies around boss
    const guardCount = Math.min(8, 4 + Math.floor(this.level / 5));
    
    for (let i = 0; i < guardCount; i++) {
      const angle = (i / guardCount) * Math.PI * 2;
      const distance = 150;
      
      // Determine guard type based on level
      let guardType, guardColor, guardHealth;
      
      if (this.level >= 10) {
        guardType = 'ELITE';
        guardColor = '#9900ff';
        guardHealth = Math.max(2, Math.floor(this.level * 0.2)); // Reduced health
      } else if (this.level >= 5) {
        guardType = 'BOMBER';
        guardColor = '#ff00cc';
        guardHealth = Math.max(1, Math.floor(this.level * 0.15)); // Reduced health
      } else {
        guardType = 'TANK';
        guardColor = '#ff6600';
        guardHealth = Math.max(1, Math.floor(this.level * 0.1)); // Reduced health
      }
      
      // Create guard enemy
      const guardEnemy = {
        x: bossEnemy.x + Math.cos(angle) * distance + 60 - 15,
        y: bossEnemy.y + Math.sin(angle) * distance + 60 - 15,
        width: 30,
        height: 30,
        color: guardColor,
        health: guardHealth,
        maxHealth: guardHealth,
        points: 100 + (this.level * 10),
        type: guardType,
        isBoss: false,
        orbitAngle: angle,
        orbitDistance: distance,
        orbitCenter: { x: bossEnemy.x + 60, y: bossEnemy.y + 60 },
        lastShot: 0,
        shotInterval: 2000 + Math.random() * 2000
      };
      
      this.enemies.push(guardEnemy);
    }
    
    console.log(`Created boss with ${guardCount} guards. Boss health: ${bossHealth}`);
  }
  
  // Update formation movement and attacks
  update(elapsedTime, enemyBeams) {
    if (this.enemies.length === 0) return;
    
    this.movementTimer += elapsedTime;
    this.attackTimer += elapsedTime;
    
    // Update movement based on formation type
    if (this.isBossLevel) {
      this.updateBossFormation(elapsedTime, enemyBeams);
    } else {
      this.updateNormalFormation(elapsedTime);
    }
    
    // Handle enemy attacks
    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      this.enemyAttack(enemyBeams);
    }
  }
  
  // Update boss formation
  updateBossFormation(elapsedTime, enemyBeams) {
    const boss = this.enemies.find(e => e.isBoss);
    if (!boss) return;
    
    // Boss movement - slow sine wave
    boss.x += Math.sin(Date.now() / 1000) * 2;
    
    // Boss attack
    if (Date.now() - boss.lastShot > boss.shotInterval) {
      // Different attack patterns based on boss health
      if (boss.health < boss.maxHealth * 0.3) {
        // Low health - 8-way attack
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          enemyBeams.push({
            x: boss.x + boss.width/2 + Math.cos(angle) * 30,
            y: boss.y + boss.height/2 + Math.sin(angle) * 30,
            width: 10,
            height: 20,
            speed: 5,
            angle: angle,
            color: '#ff3300',
            damage: 2
          });
        }
      } else if (boss.health < boss.maxHealth * 0.7) {
        // Medium health - 3-way attack
        for (let i = 0; i < 3; i++) {
          const angle = Math.PI/2 + (i - 1) * Math.PI/4;
          enemyBeams.push({
            x: boss.x + boss.width/2,
            y: boss.y + boss.height,
            width: 15,
            height: 25,
            speed: 6,
            angle: angle,
            color: '#ff3300',
            damage: 2
          });
        }
      } else {
        // Full health - single powerful attack
        enemyBeams.push({
          x: boss.x + boss.width/2,
          y: boss.y + boss.height,
          width: 20,
          height: 30,
          speed: 7,
          color: '#ff3300',
          damage: 3
        });
      }
      
      boss.lastShot = Date.now();
    }
    
    // Update guard enemies
    this.enemies.filter(e => !e.isBoss).forEach(guard => {
      if (guard.orbitCenter) {
        // Orbit around boss
        guard.orbitAngle += 0.01;
        guard.x = guard.orbitCenter.x + Math.cos(guard.orbitAngle) * guard.orbitDistance - guard.width/2;
        guard.y = guard.orbitCenter.y + Math.sin(guard.orbitAngle) * guard.orbitDistance - guard.height/2;
        
        // Periodic attacks
        if (Date.now() - guard.lastShot > guard.shotInterval) {
          // Attack pattern based on guard type
          if (guard.type === 'ELITE') {
            // 3-way attack
            for (let i = -1; i <= 1; i++) {
              enemyBeams.push({
                x: guard.x + guard.width/2 + i * 10,
                y: guard.y + guard.height,
                width: 6,
                height: 15,
                speed: 6,
                color: guard.color,
                damage: 1
              });
            }
          } else if (guard.type === 'BOMBER') {
            // Explosive attack
            enemyBeams.push({
              x: guard.x + guard.width/2,
              y: guard.y + guard.height,
              width: 8,
              height: 8,
              speed: 5,
              isExplosive: true,
              color: guard.color,
              damage: 1
            });
          } else {
            // Standard attack
            enemyBeams.push({
              x: guard.x + guard.width/2,
              y: guard.y + guard.height,
              width: 5,
              height: 15,
              speed: 6,
              color: guard.color,
              damage: 1
            });
          }
          
          guard.lastShot = Date.now();
        }
      }
    });
  }
  
  // Update standard formation
  updateNormalFormation(elapsedTime) {
    // Find leftmost and rightmost enemies
    let leftMost = this.canvas.width;
    let rightMost = 0;
    
    this.enemies.forEach(enemy => {
      leftMost = Math.min(leftMost, enemy.x);
      rightMost = Math.max(rightMost, enemy.x + enemy.width);
    });
    
    // Change direction and drop when hitting screen edge
    if (rightMost >= this.canvas.width - 20 || leftMost <= 20) {
      this.direction *= -1;
      this.enemies.forEach(enemy => {
        enemy.y += this.dropDistance;
      });
    }
    
    // Enemies move faster as their numbers decline
    const initialEnemyCount = 45;
    const speedMultiplier = 1 + (1 - this.enemies.length / initialEnemyCount) * 3;
    const moveSpeed = this.baseSpeed * speedMultiplier;
    
    // Apply movement pattern
    switch (this.pattern) {
      case 'ZIGZAG':
        this.updateZigzagPattern(elapsedTime, moveSpeed);
        break;
      case 'CIRCLE':
        this.updateCirclePattern(elapsedTime, moveSpeed);
        break;
      case 'WAVE':
        this.updateWavePattern(elapsedTime, moveSpeed);
        break;
      case 'VSHAPE':
        this.updateVShapePattern(elapsedTime, moveSpeed);
        break;
      default:
        // Default horizontal movement
        this.enemies.forEach(enemy => {
          enemy.x += this.direction * moveSpeed;
        });
    }
  }
  
  // ZigZag movement pattern
  updateZigzagPattern(elapsedTime, moveSpeed) {
    const time = Date.now();
    this.enemies.forEach(enemy => {
      enemy.x += this.direction * moveSpeed;
      enemy.y += Math.sin(time / 500 + enemy.col * 0.5) * 0.5;
    });
  }
  
  // Circular movement pattern
  updateCirclePattern(elapsedTime, moveSpeed) {
    const time = Date.now();
    this.enemies.forEach(enemy => {
      const radius = 20;
      const angle = time / 1000 + enemy.col * 0.3;
      enemy.x = enemy.originalX + this.direction * moveSpeed * (elapsedTime / 16) + Math.cos(angle) * radius;
      enemy.y = enemy.originalY + Math.sin(angle) * radius;
    });
  }
  
  // Wave movement pattern
  updateWavePattern(elapsedTime, moveSpeed) {
    const time = Date.now();
    this.enemies.forEach(enemy => {
      enemy.x += this.direction * moveSpeed;
      const waveHeight = 10 + enemy.row * 3;
      enemy.y = enemy.originalY + Math.sin(time / 500 + enemy.col * 0.3) * waveHeight;
    });
  }
  
  // V-shape movement pattern
  updateVShapePattern(elapsedTime, moveSpeed) {
    const centerCol = 4; // Middle column of 9
    this.enemies.forEach(enemy => {
      enemy.x += this.direction * moveSpeed;
      const distFromCenter = Math.abs(enemy.col - centerCol);
      enemy.y = enemy.originalY + distFromCenter * 5 + Math.sin(Date.now() / 800) * 5;
    });
  }
  
  // Enemy attack function
  enemyAttack(enemyBeams) {
    this.enemies.forEach(enemy => {
      if (enemy.isBoss) return; // Boss has separate attack logic
      
      // Calculate attack probability
      let attackChance = 0.1; // Base chance
      
      // Front row enemies attack more frequently
      const isInFrontRow = !this.enemies.some(e => 
        e.col === enemy.col && e.row > enemy.row
      );
      
      if (isInFrontRow) {
        attackChance *= 2; // Lower multiplier from 3 to 2
      }
      
      // Attack chance based on enemy type
      switch (enemy.type) {
        case 'ELITE':
          attackChance *= 1.5; // Lower multiplier from 2 to 1.5
          break;
        case 'BOMBER':
          attackChance *= 1.2; // Lower multiplier from 1.5 to 1.2
          break;
        case 'TANK':
          attackChance *= 1.2; // Lower multiplier from 1.5 to 1.2
          break;
        case 'SPEEDER':
          attackChance *= 1.1; // Lower multiplier from 1.2 to 1.1
          break;
      }
      
      // Implement level-based attack frequency increase
      attackChance *= 1 + (this.level * 0.1);
      
      // Attempt attack based on chance
      if (Math.random() < attackChance) {
        // Check for special laser attack (Level 4+)
        if (enemy.canFireLaser && this.level >= 4) {
          // Special laser beam attack
          const laserBeam = {
            x: enemy.x,
            y: enemy.y + enemy.height,
            width: enemy.width,
            height: this.canvas.height - enemy.y - enemy.height,
            speed: 0, // Stationary
            color: '#FF3300',
            damage: 2,
            isLaser: true,
            lifetime: 60 // Frames the laser lasts
          };
          enemyBeams.push(laserBeam);
          
          // Visual laser charging effect
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              const warningBeam = {
                x: enemy.x + enemy.width/2 - 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: this.canvas.height - enemy.y - enemy.height,
                isWarning: true,
                color: 'rgba(255, 0, 0, 0.3)',
                lifetime: 5
              };
              enemyBeams.push(warningBeam);
            }, i * 100);
          }
        }
        // Generate attack based on enemy type
        else if (enemy.type === 'ELITE') {
          // 3-way attack
          for (let i = -1; i <= 1; i++) {
            enemyBeams.push({
              x: enemy.x + enemy.width/2 + i * 10,
              y: enemy.y + enemy.height,
              width: 6,
              height: 15,
              speed: 6,
              color: enemy.color,
              damage: 1
            });
          }
        } else if (enemy.type === 'BOMBER') {
          // Explosive attack
          enemyBeams.push({
            x: enemy.x + enemy.width/2,
            y: enemy.y + enemy.height,
            width: 8,
            height: 8,
            speed: 4,
            isExplosive: true,
            color: enemy.color,
            damage: 1
          });
        } else if (enemy.type === 'TANK') {
          // Powerful single shot
          enemyBeams.push({
            x: enemy.x + enemy.width/2,
            y: enemy.y + enemy.height,
            width: 8,
            height: 20,
            speed: 5,
            color: enemy.color,
            damage: 2
          });
        } else if (enemy.type === 'SPEEDER') {
          // Fast attack
          enemyBeams.push({
            x: enemy.x + enemy.width/2,
            y: enemy.y + enemy.height,
            width: 4,
            height: 12,
            speed: 8,
            color: enemy.color,
            damage: 1
          });
        } else {
          // Standard attack
          enemyBeams.push({
            x: enemy.x + enemy.width/2,
            y: enemy.y + enemy.height,
            width: 5,
            height: 15,
            speed: 5,
            color: enemy.color,
            damage: 1
          });
        }
      }
    });
  }
  
  // Draw all enemies
  draw(ctx) {
    this.enemies.forEach(enemy => {
      this.drawEnemy(ctx, enemy);
    });
  }
  
  // Draw individual enemy
  drawEnemy(ctx, enemy) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = enemy.color;
    
    if (enemy.isBoss) {
      this.drawBoss(ctx, enemy);
    } else {
      this.drawRegularEnemy(ctx, enemy);
    }
    
    ctx.restore();
    
    // Draw health bar
    this.drawHealthBar(ctx, enemy);
  }
  
  // Draw boss enemy
  drawBoss(ctx, enemy) {
    const centerX = enemy.x + enemy.width/2;
    const centerY = enemy.y + enemy.height/2;
    
    // Boss body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, enemy.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Boss core
    const coreGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, enemy.width/4
    );
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.2, '#ff00ff');
    coreGradient.addColorStop(1, enemy.color);
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, enemy.width/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Boss decorations
    ctx.fillStyle = '#333333';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        centerX + Math.cos(angle) * enemy.width/2.5,
        centerY + Math.sin(angle) * enemy.width/2.5,
        enemy.width/10,
        0, Math.PI * 2
      );
      ctx.fill();
    }
    
    // Energy wave
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    const waveSize = enemy.width/2 + 10 + Math.sin(Date.now() / 200) * 5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, waveSize, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Draw regular enemy based on type
  drawRegularEnemy(ctx, enemy) {
    switch(enemy.type) {
      case 'TANK':
        this.drawTankEnemy(ctx, enemy);
        break;
      case 'BOMBER':
        this.drawBomberEnemy(ctx, enemy);
        break;
      case 'ELITE':
        this.drawEliteEnemy(ctx, enemy);
        break;
      case 'SPEEDER':
        this.drawSpeederEnemy(ctx, enemy);
        break;
      default:
        this.drawBasicEnemy(ctx, enemy);
    }
  }
  
  // Draw tank-type enemy
  drawTankEnemy(ctx, enemy) {
    const centerX = enemy.x + enemy.width/2;
    const centerY = enemy.y + enemy.height/2;
    const radius = enemy.width/2;
    
    // Hexagonal body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Core
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Turret
    ctx.fillStyle = '#333333';
    ctx.fillRect(centerX - radius/4, centerY - radius, radius/2, radius/2);
  }
  
  // Draw bomber-type enemy
  drawBomberEnemy(ctx, enemy) {
    const centerX = enemy.x + enemy.width/2;
    const centerY = enemy.y + enemy.height/2;
    const radius = enemy.width/2;
    
    // Diamond body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX + radius, centerY);
    ctx.lineTo(centerX, centerY + radius);
    ctx.lineTo(centerX - radius, centerY);
    ctx.closePath();
    ctx.fill();
    
    // Pulsing core
    const pulseSize = 0.6 + Math.sin(Date.now() / 200) * 0.2;
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * pulseSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Corner decorations
    ctx.fillStyle = '#ff00ff';
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.arc(
        centerX + Math.cos(angle) * radius * 0.7,
        centerY + Math.sin(angle) * radius * 0.7,
        radius * 0.15,
        0, Math.PI * 2
      );
      ctx.fill();
    }
  }
  
  // Draw elite-type enemy
  drawEliteEnemy(ctx, enemy) {
    const centerX = enemy.x + enemy.width/2;
    const centerY = enemy.y + enemy.height/2;
    const radius = enemy.width/2;
    
    // Octagonal body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Glowing core
    const coreGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius * 0.4
    );
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.5, '#00ff00');
    coreGradient.addColorStop(1, enemy.color);
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Energy field
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    const pulseSize = radius * (0.8 + Math.sin(Date.now() / 150) * 0.2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
    ctx.stroke();
    
    // Weapon pods
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.fillStyle = '#006600';
      ctx.beginPath();
      ctx.arc(
        centerX + Math.cos(angle) * radius * 0.7,
        centerY + Math.sin(angle) * radius * 0.7,
        radius * 0.15,
        0, Math.PI * 2
      );
      ctx.fill();
    }
  }
  
  // Draw speeder-type enemy
  drawSpeederEnemy(ctx, enemy) {
    ctx.fillStyle = enemy.color;
    
    // Elongated body
    ctx.beginPath();
    ctx.ellipse(
      enemy.x + enemy.width/2, 
      enemy.y + enemy.height/2, 
      enemy.width/2, 
      enemy.height/4, 
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Pointed front
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y + enemy.height/2);
    ctx.lineTo(enemy.x + enemy.width/2, enemy.y);
    ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height/2);
    ctx.closePath();
    ctx.fill();
    
    // Engine
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(enemy.x + enemy.width/2, enemy.y + enemy.height * 0.7, enemy.width/5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw basic-type enemy
  drawBasicEnemy(ctx, enemy) {
    ctx.fillStyle = enemy.color;
    
    // UFO body
    ctx.beginPath();
    ctx.ellipse(
      enemy.x + enemy.width/2, 
      enemy.y + enemy.height/2, 
      enemy.width/2, 
      enemy.height/3, 
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // UFO dome
    ctx.beginPath();
    ctx.ellipse(
      enemy.x + enemy.width/2, 
      enemy.y + enemy.height/3, 
      enemy.width/3, 
      enemy.height/4, 
      0, 0, Math.PI
    );
    ctx.fillStyle = 'rgba(200, 200, 255, 0.7)';
    ctx.fill();
    
    // UFO lights
    const time = Date.now() / 300;
    for (let i = 0; i < 3; i++) {
      const angle = time + (i * Math.PI * 2) / 3;
      const lightX = enemy.x + enemy.width/2 + Math.cos(angle) * enemy.width/3;
      const lightY = enemy.y + enemy.height/2 + Math.sin(angle) * enemy.height/6;
      
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(lightX, lightY, enemy.width/10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Draw health bar for enemy
  drawHealthBar(ctx, enemy) {
    const healthPercentage = enemy.health / enemy.maxHealth;
    
    if (enemy.isBoss) {
      // Boss health bar at top of screen
      const barWidth = this.canvas.width * 0.6;
      const barX = (this.canvas.width - barWidth) / 2;
      const barY = 50;
      const barHeight = 15;
      
      // Background
      ctx.fillStyle = 'rgba(50, 50, 50, 0.7)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Health
      let barColor;
      if (healthPercentage > 0.6) barColor = '#00ff00';
      else if (healthPercentage > 0.3) barColor = '#ffff00';
      else barColor = '#ff0000';
      
      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
      
      // Label
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', this.canvas.width/2, barY + barHeight + 15);
    } else {
      // Regular enemy health bar
      ctx.fillStyle = 'rgba(50, 50, 50, 0.7)';
      ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 5);
      
      let barColor;
      if (healthPercentage > 0.6) barColor = '#00ff00';
      else if (healthPercentage > 0.3) barColor = '#ffff00';
      else barColor = '#ff0000';
      
      ctx.fillStyle = barColor;
      ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * healthPercentage, 5);
    }
  }
}

// Export the Formation class and enemy types
window.Formation = Formation;
window.ENEMY_TYPES = ENEMY_TYPES;
window.FORMATION_PATTERNS = FORMATION_PATTERNS; 