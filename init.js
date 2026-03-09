// ══════════════════════════════════════════════════════
//  INIT.JS — SAFE FULL INITIALIZATION
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Show home FIRST, before anything can clobber it ──
  try {
    showView?.('home');
    pushNav?.(() => showView?.('home'));
  } catch (e) {
    console.warn('[init] showView/pushNav error:', e);
  }

  // ── 2. Cleanup & UI Bootstrap (each isolated so one failure can't block others) ──
  try { cleanInactive?.();        } catch (e) { console.warn('[init] cleanInactive:', e); }
  try { renderDiscover?.();       } catch (e) { console.warn('[init] renderDiscover:', e); }
  try { renderTopbarRight?.();    } catch (e) { console.warn('[init] renderTopbarRight:', e); }
  try { renderSidebarLibrary?.(); } catch (e) { console.warn('[init] renderSidebarLibrary:', e); }
  try { renderSettingsHTML?.();   } catch (e) { console.warn('[init] renderSettingsHTML:', e); }

  // ── 3. Album counts (sync from ALBUMS, polls until spans are in DOM) ──
  try { initAlbumCountSpans?.(); } catch (e) { console.warn('[init] initAlbumCountSpans:', e); }

  // ── 4. Sheet stats (async, fully non-blocking) ──
  loadAndRenderStats?.().catch(e =>
    console.warn('[init] Stats load error:', e)
  );

  // ── 5. Apply saved player settings ──
  try {
    const volSlider = document.getElementById('volSlider');

    if (volSlider && typeof playerSettings !== 'undefined') {
      volSlider.max   = playerSettings.maxVol ?? 100;
      volSlider.value = playerSettings.defaultVol ?? 50;
      updateVolFill?.();

      window.shuffleOn  = playerSettings.shuffleDefault ?? false;
      window.repeatMode = playerSettings.repeatDefault ?? 0;

      if (window.shuffleOn) {
        document.getElementById('btnRandom')?.classList.add('active');
      }

      if (window.repeatMode === 1) {
        document.getElementById('btnRepeat')?.classList.add('active');
      } else if (window.repeatMode === 2) {
        document.getElementById('btnRepeat')?.classList.add('active');
        const repeatIcon = document.getElementById('repeatIcon');
        if (repeatIcon) repeatIcon.className = 'fas fa-redo-alt';
      }
    }
  } catch (e) {
    console.warn('[init] Player settings error:', e);
  }

  // ── 6. Pre-warm audio engine (deferred so it never blocks or clobbers the view) ──
  setTimeout(() => {
    try {
      if (!Array.isArray(window.albums)) return;

      const first = window.albums.find(a =>
        Array.isArray(a.tracks) &&
        a.tracks.some(t => t.file && t.file !== '#')
      );

      if (first && typeof loadAlbum === 'function') {
        loadAlbum(first, 0, false);
      }
    } catch (e) {
      console.warn('[init] Prewarm audio error:', e);
    }
  }, 0);

  // ── 7. Keyboard shortcuts ──
  const volSlider = document.getElementById('volSlider');

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
            parseInt(volSlider.max   || 100),
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

  // ── 8. Media Session API ──
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play',          () => togglePlay?.());
    navigator.mediaSession.setActionHandler('pause',         () => togglePlay?.());
    navigator.mediaSession.setActionHandler('nexttrack',     () => nextTrack?.());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack?.());
  }

  // ── 9. Safe loadTrack wrapper (patches after DOMContentLoaded) ──
  if (typeof loadTrack === 'function') {
    const _origLoadTrack = loadTrack;

    window.loadTrack = function(idx) {
      _origLoadTrack(idx);

      const t = window.flatList?.[idx];
      if (t && 'mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title:   t.name,
          artist:  t.artist,
          album:   t.albumTitle,
          artwork: [{ src: t.cover, sizes: '512x512', type: 'image/jpeg' }]
        });
      }
    };
  }

});