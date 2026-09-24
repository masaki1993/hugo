import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x8ec8ef)
scene.fog = new THREE.Fog(0x8ec8ef, 18, 46)

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100)
camera.position.set(1.15, 1.8, -5.6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.12
document.body.appendChild(renderer.domElement)

scene.add(new THREE.HemisphereLight(0xfff4e4, 0x3d6a34, 1.35))
const sun = new THREE.DirectionalLight(0xfff6ea, 2.6)
sun.position.set(-6, 10, -4)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 30
sun.shadow.camera.left = -8
sun.shadow.camera.right = 8
sun.shadow.camera.top = 8
sun.shadow.camera.bottom = -8
scene.add(sun)
const rim = new THREE.DirectionalLight(0xffc9a0, 1.35)
rim.position.set(4, 6, 6)
scene.add(rim)

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(35, 72),
  new THREE.MeshStandardMaterial({ color: 0x6f9b4e, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

for (const [x, z, s] of [[-5, 4, 1.15], [5.5, 6, 1.4], [-8, 9, 1.6], [8, 11, 1.2]]) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 1.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x60452d })
  )
  trunk.position.set(x, 0.75, z)
  trunk.castShadow = true
  scene.add(trunk)
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15 * s, 1),
    new THREE.MeshStandardMaterial({ color: 0x386b3b, roughness: 1 })
  )
  crown.position.set(x, 2.05, z)
  crown.castShadow = true
  scene.add(crown)
}

const gradientMap = (() => {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 1
  const g = c.getContext('2d')
  ;['#3a3a3a', '#7a7a7a', '#c8c8c8', '#ffffff'].forEach((col, i) => {
    g.fillStyle = col
    g.fillRect(i, 0, 1, 1)
  })
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.colorSpace = THREE.NoColorSpace
  return tex
})()

const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap })
const metal = (color, roughness = 0.32) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.72, roughness })

const C = {
  skin: toon(0xf2c4a2),
  hair: toon(0x5c371f),
  hairDark: toon(0x3d2414),
  tunic: toon(0x2b62b5),
  tunicDeep: toon(0x1d4a8c),
  shorts: toon(0x6e4a30),
  cape: toon(0xd23b32),
  capeEdge: toon(0xf0d48a),
  boot: toon(0x3c2818),
  belt: toon(0x5a3a24),
  glove: toon(0x6a4630),
  eye: toon(0x3a2618),
  mouth: toon(0xc46a62),
  gold: metal(0xe6b84a, 0.28),
  steel: metal(0xdfe6ee, 0.22),
  white: new THREE.MeshBasicMaterial({ color: 0xfffdf8 }),
  pupil: new THREE.MeshBasicMaterial({ color: 0x140e0a })
}

