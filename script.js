document.addEventListener('DOMContentLoaded', () => {
  const data = window.KAGUNITA_DATA || [];
  const app = document.getElementById('app');

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
      renderHome();
      document.title = 'Kannada Kagunita — Kids';
      return;
    }

    const item = getItemByLetter(routeLetter);
    if (!item) {
      renderHome();
      return;
    }

    renderLetterView(item);
    document.title = `Kannada Kagunita — ${item.letter}`;
  }

  window.addEventListener('hashchange', render);
  render();
});