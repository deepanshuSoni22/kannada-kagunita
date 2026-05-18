document.addEventListener('DOMContentLoaded', () => {
  const data = window.KAGUNITA_DATA || [];
  const vattaData = window.VATTAKSHARA_DATA || [];
  const app = document.getElementById('app');

  // ===== ONBOARDING SYSTEM =====
  let onboardingActive = false;
  let onboardingShown = false;
  let scene, camera, renderer, model;
  let controls = null;
  let modelBaseY = 0;
  let onboardingTimeout = null;

  const onboardingScreen = document.getElementById('onboarding-screen');
  const skipBtn = document.getElementById('skip-onboarding');
  const nextModelBtn = document.getElementById('next-model');
  const musicToggleBtn = document.getElementById('music-toggle');
  const welcomeSound = document.getElementById('welcome-sound');
  const bgmSound = document.getElementById('bgm-sound');
  const clickSound = document.getElementById('click-sound');
  const spinner = onboardingScreen.querySelector('.spinner');
  const onboardingText = onboardingScreen.querySelector('.onboarding-text h1');
  const canvas = document.getElementById('onboarding-canvas');
  let isMusicPlaying = false;
  const modelFiles = [
    'assets/models/character.glb',
    'assets/models/labubu.glb',
    'assets/models/mcqueen.glb',
    'assets/models/robot.glb',
  ];
  let currentModelIndex = 0;

  if (bgmSound) {
    // Best effort autoplay: browsers usually allow muted autoplay.
    bgmSound.muted = true;
    bgmSound.autoplay = true;
    bgmSound.volume = 0.45;
    bgmSound.play().catch(() => {
      // Ignore: some browsers still block this until user gesture.
    });
  }

  function updateMusicButton() {
    if (!musicToggleBtn) return;
    musicToggleBtn.textContent = isMusicPlaying ? 'Music: On' : 'Music: Off';
    musicToggleBtn.setAttribute('aria-label', isMusicPlaying ? 'Pause music' : 'Play music');
  }

  function startBackgroundMusic() {
    if (!bgmSound || isMusicPlaying) return;
    bgmSound.muted = false;
    bgmSound.volume = 0.45;
    bgmSound.play().then(() => {
      isMusicPlaying = true;
      updateMusicButton();
    }).catch((err) => {
      console.log('Background music blocked until user interaction:', err);
      isMusicPlaying = false;
      updateMusicButton();
    });
  }

  function pauseBackgroundMusic() {
    if (!bgmSound) return;
    bgmSound.pause();
    isMusicPlaying = false;
    updateMusicButton();
  }

  function toggleBackgroundMusic() {
    if (isMusicPlaying) {
      pauseBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
  }

  function playButtonClickSound() {
    if (!clickSound) return;
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {
      // Ignore browser restrictions before first gesture.
    });
  }

  function setOnboardingMessage(message) {
    if (onboardingText) {
      onboardingText.textContent = message;
    }
  }

  function failOnboarding(message, error) {
    console.error(message, error || '');
    spinner.classList.add('hidden');
    setOnboardingMessage('Welcome! Tap continue to enter.');
  }

  function getModelLabel(path) {
    return path.split('/').pop().replace('.glb', '');
  }

  function loadModelByIndex(index) {
    if (!scene || !renderer || !camera) return;
    if (typeof THREE.GLTFLoader !== 'function') {
      failOnboarding('GLTFLoader is unavailable.');
      return;
    }

    const safeIndex = ((index % modelFiles.length) + modelFiles.length) % modelFiles.length;
    currentModelIndex = safeIndex;
    const modelPath = modelFiles[currentModelIndex];

    if (model) {
      scene.remove(model);
      model = null;
    }

    spinner.classList.remove('hidden');
    setOnboardingMessage(`Welcome, Rudri! • ${getModelLabel(modelPath)}`);

    const loader = new THREE.GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 5.8 / maxDim;

        model.scale.multiplyScalar(scale);

        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        modelBaseY = model.position.y;

        scene.add(model);
        spinner.classList.add('hidden');
      },
      undefined,
      (error) => {
        failOnboarding(`Error loading model: ${getModelLabel(modelPath)}`, error);
      }
    );
  }

  // Initialize Three.js
  function initThreeJS() {
    if (!window.THREE) {
      failOnboarding('Three.js is not available.');
      return false;
    }

    if (!canvas) {
      failOnboarding('Onboarding canvas not found.');
      return false;
    }

    if (typeof THREE.GLTFLoader !== 'function') {
      failOnboarding('GLTFLoader is unavailable.');
      return false;
    }

    // Scene setup
    scene = new THREE.Scene();

    // Use on-screen canvas dimensions for reliable camera framing.
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || canvas.clientWidth || 500));
    const height = Math.max(1, Math.floor(rect.height || canvas.clientHeight || 500));

    // Camera setup - adjusted for better view
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0.1, 4.2);

    // Renderer setup
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
      });
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = true;
    } catch (error) {
      failOnboarding('WebGL renderer failed to initialize.', error);
      return false;
    }

    // Lighting - improved for visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    if (typeof THREE.OrbitControls === 'function') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.14;
      controls.rotateSpeed = 0.45;
      controls.zoomSpeed = 0.55;
      controls.enablePan = false;
      controls.minDistance = 2.4;
      controls.maxDistance = 7.5;
      if (THREE.TOUCH) {
        controls.touches.ONE = THREE.TOUCH.ROTATE;
        controls.touches.TWO = THREE.TOUCH.DOLLY;
      }
      controls.target.set(0, 0.2, 0);
      controls.update();
    }

    loadModelByIndex(currentModelIndex);
    animate();

    return true;
  }

  function animate() {
    if (!renderer || !camera || !scene) return;
    requestAnimationFrame(animate);

    if (model) {
      // Subtle floating animation
      if (!model._floatOffset) model._floatOffset = 0;
      model._floatOffset += 0.004;
      model.position.y = modelBaseY + Math.sin(model._floatOffset) * 0.03;
    }

    if (controls) {
      controls.update();
    }

    renderer.render(scene, camera);
  }

  // Audio playback with autoplay override
  function playWelcomeSound() {
    if (!welcomeSound) return;

    const onAudioError = () => {
      console.warn('Welcome sound failed to load.');
    };
    welcomeSound.addEventListener('error', onAudioError, { once: true });

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
    if (onboardingActive) return;

    onboardingActive = true;
    onboardingShown = true;
    onboardingScreen.classList.remove('hidden');
    onboardingScreen.style.display = 'flex';
    onboardingScreen.style.pointerEvents = 'auto';
    onboardingScreen.style.zIndex = '9999';

    spinner.classList.remove('hidden');
    setOnboardingMessage('Welcome, Rudri!');

    try {
      initThreeJS();
    } catch (error) {
      failOnboarding('Onboarding initialization crashed.', error);
    }

    playWelcomeSound();
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

  // Continue button listener
  skipBtn.addEventListener('click', () => {
    if (welcomeSound) {
      welcomeSound.pause();
      welcomeSound.currentTime = 0;
    }
    startBackgroundMusic();
    dismissOnboarding();
  });
  if (nextModelBtn) {
    nextModelBtn.addEventListener('click', () => {
      loadModelByIndex(currentModelIndex + 1);
    });
  }

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', toggleBackgroundMusic);
  }

  // Play cute click SFX for all button clicks (onboarding + app pages).
  document.addEventListener('click', (event) => {
    const clickedButton = event.target.closest('button');
    if (!clickedButton || clickedButton.disabled) return;
    playButtonClickSound();
  });

  // Resume/unmute music on first real user interaction if autoplay was blocked.
  const activateMusicFromGesture = () => {
    if (!isMusicPlaying) startBackgroundMusic();
    document.removeEventListener('pointerdown', activateMusicFromGesture);
    document.removeEventListener('keydown', activateMusicFromGesture);
  };
  document.addEventListener('pointerdown', activateMusicFromGesture, { once: true });
  document.addEventListener('keydown', activateMusicFromGesture, { once: true });

  updateMusicButton();

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
        <button class="nav-btn" id="showOnboardingBtn" type="button" aria-label="Open onboarding exhibition">3D Exhibition</button>
      </section>
      <section class="grid-shell">
        <div class="grid-head">
          <h3>ಕನ್ನಡ</h3>
        </div>
        <div class="grid" aria-label="Kannada consonant grid">${tiles}</div>
      </section>
    `;

    app.querySelectorAll('.tile').forEach((tile) => {
      tile.addEventListener('click', () => setRoute('k:' + tile.dataset.letter));
      tile.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setRoute('k:' + tile.dataset.letter);
        }
      });
    });
    const showOnboardingBtn = app.querySelector('#showOnboardingBtn');
    if (showOnboardingBtn) {
      showOnboardingBtn.addEventListener('click', () => {
        showOnboarding();
      });
    }
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
    app.querySelector('#prevBtn').addEventListener('click', () => setRoute('k:' + previousItem.letter));
    app.querySelector('#nextBtn').addEventListener('click', () => setRoute('k:' + nextItem.letter));
  }

  // Mode selection (initial home) - choose between Kagunita and Vattakshara
  function renderModeSelection() {
    app.className = 'app home-mode';
    app.innerHTML = `
      <section class="home-hero">
        <h2>Kannada Kagunita</h2>
        <p style="color:var(--muted); margin-top:12px;">Choose a mode to explore</p>
      </section>
      <section style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;margin-top:18px;">
        <button class="nav-btn" id="openKagunita" type="button">Kagunita</button>
        <button class="nav-btn" id="openVatta" type="button">Vattakshara</button>
      </section>
    `;
    const ok = app.querySelector('#openKagunita');
    const ov = app.querySelector('#openVatta');
    if (ok) ok.addEventListener('click', () => setRoute('kagunita'));
    if (ov) ov.addEventListener('click', () => setRoute('vattakshara'));
  }

  // Vattakshara list (select page)
  function renderVattaksharaList() {
    app.className = 'app home-mode';
    const tiles = vattaData.map((item, index) => `
      <button class="tile" data-letter="${item.letter}" style="--tile-accent:${index % 2 === 0 ? '#8ec0ff' : '#ffd36e'}">
        <div class="letter">${item.letter}</div>
      </button>
    `).join('');

    app.innerHTML = `
      <section class="home-hero">
        <h2>ವತ್ತಾಕ್ಷರಗಳು</h2>
      </section>
      <section class="grid-shell">
        <div class="grid-head">
          <h3>Vattakshara</h3>
        </div>
        <div class="grid vattakshara-grid" aria-label="Vattakshara grid">${tiles}</div>
      </section>
    `;

    app.querySelectorAll('.tile').forEach((tile) => {
      tile.addEventListener('click', () => setRoute('v:' + tile.dataset.letter));
      tile.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setRoute('v:' + tile.dataset.letter);
        }
      });
    });
  }

  function getVattaByLetter(letter) {
    return vattaData.find((item) => item.letter === letter) || null;
  }

  function renderVattaksharaView(item) {
    app.className = 'app letter-mode';
    const cards = `
      <div class="syllable-card tone-a" style="font-size:clamp(72px, 10vw, 140px);">${item.letter}</div>
    `;

    app.innerHTML = `
      <section class="letter-view">
        <div class="letter-header">
          <h2 class="letter-title">${item.title}</h2>
          <button class="home-btn" id="homeBtn" type="button" aria-label="Home">⌂</button>
        </div>
        <section class="syllable-section">
          <div class="syllable-grid" aria-label="${item.letter} vattakshara">${cards}</div>
        </section>
      </section>
    `;

    app.querySelector('#homeBtn').addEventListener('click', () => setRoute('vattakshara'));
  }

  function render() {
    const route = getRouteLetter();
    if (!route) {
      renderModeSelection();
      if (!onboardingShown) showOnboarding();
      document.title = 'Kannada Kagunita — Kids';
      return;
    }

    // Dismiss onboarding when navigating away from home
    if (onboardingActive) dismissOnboarding();

    // Mode list pages
    if (route === 'kagunita') {
      renderHome();
      document.title = 'Kannada Kagunita — Kagunita';
      return;
    }
    if (route === 'vattakshara') {
      renderVattaksharaList();
      document.title = 'Kannada Kagunita — Vattakshara';
      return;
    }

    // Letter views with prefixes: 'k:LETTER' or 'v:LETTER'
    if (route.startsWith('k:')) {
      const letter = route.slice(2);
      const item = getItemByLetter(letter);
      if (!item) {
        renderModeSelection();
        return;
      }
      renderLetterView(item);
      document.title = `Kannada Kagunita — ${item.letter}`;
      return;
    }

    if (route.startsWith('v:')) {
      const letter = route.slice(2);
      const item = getVattaByLetter(letter);
      if (!item) {
        renderVattaksharaList();
        return;
      }
      renderVattaksharaView(item);
      document.title = `Kannada Kagunita — ${item.letter}`;
      return;
    }

    // Fallback: show mode selection
    renderModeSelection();
  }

  window.addEventListener('hashchange', render);
  render();
});