function addMesh(parent, geo, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function faceTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')
  const eye = (cx, cy) => {
    g.fillStyle = '#fffdf8'
    g.beginPath()
    g.ellipse(cx, cy, 34, 42, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#3a2618'
    g.lineWidth = 4
    g.stroke()
    g.fillStyle = '#5a341c'
    g.beginPath()
    g.ellipse(cx, cy + 4, 16, 20, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#140e0a'
    g.beginPath()
    g.arc(cx, cy + 6, 8, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(cx - 8, cy - 8, 6, 0, Math.PI * 2)
    g.fill()
  }
  eye(78, 108)
  eye(178, 108)
  g.strokeStyle = '#3d2414'
  g.lineWidth = 9
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(46, 58)
  g.quadraticCurveTo(78, 40, 114, 62)
  g.stroke()
  g.beginPath()
  g.moveTo(210, 58)
  g.quadraticCurveTo(178, 40, 142, 62)
  g.stroke()
  g.fillStyle = 'rgba(226, 118, 108, 0.4)'
  g.beginPath()
  g.ellipse(52, 162, 18, 10, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.ellipse(204, 162, 18, 10, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#c45b58'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(110, 196)
  g.quadraticCurveTo(128, 214, 146, 196)
  g.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function capeGeometry() {
  const segX = 10
  const segY = 12
  const positions = []
  const indices = []
  for (let y = 0; y <= segY; y++) {
    const v = y / segY
    const yy = -1.28 * v
    const halfW = THREE.MathUtils.lerp(0.46, 0.98, Math.pow(v, 0.75))
    for (let x = 0; x <= segX; x++) {
      const u = x / segX
      const side = Math.abs(u - 0.5) * 2
      const xx = THREE.MathUtils.lerp(-halfW, halfW, u)
      const zz = 0.06 + v * 0.16 + side * side * 0.08
      positions.push(xx, yy, zz)
    }
  }
  for (let y = 0; y < segY; y++) {
    for (let x = 0; x < segX; x++) {
      const a = y * (segX + 1) + x
      const b = a + 1
      const c = a + (segX + 1)
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function buildHero() {
  const root = new THREE.Group()
  root.name = 'SuperJuniorV2'
  const tilt = new THREE.Group()
  root.add(tilt)

  const shorts = addMesh(tilt, new THREE.CapsuleGeometry(0.24, 0.16, 4, 12), C.shorts, 0, 0.9, 0)
  shorts.scale.set(1.35, 1, 0.95)

  const tunicPts = []
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    const flare = t < 0.18 ? 0.34 + (0.18 - t) * 0.55 : 0.3 + Math.sin(t * Math.PI) * 0.05
    tunicPts.push(new THREE.Vector2(flare, t * 0.62))
  }
  const tunic = addMesh(tilt, new THREE.LatheGeometry(tunicPts, 24), C.tunic, 0, 0.98, 0)
  tunic.castShadow = true

  addMesh(tilt, new THREE.TorusGeometry(0.3, 0.045, 8, 24), C.belt, 0, 1.08, 0).rotation.x = Math.PI / 2
  addMesh(tilt, new THREE.BoxGeometry(0.16, 0.13, 0.05), C.gold, 0, 1.08, -0.3)
  addMesh(tilt, new THREE.BoxGeometry(0.62, 0.045, 0.34), C.gold, 0, 1.0, -0.02)

  const collar = addMesh(tilt, new THREE.TorusGeometry(0.16, 0.035, 8, 18, Math.PI), C.gold, 0, 1.58, -0.08)
  collar.rotation.x = 0.5
  collar.rotation.z = Math.PI

  addMesh(tilt, new THREE.CylinderGeometry(0.11, 0.13, 0.12, 12), C.skin, 0, 1.62, 0)

  const head = new THREE.Group()
  head.position.set(0, 1.96, 0)
  tilt.add(head)
  addMesh(head, new THREE.SphereGeometry(0.36, 28, 20), C.skin, 0, 0, 0)

  const hair = addMesh(
    head,
    new THREE.SphereGeometry(0.39, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.46),
    C.hair,
    0, 0.14, 0.02
  )
  hair.scale.set(1.05, 0.78, 1.06)

  const spikes = [
    [-0.2, 0.36, -0.04, 1],
    [0.0, 0.42, -0.02, 1.2],
    [0.2, 0.36, 0.0, 1],
    [-0.32, 0.24, 0.02, 0.75],
    [0.32, 0.22, 0.04, 0.75],
    [-0.1, 0.3, 0.12, 0.6],
    [0.12, 0.28, 0.14, 0.55]
  ]
  for (const [x, y, z, s] of spikes) {
    const spike = addMesh(head, new THREE.ConeGeometry(0.1, 0.32, 8), C.hairDark, x, y, z)
    spike.scale.set(s, 1, s * 0.75)
    spike.rotation.z = -x * 0.7
    spike.rotation.x = -0.15
  }
  for (const x of [-0.18, 0, 0.18]) {
    const bang = addMesh(head, new THREE.SphereGeometry(0.09, 12, 10), C.hair, x, 0.2, -0.24)
    bang.scale.set(1.15, 0.7, 0.55)
  }

  addMesh(head, new THREE.SphereGeometry(0.07, 12, 8), C.skin, -0.34, -0.02, -0.04).scale.z = 0.55
  addMesh(head, new THREE.SphereGeometry(0.07, 12, 8), C.skin, 0.34, -0.02, -0.04).scale.z = 0.55

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true, depthWrite: false })
  )
  face.position.set(0, 0.02, -0.47)
  face.scale.set(0.82, 0.82, 1)
  face.rotation.y = Math.PI
  face.renderOrder = 5
  face.name = 'face'
  head.add(face)

  const capePivot = new THREE.Group()
  capePivot.position.set(0, 1.58, 0.12)
  tilt.add(capePivot)
  const scarf = addMesh(capePivot, new THREE.TorusGeometry(0.2, 0.055, 8, 16), C.cape, 0, 0.02, -0.08)
  scarf.rotation.x = Math.PI / 2
  const capeGeo = capeGeometry()
  const capeBase = Float32Array.from(capeGeo.attributes.position.array)
  const capeMat = C.cape.clone()
  capeMat.side = THREE.DoubleSide
  const cape = addMesh(capePivot, capeGeo, capeMat)
  const tail = addMesh(capePivot, new THREE.CapsuleGeometry(0.06, 0.42, 3, 8), C.cape, -0.34, -0.22, 0.02)
  tail.rotation.z = 0.45
  tail.rotation.x = -0.4

  function limb(side) {
    const arm = new THREE.Group()
    arm.position.set(0.4 * side, 1.5, 0)
    tilt.add(arm)
    const upper = addMesh(arm, new THREE.CapsuleGeometry(0.075, 0.22, 4, 10), C.tunicDeep, 0, -0.18, 0)
    upper.scale.x = 1.15
    const fore = new THREE.Group()
    fore.position.y = -0.36
    arm.add(fore)
    addMesh(fore, new THREE.CapsuleGeometry(0.065, 0.2, 4, 10), C.skin, 0, -0.14, 0)
    const hand = addMesh(fore, new THREE.SphereGeometry(0.085, 14, 12), C.glove, 0, -0.32, -0.02)
    return { arm, fore, hand }
  }
  const right = limb(1)
  const left = limb(-1)
  right.arm.rotation.z = 2.35
  right.arm.rotation.x = 0.15
  left.arm.rotation.z = -0.45
  left.arm.rotation.x = 0.15

  const sword = new THREE.Group()
  right.hand.add(sword)
  sword.position.set(0.02, -0.02, -0.04)
  sword.rotation.x = 0.15
  sword.rotation.z = Math.PI - 0.35
  const bladeShape = new THREE.Shape()
  bladeShape.moveTo(-0.045, 0)
  bladeShape.lineTo(0.045, 0)
  bladeShape.lineTo(0.05, 0.62)
  bladeShape.lineTo(0, 0.78)
  bladeShape.lineTo(-0.05, 0.62)
  bladeShape.closePath()
  const blade = addMesh(
    sword,
    new THREE.ExtrudeGeometry(bladeShape, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 }),
    C.steel
  )
  blade.position.z = -0.012
  addMesh(sword, new THREE.BoxGeometry(0.28, 0.045, 0.06), C.gold, 0, -0.02, 0)
  addMesh(sword, new THREE.CylinderGeometry(0.03, 0.032, 0.2, 8), C.belt, 0, -0.14, 0)
  addMesh(sword, new THREE.SphereGeometry(0.045, 10, 8), C.gold, 0, -0.26, 0)

  const shieldShape = new THREE.Shape()
  shieldShape.moveTo(0, 0.34)
  shieldShape.lineTo(0.26, 0.2)
  shieldShape.lineTo(0.26, -0.02)
  shieldShape.quadraticCurveTo(0.24, -0.28, 0, -0.42)
  shieldShape.quadraticCurveTo(-0.24, -0.28, -0.26, -0.02)
  shieldShape.lineTo(-0.26, 0.2)
  shieldShape.closePath()
  const shield = addMesh(
    left.fore,
    new THREE.ExtrudeGeometry(shieldShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 1 }),
    C.tunic
  )
  shield.position.set(-0.5, 1.08, -0.28)
  shield.rotation.set(0, Math.PI, 0)
  tilt.add(shield)
  left.fore.remove(shield)
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xe6b84a })
  const crossV = addMesh(shield, new THREE.BoxGeometry(0.045, 0.4, 0.02), crossMat, 0, -0.02, 0.055)
  const crossH = addMesh(shield, new THREE.BoxGeometry(0.26, 0.045, 0.02), crossMat, 0, 0.04, 0.055)
  crossV.castShadow = false
  crossH.castShadow = false

  function leg(side) {
    const pivot = new THREE.Group()
    pivot.position.set(0.15 * side, 0.86, 0)
    tilt.add(pivot)
    addMesh(pivot, new THREE.CapsuleGeometry(0.09, 0.28, 4, 10), C.skin, 0, -0.2, 0)
    const boot = addMesh(pivot, new THREE.CapsuleGeometry(0.11, 0.16, 4, 10), C.boot, 0, -0.5, -0.03)
    boot.scale.set(1.05, 1, 1.25)
    addMesh(pivot, new THREE.BoxGeometry(0.2, 0.08, 0.28), C.boot, 0, -0.62, -0.06)
    addMesh(pivot, new THREE.TorusGeometry(0.105, 0.012, 6, 12), C.gold, 0, -0.4, -0.02).rotation.x = Math.PI / 2
    return pivot
  }

  return {
    root,
    tilt,
    head,
    capePivot,
    cape,
    capeBase,
    rightArm: right.arm,
    leftArm: left.arm,
    leftLeg: leg(-1),
    rightLeg: leg(1),
    restArm: { x: 0.15, z: 2.35 }
  }
}

const hero = buildHero()
scene.add(hero.root)

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2a160f, side: THREE.BackSide })
const outlined = []
hero.root.traverse((obj) => {
  if (!obj.isMesh || obj.name === 'face') return
  if (obj.material && obj.material.transparent) return
  outlined.push(obj)
})
for (const obj of outlined) {
  const shell = new THREE.Mesh(obj.geometry, outlineMat)
  shell.name = 'outline'
  shell.scale.setScalar(1.04)
  shell.castShadow = false
  shell.receiveShadow = false
  obj.add(shell)
}

