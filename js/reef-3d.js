/**
 * RAINBOW AQUARIUM & PETS — 3D LIVING REEF WEBGL ENGINE
 * Exact recreation of playmagicreef.com 3D underwater ecosystem
 * Features:
 * - 3D Multi-plane underwater scene with Three.js WebGL
 * - Layered decorations: sunken pirate ship, corals, seaweed, kelp, starfish with vertex sway
 * - Animated swimming cartoon fish with waving tail spine deformation shaders
 * - Pulsing godrays & sunbeam caustics
 * - Rising 3D bubble particle system
 * - Interactive mouse/touch parallax & click-to-feed interaction
 */

class MagicReef3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.decorations = [];
    this.fishes = [];
    this.bubbles = [];
    this.foodPellets = [];
    this.godrays = [];
    
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.clock = new THREE.Clock();
    this.textureLoader = new THREE.TextureLoader();

    this.init();
  }

  async init() {
    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x092645, 0.022);

    // 2. Camera Setup (matching playmagicreef 50 deg FOV)
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.set(0, -1, 16);
    this.camera.lookAt(0, -2, 0);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xdff2ff, 1.2);
    sunLight.position.set(5, 20, 10);
    this.scene.add(sunLight);

    // 5. Add Scene Elements
    this.setupGodrays();
    await this.setupDecorations();
    this.setupFishSchool();
    this.setupBubbles();

    // 6. Event Listeners
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));

    // 7. Start Render Loop
    this.animate();
  }

  onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onPointerMove(e) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.mouse.targetX = x * 1.6;
    this.mouse.targetY = y * 0.8;
  }

  onPointerDown(e) {
    const rect = this.container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Convert 2D screen click to 3D world position
    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(this.camera);
    const dir = vector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / dir.z;
    const spawnPos = this.camera.position.clone().add(dir.multiplyScalar(distance));

    // Drop food pellets
    for (let i = 0; i < 4; i++) {
      this.spawnFoodPellet(
        spawnPos.x + (Math.random() - 0.5) * 1.5,
        spawnPos.y + (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 4
      );
    }
  }

  /* --------------------------------------------------
     GODRAYS & SUNBEAM SHADER
     -------------------------------------------------- */
  setupGodrays() {
    const outerTex = this.textureLoader.load('textures/godrays_outer.jpg');
    const innerTex = this.textureLoader.load('textures/godrays_inner.jpg');

    outerTex.wrapS = outerTex.wrapT = THREE.RepeatWrapping;
    innerTex.wrapS = innerTex.wrapT = THREE.RepeatWrapping;

    const godrayGeo = new THREE.PlaneGeometry(16, 26);

    const outerMat = new THREE.MeshBasicMaterial({
      map: outerTex,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const innerMat = new THREE.MeshBasicMaterial({
      map: innerTex,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const outerMesh = new THREE.Mesh(godrayGeo, outerMat);
    outerMesh.position.set(0, 3, -1);
    outerMesh.scale.set(2.2, 1.4, 1);
    this.scene.add(outerMesh);

    const innerMesh = new THREE.Mesh(godrayGeo, innerMat);
    innerMesh.position.set(1, 4, 1);
    innerMesh.scale.set(1.8, 1.3, 1);
    this.scene.add(innerMesh);

    this.godrays.push(outerMesh, innerMesh);
  }

  /* --------------------------------------------------
     LAYERED 3D REEF DECORATIONS & SHIPWRECK
     -------------------------------------------------- */
  async setupDecorations() {
    const decorConfigs = [
      // Background Far Reef
      { url: 'textures/fishtank/bg_far_pale_blue_reef_wide.webp', pos: [0, -9.4, -16], width: 22, sway: 0.003, flipX: false },
      { url: 'textures/fishtank/bg_mid_blue_reef_strip.webp', pos: [7.5, -9.5, -12.5], width: 14, sway: 0.005, flipX: true },
      { url: 'textures/fishtank/underwater_coral_reef_scene_with_starfish.webp', pos: [-3.5, -9.5, -11.5], width: 14, sway: 0.005, flipX: false },
      { url: 'textures/fishtank/bg_pale_reef_rocks.webp', pos: [-8.5, -9.5, -10.5], width: 12, sway: 0.006, flipX: false },

      // Sunken Pirate Ship (Signature Landmark)
      { url: 'textures/fishtank/ship.webp', pos: [3.5, -6.5, -5], width: 13.5, sway: 0.003, flipX: false },

      // Midground Kelp & Coral Formations
      { url: 'textures/fishtank/bg_kelp_rocks_tall.webp', pos: [5.5, -9.5, -8.5], width: 8, sway: 0.025, flipX: false },
      { url: 'textures/fishtank/underwater_kelp_cluster_illustration.webp', pos: [-6.5, -9.6, -6], width: 6.5, sway: 0.045, flipX: true },
      { url: 'textures/fishtank/underwater_kelp_cluster_with_rocks.webp', pos: [4, -9.7, -4], width: 5.5, sway: 0.04, flipX: false },
      { url: 'textures/fishtank/mid_green_kelp_blue_coral_rocks.webp', pos: [-3.5, -9.6, -4.5], width: 6.5, sway: 0.035, flipX: false },

      // Foreground Coral Tubes, Starfish & Rocks
      { url: 'textures/fishtank/fg_mixed_purple_tubes_green_kelp_wide.webp', pos: [-11.5, -9.8, 1], width: 13, sway: 0.02, flipX: false },
      { url: 'textures/fishtank/fg_purple_tubes_green_kelp_blue_coral.webp', pos: [11.2, -9.7, 0.8], width: 13, sway: 0.02, flipX: false },
      { url: 'textures/fishtank/fg_orange_coral_rocks.webp', pos: [-6.4, -9.6, 2.4], width: 6.5, sway: 0.015, flipX: false },
      { url: 'textures/fishtank/fg_purple_tube_coral_cluster.webp', pos: [7.5, -9.6, 2.4], width: 7, sway: 0.015, flipX: true },
      { url: 'textures/fishtank/underwater_rocks_with_seaweed_clusters.webp', pos: [4.5, -9.9, 2.4], width: 5.5, sway: 0.015, flipX: true },
      { url: 'textures/fishtank/underwater_rock_formation_with_starfish.webp', pos: [-3, -9.9, 2.8], width: 6, sway: 0.008, flipX: false },
      { url: 'textures/fishtank/stylized_orange_starfish_illustration.webp', pos: [1.5, -10.2, 4], width: 2.4, sway: 0.002, flipX: false },
      { url: 'textures/fishtank/stylized_orange_starfish_illustration.webp', pos: [-7, -10.3, 3.2], width: 1.8, sway: 0.002, flipX: false }
    ];

    decorConfigs.forEach(cfg => {
      const tex = this.textureLoader.load(cfg.url, (loadedTex) => {
        const imgAspect = loadedTex.image.height / loadedTex.image.width;
        const height = cfg.width * imgAspect;

        const geo = new THREE.PlaneGeometry(cfg.width, height, 16, 8);
        if (cfg.flipX) {
          const uv = geo.attributes.uv;
          for (let i = 0; i < uv.count; i++) {
            uv.setX(i, 1 - uv.getX(i));
          }
          uv.needsUpdate = true;
        }

        // Custom Shader Material for realistic underwater kelp sway
        const mat = new THREE.MeshBasicMaterial({
          map: loadedTex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = { value: 0 };
          shader.uniforms.uSwayAmount = { value: cfg.sway };
          
          shader.vertexShader = `
            uniform float uTime;
            uniform float uSwayAmount;
            ${shader.vertexShader}
          `.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            float hFactor = clamp((position.y + ${height * 0.5}) / ${height}, 0.0, 1.0);
            transformed.x += sin(uTime * 1.5 + position.x * 0.3 + position.z * 0.2) * uSwayAmount * hFactor * 10.0;
            transformed.y += cos(uTime * 1.2 + position.x * 0.4) * uSwayAmount * hFactor * 2.0;
            `
          );

          mat.userData.shader = shader;
        };

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cfg.pos[0], cfg.pos[1] + height * 0.45, cfg.pos[2]);
        this.scene.add(mesh);
        this.decorations.push(mesh);
      });
    });
  }

  /* --------------------------------------------------
     ANIMATED SWIMMING FISH WITH WAVE SHADERS
     -------------------------------------------------- */
  setupFishSchool() {
    const fishSpecies = [
      { url: 'outlines/clownfish.webp', length: 3.4, height: 2.2, speed: 1.4, y: 1.5, z: 2.0, dir: 1 },
      { url: 'outlines/damselfish.webp', length: 2.6, height: 1.8, speed: 1.8, y: 3.2, z: -1.0, dir: -1 },
      { url: 'outlines/goldfish.webp', length: 3.0, height: 2.0, speed: 1.3, y: -0.5, z: 1.2, dir: 1 },
      { url: 'outlines/butterflyfish.webp', length: 2.8, height: 2.2, speed: 1.6, y: -2.5, z: -2.0, dir: -1 },
      { url: 'outlines/cowfish.webp', length: 3.2, height: 2.4, speed: 1.1, y: 0.2, z: 3.0, dir: 1 },
      { url: 'outlines/angelfish.webp', length: 3.2, height: 3.0, speed: 1.5, y: 2.0, z: -3.5, dir: -1 },
      { url: 'outlines/bettafish.webp', length: 3.6, height: 2.6, speed: 1.2, y: -1.2, z: 0.5, dir: 1 },
      { url: 'outlines/discusfish.webp', length: 3.2, height: 2.8, speed: 1.4, y: 4.0, z: -4.5, dir: 1 },
      { url: 'outlines/jellyfish.webp', length: 2.4, height: 3.2, speed: 0.8, y: -3.5, z: 2.2, dir: -1 },
      { url: 'outlines/grouper.webp', length: 4.0, height: 2.6, speed: 1.0, y: -4.5, z: -1.5, dir: 1 }
    ];

    fishSpecies.forEach((sp, idx) => {
      this.textureLoader.load(sp.url, (tex) => {
        // Plane geometry with 24 segments horizontally for smooth spine waving
        const geo = new THREE.PlaneGeometry(sp.length, sp.height, 24, 1);

        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        // Patch fish shader for sinusoidal waving tail animation
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = { value: 0 };
          shader.uniforms.uFishLength = { value: sp.length };
          shader.uniforms.uWaveFreq = { value: 1.2 };
          shader.uniforms.uWaveSpeed = { value: 6.0 };
          shader.uniforms.uWaveAmp = { value: 0.055 };
          shader.uniforms.uWavePhase = { value: Math.random() * Math.PI * 2 };

          shader.vertexShader = `
            uniform float uTime;
            uniform float uFishLength;
            uniform float uWaveFreq;
            uniform float uWaveSpeed;
            uniform float uWaveAmp;
            uniform float uWavePhase;
            ${shader.vertexShader}
          `.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            float waveN = clamp(0.5 - transformed.x / uFishLength, 0.0, 1.0);
            float waveAmp = uWaveAmp * smoothstep(0.08, 0.8, waveN) * uFishLength;
            float waveS = sin(waveN * uWaveFreq * 6.2831853 - uTime * uWaveSpeed + uWavePhase) * waveAmp;
            transformed.y += waveS * 0.8;
            transformed.z += waveS * 0.6;
            `
          );

          mat.userData.shader = shader;
        };

        const mesh = new THREE.Mesh(geo, mat);
        
        // Spawn positions across the aquarium
        mesh.position.set(
          (Math.random() - 0.5) * 18,
          sp.y,
          sp.z
        );

        const fishAgent = {
          mesh,
          speed: sp.speed * (0.85 + Math.random() * 0.3),
          dir: sp.dir,
          baseY: sp.y,
          bobPhase: Math.random() * Math.PI * 2,
          targetFood: null
        };

        this.updateFishOrientation(fishAgent);
        this.scene.add(mesh);
        this.fishes.push(fishAgent);
      });
    });
  }

  updateFishOrientation(fish) {
    // Face the direction of swim
    if (fish.dir > 0) {
      fish.mesh.rotation.y = 0;
    } else {
      fish.mesh.rotation.y = Math.PI;
    }
  }

  /* --------------------------------------------------
     3D BUBBLE PARTICLE SYSTEM
     -------------------------------------------------- */
  setupBubbles() {
    const bubbleGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xdff2ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const emitterX = [-10, -4, 1, 6, 12, -7];

    for (let i = 0; i < 45; i++) {
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat.clone());
      const originX = emitterX[i % emitterX.length] + (Math.random() - 0.5) * 2;
      
      bubble.position.set(
        originX,
        -10 + Math.random() * 18,
        (Math.random() - 0.5) * 10
      );

      const scale = Math.random() * 0.9 + 0.4;
      bubble.scale.set(scale, scale, scale);

      bubble.userData = {
        originX,
        speed: (Math.random() * 0.8 + 1.2) * 1.5,
        wobbleSpeed: Math.random() * 3 + 2,
        wobbleAmount: Math.random() * 0.4 + 0.2,
        phase: Math.random() * Math.PI * 2
      };

      this.scene.add(bubble);
      this.bubbles.push(bubble);
    }
  }

  /* --------------------------------------------------
     FOOD PELLETS (INTERACTIVE FEEDING)
     -------------------------------------------------- */
  spawnFoodPellet(x, y, z) {
    const pelletGeo = new THREE.SphereGeometry(0.15, 10, 10);
    const pelletMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.95
    });

    const pellet = new THREE.Mesh(pelletGeo, pelletMat);
    pellet.position.set(x, y, z);
    pellet.userData = {
      vy: -(Math.random() * 1.2 + 1.5),
      eaten: false
    };

    this.scene.add(pellet);
    this.foodPellets.push(pellet);
  }

  /* --------------------------------------------------
     MAIN ANIMATION & RENDER LOOP
     -------------------------------------------------- */
  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Smooth Camera Parallax from Mouse
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;
    
    this.camera.position.x = this.mouse.x;
    this.camera.position.y = -1 + this.mouse.y;
    this.camera.lookAt(0, -1.5, 0);

    // 2. Animate Godrays (pulse opacity & subtle rotation)
    if (this.godrays[0]) {
      this.godrays[0].material.opacity = 0.2 + Math.sin(elapsedTime * 0.8) * 0.06;
      this.godrays[0].rotation.z = Math.sin(elapsedTime * 0.2) * 0.05;
    }
    if (this.godrays[1]) {
      this.godrays[1].material.opacity = 0.28 + Math.cos(elapsedTime * 1.1) * 0.08;
      this.godrays[1].rotation.z = -Math.cos(elapsedTime * 0.25) * 0.06;
    }

    // 3. Update Decoration Sway Shaders
    this.decorations.forEach(dec => {
      if (dec.material?.userData?.shader) {
        dec.material.userData.shader.uniforms.uTime.value = elapsedTime;
      }
    });

    // 4. Update Food Pellets
    for (let i = this.foodPellets.length - 1; i >= 0; i--) {
      const p = this.foodPellets[i];
      p.position.y += p.userData.vy * delta;
      
      if (p.position.y < -10 || p.userData.eaten) {
        this.scene.remove(p);
        this.foodPellets.splice(i, 1);
      }
    }

    // 5. Update Swimming Fish AI & Wave Shaders
    this.fishes.forEach(fish => {
      // Update wave shader time
      if (fish.mesh.material?.userData?.shader) {
        fish.mesh.material.userData.shader.uniforms.uTime.value = elapsedTime;
      }

      // Check for nearby food pellets
      let nearestFood = null;
      let minDistance = 12;

      for (let food of this.foodPellets) {
        if (food.userData.eaten) continue;
        const dist = fish.mesh.position.distanceTo(food.position);
        if (dist < minDistance) {
          minDistance = dist;
          nearestFood = food;
        }
      }

      if (nearestFood) {
        // Swim directly towards food
        const targetPos = nearestFood.position;
        const moveDir = targetPos.clone().sub(fish.mesh.position).normalize();
        
        fish.mesh.position.addScaledVector(moveDir, fish.speed * 2.2 * delta);
        fish.dir = moveDir.x >= 0 ? 1 : -1;
        this.updateFishOrientation(fish);

        if (minDistance < 0.6) {
          nearestFood.userData.eaten = true;
        }
      } else {
        // Natural cruise swimming
        fish.bobPhase += delta * 1.8;
        fish.mesh.position.x += fish.dir * fish.speed * delta;
        fish.mesh.position.y = fish.baseY + Math.sin(fish.bobPhase) * 0.35;

        // Wrap around aquarium edges smoothly
        const boundX = 14;
        if (fish.mesh.position.x > boundX && fish.dir > 0) {
          fish.dir = -1;
          this.updateFishOrientation(fish);
        } else if (fish.mesh.position.x < -boundX && fish.dir < 0) {
          fish.dir = 1;
          this.updateFishOrientation(fish);
        }
      }
    });

    // 6. Update Rising Bubbles
    this.bubbles.forEach(b => {
      const u = b.userData;
      b.position.y += u.speed * delta;
      u.phase += u.wobbleSpeed * delta;
      b.position.x = u.originX + Math.sin(u.phase) * u.wobbleAmount;

      if (b.position.y > 8) {
        b.position.y = -10;
        b.position.x = u.originX;
      }
    });

    // 7. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new MagicReef3D('threeReefContainer');
});
