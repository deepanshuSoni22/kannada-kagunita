document.addEventListener('DOMContentLoaded', () => {
  const data = window.KAGUNITA_DATA || [];
  const app = document.getElementById('app');

  // ===== ONBOARDING SYSTEM =====
  let onboardingActive = false;
  let scene, camera, renderer, model;
  let onboardingTimeout = null;

  const onboardingScreen = document.getElementById('onboarding-screen');
  const skipBtn = document.getElementById('skip-onboarding');
  const welcomeSound = document.getElementById('welcome-sound');
  const spinner = onboardingScreen.querySelector('.spinner');
  const canvas = document.getElementById('onboarding-canvas');

  // Initialize Three.js
  function initThreeJS() {
    const canvas = document.getElementById('onboarding-canvas');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x3c4f76);

    // Use canvas dimensions (explicit from HTML: 500x500)
    const width = canvas.clientWidth || 500;
    const height = canvas.clientHeight || 500;

    // Camera setup - adjusted for better view
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 6);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true, 
      alpha: false,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Lighting - improved for visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load 3D model
    const loader = new THREE.GLTFLoader();
    loader.load(
      'assets/models/character.glb',
      (gltf) => {
        model = gltf.scene;
        
        // Auto-scale model to fit view
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4 / maxDim;
        
        model.scale.multiplyScalar(scale);
        
        // Center model
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        scene.add(model);

        // Hide spinner once model loads
        spinner.classList.add('hidden');

        // Start animation loop
        animate();
      },
      (progress) => {
        // Optional: track loading progress
        console.log('Model loading:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading model:', error);
        spinner.textContent = '⚠️';
        spinner.style.fontSize = '32px';
      }
    );
  }

  function animate() {
    requestAnimationFrame(animate);

    if (model) {
      model.rotation.y += 0.005;
      // Subtle floating animation
      if (!model._floatOffset) model._floatOffset = 0;
      model._floatOffset += 0.01;
      model.position.z = Math.sin(model._floatOffset) * 0.3;
    }

    renderer.render(scene, camera);
  }

  // Audio playback with autoplay override
  function playWelcomeSound() {
    welcomeSound.muted = true;
    welcomeSound.play().catch((err) => {
      console.log('Autoplay muted (browser policy):', err);
    });

    // Try unmute on first interaction
    const tryUnmute = () => {
      welcomeSound.muted = false;
      document.removeEventListener('click', tryUnmute);
      document.removeEventListener('keydown', tryUnmute);
    };

    document.addEventListener('click', tryUnmute, { once: true });
    document.addEventListener('keydown', tryUnmute, { once: true });
  }

  // Show onboarding screen
  function showOnboarding() {
    onboardingActive = true;
    onboardingScreen.classList.remove('hidden');
    onboardingScreen.style.display = 'flex';

    initThreeJS();
    playWelcomeSound();

    // Auto-advance after 4 seconds
    clearTimeout(onboardingTimeout);
    onboardingTimeout = setTimeout(() => {
      dismissOnboarding();
    }, 4000);
  }

  // Dismiss onboarding screen
  function dismissOnboarding() {
    if (!onboardingActive) return;

    onboardingActive = false;
    clearTimeout(onboardingTimeout);

    onboardingScreen.classList.add('hidden');

    // Fade out animation, then hide completely
    setTimeout(() => {
      onboardingScreen.style.display = 'none';
      onboardingScreen.style.pointerEvents = 'none';
      onboardingScreen.style.zIndex = '-1';
    }, 400);
  }

  // Skip button listener
  skipBtn.addEventListener('click', dismissOnboarding);

  // Canvas/screen click also dismisses
  onboardingScreen.addEventListener('click', (e) => {
    if (e.target === onboardingScreen || e.target === canvas) {
      dismissOnboarding();
    }
  });

  // ===== ROUTING SYSTEM =====

  function getRouteLetter() {
    const rawHash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    return rawHash || null;
  }

  function getItemByLetter(letter) {
    return data.find((item) => item.letter === letter) || null;
  }

  function getItemIndexByLetter(letter) {
    return data.findIndex((item) => item.letter === letter);
  }

  function setRoute(letter) {
    if (!letter) {
      window.location.hash = '';
      return;
    }
    window.location.hash = encodeURIComponent(letter);
  }

  function renderHome() {
    app.className = 'app home-mode';
    const tiles = data.map((item, index) => `
      <button class="tile" data-letter="${item.letter}" style="--tile-accent:${index % 2 === 0 ? '#ff7aa2' : '#ffd36e'}">
        <div class="letter">${item.letter}</div>
      </button>
    `).join('');

    app.innerHTML = `
      <section class="home-hero">
        <h2>ಅಕ್ಷರಗಳು</h2>
      </section>
      <section class="grid-shell">
        <div class="grid-head">
          <h3>ಕನ್ನಡ</h3>
        </div>
        <div class="grid" aria-label="Kannada consonant grid">${tiles}</div>
      </section>
    `;

    app.querySelectorAll('.tile').forEach((tile) => {
      tile.addEventListener('click', () => setRoute(tile.dataset.letter));
      tile.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setRoute(tile.dataset.letter);
        }
      });
    });
  }

  function renderLetterView(item) {
    app.className = 'app letter-mode';
    const syllables = item.kagunita.split(/\s+/).filter(Boolean);
    const currentIndex = getItemIndexByLetter(item.letter);
    const previousItem = data[(currentIndex - 1 + data.length) % data.length];
    const nextItem = data[(currentIndex + 1) % data.length];
    const cards = syllables.map((syllable, index) => `
      <div class="syllable-card ${index % 2 === 0 ? 'tone-a' : 'tone-b'}">
        <span>${syllable}</span>
      </div>
    `).join('');

    app.innerHTML = `
      <section class="letter-view">
        <div class="letter-header">
          <h2 class="letter-title">${item.title}</h2>
          <button class="home-btn" id="homeBtn" type="button" aria-label="Home">⌂</button>
        </div>
        <section class="syllable-section">
          <div class="syllable-grid" aria-label="${item.letter} kagunita grid">${cards}</div>
        </section>
        <div class="nav-bottom">
          <button class="nav-btn prev-btn" id="prevBtn" type="button">Previous</button>
          <button class="nav-btn next-btn" id="nextBtn" type="button">Next</button>
        </div>
      </section>
    `;
    app.querySelector('#homeBtn').addEventListener('click', () => setRoute(null));
    app.querySelector('#prevBtn').addEventListener('click', () => setRoute(previousItem.letter));
    app.querySelector('#nextBtn').addEventListener('click', () => setRoute(nextItem.letter));
  }

  function render() {
    const routeLetter = getRouteLetter();
    if (!routeLetter) {
      // Show onboarding before home
      showOnboarding();
      renderHome();
      document.title = 'Kannada Kagunita — Kids';
      return;
    }

    // Dismiss onboarding when navigating away from home
    if (onboardingActive) {
      dismissOnboarding();
    }

    const item = getItemByLetter(routeLetter);
    if (!item) {
      showOnboarding();
      renderHome();
      return;
    }

    renderLetterView(item);
    document.title = `Kannada Kagunita — ${item.letter}`;
  }

  window.addEventListener('hashchange', render);
  render();
});