const status = document.querySelector('#status')
const keys = new Set()
let facing = new THREE.Vector3(0, 0, -1)
let dash = null
let attack = null
let walkPhase = 0
const clock = new THREE.Clock()

const barrier = new THREE.Mesh(
  new THREE.SphereGeometry(1.15, 28, 18),
  new THREE.MeshPhysicalMaterial({
    color: 0x58c7ff,
    transparent: true,
    opacity: 0.22,
    roughness: 0.12,
    transmission: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false
  })
)
barrier.position.y = 1.15
barrier.visible = false
hero.root.add(barrier)

addEventListener('keydown', (e) => {
  keys.add(e.code)
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
  if (e.code === 'KeyT' && !e.repeat) startDash()
  if (e.code === 'KeyL' && !e.repeat) startAttack()
})
addEventListener('keyup', (e) => keys.delete(e.code))
addEventListener('blur', () => keys.clear())

function movementInput() {
  const v = new THREE.Vector3()
  if (keys.has('KeyW') || keys.has('ArrowUp')) v.z -= 1
  if (keys.has('KeyZ') || keys.has('ArrowDown')) v.z += 1
  if (keys.has('KeyA') || keys.has('ArrowLeft')) v.x -= 1
  if (keys.has('KeyD') || keys.has('ArrowRight')) v.x += 1
  return v.lengthSq() ? v.normalize() : v
}

