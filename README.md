# Kannada Kagunita — Plain HTML Prototype

Public URL: https://deepanshusoni22.github.io/kannada-kagunita/

Run the app from a local static server (recommended for 3D/audio assets).


Quick steps:

```sh
# from this project folder
python3 -m http.server 8000
# then open http://localhost:8000
```

Avoid testing from `file://` for onboarding, because `GLTFLoader` and media playback can fail or behave inconsistently when opened directly as a local file.


What’s included:
- `index.html` — main page with grid and overlay
- `styles.css` — styles, typography, animations
- `script.js` — renders grid and handles interactions
- `data/kagunita.js` — full kagunita content
