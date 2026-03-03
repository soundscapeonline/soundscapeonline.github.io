// ══════════════════════════════════════════════════════
//  INIT.JS — SAFE FULL INITIALIZATION
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Cleanup & UI Bootstrap ──
  try {
    cleanInactive?.();
    renderDiscover?.();
    renderTopbarRight?.();
    renderSidebarLibrary?.();
    initSettingsUI?.();
    showView?.('home');
    pushNav?.(() => { showView?.('home'); });
  } catch (e) {
    console.warn('UI init error:', e);
  }

  // ── 2. Stats (non-blocking) ──
  loadAndRenderStats?.().catch(e =>
    console.warn('Stats load error:', e)
  );

  // ── 3. Apply saved player settings ──
  const volSlider = document.getElementById('volSlider');

  if (volSlider && typeof playerSettings !== 'undefined') {
    volSlider.max   = playerSettings.maxVol ?? 100;
    volSlider.value = playerSettings.defaultVol ?? 50;
    updateVolFill?.();

    window.shuffleOn  = playerSettings.shuffleDefault ?? false;
    window.repeatMode = playerSettings.repeatDefault ?? 0;

    if (shuffleOn) {
      document.getElementById('btnRandom')?.classList.add('active');
    }

    if (repeatMode === 1) {
      document.getElementById('btnRepeat')?.classList.add('active');
    } else if (repeatMode === 2) {
      document.getElementById('btnRepeat')?.classList.add('active');
      const repeatIcon = document.getElementById('repeatIcon');
      if (repeatIcon) repeatIcon.className = 'fas fa-redo-alt';
    }
  }

  // ── 4. Pre-warm audio engine ──
  (function prewarmAudio() {
    if (!Array.isArray(window.albums)) return;

    const first = albums.find(a =>
      Array.isArray(a.tracks) &&
      a.tracks.some(t => t.file && t.file !== '#')
    );

    if (first && typeof loadAlbum === 'function') {
      loadAlbum(first, 0, false);
    }
  })();

  // ── 5. Keyboard shortcuts ──
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay?.();
        break;
      case 'ArrowRight':
        if (e.shiftKey) { e.preventDefault(); nextTrack?.(); }
        break;
      case 'ArrowLeft':
        if (e.shiftKey) { e.preventDefault(); prevTrack?.(); }
        break;
      case 'ArrowUp':
        if (e.shiftKey && volSlider) {
          e.preventDefault();
          volSlider.value = Math.min(
            parseInt(volSlider.max || 100),
            parseInt(volSlider.value || 0) + 10
          );
          applyVolume?.();
        }
        break;
      case 'ArrowDown':
        if (e.shiftKey && volSlider) {
          e.preventDefault();
          volSlider.value = Math.max(
            0,
            parseInt(volSlider.value || 0) - 10
          );
          applyVolume?.();
        }
        break;
      case 'KeyM':
        if (volSlider) {
          volSlider.value = parseInt(volSlider.value) > 0
            ? (volSlider._savedVol = volSlider.value, 0)
            : (volSlider._savedVol ?? playerSettings?.defaultVol ?? 50);
          applyVolume?.();
        }
        break;
    }
  });

  // ── 6. Media Session API ──
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play',  () => togglePlay?.());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay?.());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack?.());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack?.());
  }

  // ── 7. Safe loadTrack wrapper ──
  if (typeof loadTrack === 'function') {
    const _origLoadTrack = loadTrack;

    window.loadTrack = function(idx) {
      _origLoadTrack(idx);

      const t = window.flatList?.[idx];
      if (t && 'mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title:  t.name,
          artist: t.artist,
          album:  t.albumTitle,
          artwork: [{
            src: t.cover,
            sizes: '512x512',
            type: 'image/jpeg'
          }]
        });
      }
    };
  }

});