function startDash() {
  if (dash) return
  dash = { elapsed: 0, duration: 0.3, start: hero.root.position.clone(), dir: facing.clone(), distance: 4.3 }
  status.textContent = 'HERO DASH!'
}

function startAttack() {
  if (attack) return
  attack = { elapsed: 0, duration: 0.42 }
  status.textContent = 'BRAVE SLASH!'
}

function updateCape(time, flutter) {
  const pos = hero.cape.geometry.attributes.position
  const base = hero.capeBase
  for (let i = 0; i < pos.count; i++) {
    const y = base[i * 3 + 1]
    const depth = -y / 1.22
    const wave = Math.sin(time * 4.2 + depth * 5 + base[i * 3] * 2) * (0.025 + flutter) * depth
    pos.setZ(i, base[i * 3 + 2] + wave + flutter * depth * 1.4)
  }
  pos.needsUpdate = true
  hero.cape.geometry.computeVertexNormals()
}

function updateAttack(dt) {
  const rest = hero.restArm
  if (!attack) {
    hero.rightArm.rotation.x = rest.x
    hero.rightArm.rotation.z = rest.z
    return
  }
  attack.elapsed += dt
  const t = Math.min(attack.elapsed / attack.duration, 1)
  let lift
  let sweep
  if (t < 0.28) {
    lift = THREE.MathUtils.lerp(rest.x, -0.9, t / 0.28)
    sweep = THREE.MathUtils.lerp(rest.z, 1.45, t / 0.28)
  } else if (t < 0.62) {
    const u = (t - 0.28) / 0.34
    lift = THREE.MathUtils.lerp(-0.9, 0.7, u)
    sweep = THREE.MathUtils.lerp(1.45, 0.15, u)
  } else {
    const u = (t - 0.62) / 0.38
    lift = THREE.MathUtils.lerp(0.7, rest.x, u)
    sweep = THREE.MathUtils.lerp(0.15, rest.z, u)
  }
  hero.rightArm.rotation.x = lift
  hero.rightArm.rotation.z = sweep
  if (t >= 1) {
    attack = null
    status.textContent = 'READY'
  }
}

function updatePlayer(dt, time) {
  const shield = keys.has('KeyK')
  barrier.visible = shield
  if (shield) {
    barrier.rotation.y += dt * 1.8
    barrier.scale.setScalar(1 + Math.sin(time * 9) * 0.035)
    status.textContent = 'BARRIER'
  } else if (!dash && !attack) status.textContent = 'READY'

  let moving = false
  if (dash) {
    dash.elapsed += dt
    const t = Math.min(dash.elapsed / dash.duration, 1)
    const ease = 1 - Math.pow(1 - t, 3)
    hero.root.position.lerpVectors(
      dash.start,
      dash.start.clone().addScaledVector(dash.dir, dash.distance),
      ease
    )
    hero.tilt.rotation.x = -0.45
    if (t >= 1) {
      dash = null
      status.textContent = 'READY'
    }
  } else {
    hero.tilt.rotation.x = THREE.MathUtils.damp(hero.tilt.rotation.x, 0, 8, dt)
    const move = movementInput()
    if (move.lengthSq()) {
      moving = true
      facing.copy(move)
      const speed = shield ? 2.1 : 3.4
      hero.root.position.addScaledVector(move, speed * dt)
      hero.root.rotation.y = Math.atan2(-move.x, -move.z)
    }
  }

  walkPhase += dt * (moving ? 9 : 2.2)
  const swing = moving ? Math.sin(walkPhase) * 0.7 : Math.sin(walkPhase) * 0.05
  hero.leftLeg.rotation.x = swing
  hero.rightLeg.rotation.x = -swing
  hero.leftArm.rotation.x = (shield ? 0.4 : 0.15) - swing * 0.35
  hero.head.position.y = 1.96 + Math.sin(time * 2.4) * 0.015
  updateAttack(dt)
  updateCape(time, moving || dash ? 0.16 : 0.02)

  const desired = hero.root.position.clone().add(new THREE.Vector3(1.05, 1.55, -5.4))
  camera.position.lerp(desired, 1 - Math.pow(0.0008, dt))
  camera.lookAt(hero.root.position.x, hero.root.position.y + 1.2, hero.root.position.z)
}

function loop() {
  requestAnimationFrame(loop)
  try {
    const dt = Math.min(clock.getDelta(), 0.05)
    updatePlayer(dt, clock.elapsedTime)
    renderer.render(scene, camera)
  } catch (err) {
    status.textContent = err.message
  }
}
loop()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
