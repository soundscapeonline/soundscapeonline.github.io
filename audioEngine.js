// ══════════════════════════════════════════════════════
//  AUDIOV2.JS — FULL IMPLEMENTATION
// ══════════════════════════════════════════════════════
let audio = new Audio();
audio.preload = 'auto';
audio.crossOrigin = 'anonymous'; // required for Web Audio API + CDN sources

// ── State ──
let flatList         = [];   // [{name,src,albumId,albumTitle,cover,artist,origIdx,pIdx,lastPIdx,isMulti,statId,lyrics}]
let trackIdx         = -1;
let isPlaying        = false;
let shuffleOn        = false;
let repeatMode       = 0;    // 0=off 1=all 2=one
let shuffleOrder     = [];
let shufflePos       = 0;
let seekDragging     = false;
let fullListenFired  = false;

// ── Web Audio API (lazy init) ──
let audioCtx = null, analyser = null, source = null, gainNode = null;

// ── Transition state ──
const FADE_DURATION  = 0.3;
let   _pendingTrackIdx = null;

// ── Expanded player state ──
let expandedOpen     = false;
let lyricsLines      = [];   // parsed [{time, text}]
let lyricsActive     = -1;   // currently highlighted line index

function ensureAudioCtx() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser  = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  gainNode  = audioCtx.createGain();
  source    = audioCtx.createMediaElementSource(audio);
  source.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  applyVolume();
}

// ══════════════════════════════════════════════════════
//  SMOOTH TRACK TRANSITION
// ══════════════════════════════════════════════════════
function transitionToTrack(idx, shouldPlay) {
  idx = Math.max(0, Math.min(idx, flatList.length - 1));
  if (!audioCtx || audio.paused) {
    _applyTrack(idx, shouldPlay, false);
    return;
  }
  _pendingTrackIdx = idx;
  const now = audioCtx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(0, now + FADE_DURATION);
  setTimeout(() => {
    if (_pendingTrackIdx !== idx) return;
    _applyTrack(idx, shouldPlay, false);
  }, FADE_DURATION * 1000);
}

function _applyTrack(idx, shouldPlay, skipFadeIn) {
  _pendingTrackIdx = null;
  loadTrack(idx);
  if (!shouldPlay) return;
  const startPlayback = () => {
    ensureAudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!skipFadeIn && gainNode) {
      const now = audioCtx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(0, now);
      const targetVol = (parseInt(volSlider.value) || 100) / 100;
      gainNode.gain.linearRampToValueAtTime(targetVol, now + FADE_DURATION);
    } else {
      applyVolume();
    }
    audio.play().then(() => {
      isPlaying = true;
      updatePlayBtn();
      startViz();
      const t = flatList[trackIdx];
      if (t && t.statId) onTrackPlayStart(t.statId, audio.duration);
    }).catch(e => console.warn('[Audio] Playback failed:', e));
  };
  if (audio.readyState >= 3) {
    startPlayback();
  } else {
    const onCanPlay = () => {
      audio.removeEventListener('canplay', onCanPlay);
      if (_pendingTrackIdx !== null) return;
      startPlayback();
    };
    audio.addEventListener('canplay', onCanPlay);
  }
}

// ══════════════════════════════════════════════════════
//  URL RESOLUTION
// ══════════════════════════════════════════════════════
function resolveTrackSrc(file, album) {
  if (!file || file === '#') return null;
  if (/^https?:\/\//i.test(file)) return file;
  const base = (album.baseUrl || '').trim();
  if (!base) {
    console.warn('[Audio] No baseUrl for album:', album.id, '— using file as-is:', file);
    return file;
  }
  const normalizedBase = base.endsWith('/')   ? base          : base + '/';
  const normalizedFile = file.startsWith('/') ? file.slice(1) : file;
  return normalizedBase + normalizedFile;
}

// ══════════════════════════════════════════════════════
//  FLAT LIST BUILDER
// ══════════════════════════════════════════════════════
function buildFlat(album) {
  const list = [];
  if (!album || !Array.isArray(album.tracks)) return list;
  album.tracks.forEach((t, origIdx) => {
    if (!t.file || t.file === '#') return;
    const files = Array.isArray(t.file) ? t.file : [t.file];
    files.forEach((f, pIdx) => {
      const src = resolveTrackSrc(f, album);
      if (!src) return;
      list.push({
        name:       t.name,
        src,
        albumId:    album.id,
        albumTitle: album.title,
        cover:      album.cover,
        artist:     album.primaryArtist || album.artist || '',
        origIdx,
        pIdx,
        lastPIdx:   files.length - 1,
        isMulti:    files.length > 1,
        statId:     t.statId || null,
        lyrics:     t.lyrics || null,   // path to .txt file or null
      });
    });
  });
  return list;
}

// ══════════════════════════════════════════════════════
//  LOAD ALBUM
// ══════════════════════════════════════════════════════
function loadAlbum(album, startOrigIdx = 0, autoplay = false) {
  if (!album) return;
  flatList = buildFlat(album);
  if (!flatList.length) {
    console.warn('[Audio] No playable tracks in album:', album.id);
    return;
  }
  if (shuffleOn) rebuildShuffle();
  let startIdx = flatList.findIndex(t => t.origIdx === startOrigIdx);
  if (startIdx < 0) startIdx = 0;
  loadTrack(startIdx);
  if (autoplay) playTrack();
}

// ══════════════════════════════════════════════════════
//  LOAD TRACK  (UI-only; does NOT start playback)
// ══════════════════════════════════════════════════════
function loadTrack(idx) {
  if (!flatList.length) return;
  idx = Math.max(0, Math.min(idx, flatList.length - 1));
  trackIdx = idx;
  fullListenFired = false;
  lyricsLines  = [];
  lyricsActive = -1;

  const t = flatList[idx];
  audio.src = t.src;
  audio.load();

  // ── Mini player bar ──
  document.getElementById('playerBar').classList.remove('hidden');
  const artEl = document.getElementById('nowArt');
  artEl.src = t.cover;
  artEl.classList.remove('hidden');
  document.getElementById('nowTitle').textContent  = t.name;
  document.getElementById('nowArtist').textContent = t.artist + ' · ' + t.albumTitle;
  document.getElementById('currTime').textContent  = '0:00';
  document.getElementById('totalTime').textContent = '0:00';
  document.getElementById('seekFill').style.width  = '0%';
  document.getElementById('seekSlider').value      = 0;

  // ── Expanded player (if open, refresh content) ──
  if (expandedOpen) _refreshExpandedMeta();

  // ── Load lyrics if path provided ──
  if (t.lyrics) {
    fetch(t.lyrics)
      .then(r => r.ok ? r.text() : Promise.reject('not found'))
      .then(raw => {
        lyricsLines = parseLyrics(raw);
        if (expandedOpen) renderLyrics(-1);
      })
      .catch(() => {
        lyricsLines = [];
        if (expandedOpen) renderLyrics(-1);
      });
  } else {
    if (expandedOpen) renderLyrics(-1);
  }

  applyVolume();
  renderTrackHighlights();
  updatePlayBtn();

  if (t.statId) recordTrackView(t.statId);

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   t.name,
      artist:  t.artist,
      album:   t.albumTitle,
      artwork: [{ src: t.cover, sizes: '512x512', type: 'image/jpeg' }]
    });
  }
}

// ══════════════════════════════════════════════════════
//  PLAYBACK CONTROLS
// ══════════════════════════════════════════════════════
function playTrack() {
  ensureAudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  applyVolume();
  audio.play().then(() => {
    isPlaying = true;
    updatePlayBtn();
    startViz();
    const t = flatList[trackIdx];
    if (t && t.statId) onTrackPlayStart(t.statId, audio.duration);
  }).catch(e => console.warn('[Audio] Playback failed:', e));
}

function pauseTrack() {
  audio.pause();
  isPlaying = false;
  updatePlayBtn();
  stopViz();
}

function togglePlay() {
  if (!flatList.length) return;
  if (isPlaying) pauseTrack();
  else playTrack();
}

function prevTrack() {
  if (!flatList.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  let ni;
  if (shuffleOn) {
    shufflePos = Math.max(0, shufflePos - 1);
    ni = shuffleOrder[shufflePos];
  } else {
    ni = trackIdx - 1;
    if (ni < 0) ni = repeatMode === 1 ? flatList.length - 1 : 0;
  }
  transitionToTrack(ni, isPlaying);
}

function nextTrack() {
  if (!flatList.length) return;
  let ni;
  if (shuffleOn) {
    shufflePos++;
    if (shufflePos >= shuffleOrder.length) {
      if (repeatMode === 1) { rebuildShuffle(); shufflePos = 0; }
      else { shufflePos = shuffleOrder.length - 1; pauseTrack(); return; }
    }
    ni = shuffleOrder[shufflePos];
  } else {
    ni = trackIdx + 1;
    if (ni >= flatList.length) {
      if (repeatMode === 1) ni = 0;
      else { pauseTrack(); return; }
    }
  }
  transitionToTrack(ni, isPlaying);
}

// ══════════════════════════════════════════════════════
//  SHUFFLE & REPEAT
// ══════════════════════════════════════════════════════
function rebuildShuffle() {
  shuffleOrder = flatList.map((_, i) => i);
  for (let i = shuffleOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
  }
  shufflePos = Math.max(0, shuffleOrder.indexOf(trackIdx));
}

function toggleShuffle() {
  shuffleOn = !shuffleOn;
  if (shuffleOn) rebuildShuffle();
  document.getElementById('btnRandom').classList.toggle('active', shuffleOn);
  showToast(shuffleOn ? 'Shuffle on' : 'Shuffle off');
}

function cycleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  const btn  = document.getElementById('btnRepeat');
  const icon = document.getElementById('repeatIcon');
  btn.classList.remove('active');
  if (repeatMode === 0) {
    icon.className = 'fas fa-redo';
    showToast('Repeat off');
  } else if (repeatMode === 1) {
    icon.className = 'fas fa-redo';
    btn.classList.add('active');
    showToast('Repeat all');
  } else {
    icon.className = 'fas fa-redo-alt';
    btn.classList.add('active');
    showToast('Repeat one');
  }
}

// ══════════════════════════════════════════════════════
//  AUDIO EVENTS
// ══════════════════════════════════════════════════════
audio.addEventListener('timeupdate', () => {
  if (seekDragging) return;
  const cur = audio.currentTime;
  const dur = audio.duration || 0;

  document.getElementById('currTime').textContent  = fmt(cur);
  document.getElementById('totalTime').textContent = fmt(dur);
  const pct = dur ? (cur / dur) * 100 : 0;
  document.getElementById('seekFill').style.width  = pct + '%';
  document.getElementById('seekSlider').value      = pct;

  // Expanded player seek fill
  const expFill = document.getElementById('expSeekFill');
  const expSlider = document.getElementById('expSeekSlider');
  if (expFill)   expFill.style.width = pct + '%';
  if (expSlider) expSlider.value     = pct;

  // Expanded time labels
  const expCur = document.getElementById('expCurrTime');
  const expTot = document.getElementById('expTotalTime');
  if (expCur) expCur.textContent = fmt(cur);
  if (expTot) expTot.textContent = fmt(dur);

  // Lyrics sync
  if (expandedOpen && lyricsLines.length) syncLyrics(cur);

  if (!fullListenFired && dur > 0 && cur / dur >= 0.9) {
    fullListenFired = true;
    onTrackFullListenComplete();
  }
});

audio.addEventListener('loadedmetadata', () => {
  const dur = audio.duration || 0;
  document.getElementById('totalTime').textContent = fmt(dur);
  const t = flatList[trackIdx];
  if (t && t.statId) onTrackPlayStart(t.statId, dur);
});

audio.addEventListener('ended', () => {
  if (repeatMode === 2) { audio.currentTime = 0; audio.play(); }
  else nextTrack();
});

audio.addEventListener('error', () => {
  console.warn('[Audio] Error loading:', audio.src);
  if (flatList.length > 1) setTimeout(nextTrack, 800);
});

// ══════════════════════════════════════════════════════
//  SEEK SLIDER (mini player)
// ══════════════════════════════════════════════════════
const seekSlider = document.getElementById('seekSlider');
seekSlider.addEventListener('mousedown',  () => seekDragging = true);
seekSlider.addEventListener('touchstart', () => seekDragging = true, { passive: true });
seekSlider.addEventListener('input', () => {
  const dur = audio.duration || 0;
  if (!dur) return;
  const t = (seekSlider.value / 100) * dur;
  document.getElementById('currTime').textContent = fmt(t);
  document.getElementById('seekFill').style.width = seekSlider.value + '%';
});
seekSlider.addEventListener('change', () => {
  const dur = audio.duration || 0;
  if (dur) audio.currentTime = (seekSlider.value / 100) * dur;
  seekDragging = false;
});
seekSlider.addEventListener('mouseup',  () => seekDragging = false);
seekSlider.addEventListener('touchend', () => seekDragging = false);

// ══════════════════════════════════════════════════════
//  VOLUME
// ══════════════════════════════════════════════════════
const volSlider = document.getElementById('volSlider');
volSlider.value = 100;
volSlider.addEventListener('input', applyVolume);

function applyVolume() {
  const val = parseInt(volSlider.value) || 0;
  if (gainNode) {
    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(val / 100, now);
  } else {
    audio.volume = Math.min(1, val / 100);
  }
  updateVolFill();
}

function updateVolFill() {
  const val = parseInt(volSlider.value) || 0;
  const max = parseInt(volSlider.max)   || 100;
  document.getElementById('volFill').style.width = (val / max * 100) + '%';
}
updateVolFill();

// ══════════════════════════════════════════════════════
//  LYRICS PARSER
//  Format:  :0.00-0.16: line text here
//  or just: :1.23: line text  (no end time, runs until next)
// ══════════════════════════════════════════════════════
function parseLyrics(raw) {
  const lines = [];
  const re = /^:(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?:\s*(.*)$/;
  raw.split('\n').forEach(line => {
    const m = line.trim().match(re);
    if (m) {
      lines.push({
        start: parseFloat(m[1]),
        end:   m[2] ? parseFloat(m[2]) : null,
        text:  m[3].trim(),
      });
    }
  });
  // Fill in missing end times from next line's start
  lines.forEach((l, i) => {
    if (l.end === null) {
      l.end = lines[i + 1] ? lines[i + 1].start : Infinity;
    }
  });
  return lines;
}

function syncLyrics(currentTime) {
  let active = -1;
  for (let i = 0; i < lyricsLines.length; i++) {
    if (currentTime >= lyricsLines[i].start && currentTime < lyricsLines[i].end) {
      active = i;
      break;
    }
  }
  if (active === lyricsActive) return;
  lyricsActive = active;
  renderLyrics(active);
}

function renderLyrics(activeLine) {
  const container = document.getElementById('expLyricsBody');
  if (!container) return;

  if (!lyricsLines.length) {
    container.innerHTML = '<div class="exp-lyrics-empty">No lyrics for this track</div>';
    return;
  }

  container.innerHTML = lyricsLines.map((l, i) => `
    <div class="exp-lyric-line${i === activeLine ? ' active' : ''}" data-lyric-idx="${i}">
      ${l.text || '<span style="opacity:.3">· · ·</span>'}
    </div>
  `).join('');

  // Scroll active line into center view
  if (activeLine >= 0) {
    const el = container.querySelector(`[data-lyric-idx="${activeLine}"]`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// ══════════════════════════════════════════════════════
//  EXPANDED PLAYER — OPEN / CLOSE
// ══════════════════════════════════════════════════════
function openExpandedPlayer() {
  if (!flatList.length) return;

  // Build overlay if it doesn't exist yet
  if (!document.getElementById('expandedPlayer')) {
    _buildExpandedPlayerDOM();
  }

  const overlay = document.getElementById('expandedPlayer');
  overlay.classList.add('open');
  expandedOpen = true;

  _refreshExpandedMeta();
  renderLyrics(lyricsActive);

  // Wire up expanded seek slider (done once after build)
  const es = document.getElementById('expSeekSlider');
  if (es && !es._wired) {
    es._wired = true;
    es.addEventListener('mousedown',  () => seekDragging = true);
    es.addEventListener('touchstart', () => seekDragging = true, { passive: true });
    es.addEventListener('input', () => {
      const dur = audio.duration || 0;
      if (!dur) return;
      const t = (es.value / 100) * dur;
      document.getElementById('expCurrTime').textContent = fmt(t);
      document.getElementById('expSeekFill').style.width = es.value + '%';
    });
    es.addEventListener('change', () => {
      const dur = audio.duration || 0;
      if (dur) audio.currentTime = (es.value / 100) * dur;
      seekDragging = false;
    });
    es.addEventListener('mouseup',  () => seekDragging = false);
    es.addEventListener('touchend', () => seekDragging = false);
  }
}

function closeExpandedPlayer() {
  const overlay = document.getElementById('expandedPlayer');
  if (overlay) overlay.classList.remove('open');
  expandedOpen = false;
}

function _refreshExpandedMeta() {
  const t = flatList[trackIdx];
  if (!t) return;

  const cover = document.getElementById('expCover');
  const title = document.getElementById('expTitle');
  const artist = document.getElementById('expArtist');
  if (cover)  cover.src          = t.cover;
  if (title)  title.textContent  = t.name;
  if (artist) artist.textContent = t.artist + ' · ' + t.albumTitle;

  // Sync play button state
  const playIcon = document.getElementById('expPlayIcon');
  if (playIcon) playIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';

  // Sync shuffle / repeat
  document.getElementById('expBtnRandom')?.classList.toggle('active', shuffleOn);
  const expRepeatIcon = document.getElementById('expRepeatIcon');
  if (expRepeatIcon) {
    const btn = document.getElementById('expBtnRepeat');
    btn?.classList.remove('active');
    if (repeatMode === 0) {
      expRepeatIcon.className = 'fas fa-redo';
    } else if (repeatMode === 1) {
      expRepeatIcon.className = 'fas fa-redo';
      btn?.classList.add('active');
    } else {
      expRepeatIcon.className = 'fas fa-redo-alt';
      btn?.classList.add('active');
    }
  }
}

function _buildExpandedPlayerDOM() {
  const overlay = document.createElement('div');
  overlay.id = 'expandedPlayer';
  overlay.className = 'exp-overlay';

  // Close on backdrop double-click
  overlay.addEventListener('dblclick', e => {
    if (e.target === overlay) closeExpandedPlayer();
  });

  overlay.innerHTML = `
    <div class="exp-inner">

      <!-- Close button -->
      <button class="exp-close" onclick="closeExpandedPlayer()">
        <i class="fas fa-chevron-down"></i>
      </button>

      <!-- Cover art -->
      <div class="exp-cover-wrap">
        <img id="expCover" class="exp-cover" src="" alt=""/>
      </div>

      <!-- Track meta -->
      <div class="exp-meta">
        <div id="expTitle"  class="exp-title">—</div>
        <div id="expArtist" class="exp-artist">—</div>
      </div>

      <!-- Seek bar -->
      <div class="exp-seek-wrap">
        <div class="exp-seek-track">
          <div class="exp-seek-fill" id="expSeekFill"></div>
          <input type="range" class="exp-seek-input" id="expSeekSlider" min="0" max="100" value="0" step="0.1"/>
        </div>
        <div class="exp-time-row">
          <span id="expCurrTime">0:00</span>
          <span id="expTotalTime">0:00</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="exp-controls">
        <button class="exp-ctrl-btn" id="expBtnRandom"  onclick="toggleShuffle()">
          <i class="fas fa-random"></i>
        </button>
        <button class="exp-ctrl-btn" onclick="prevTrack()">
          <i class="fas fa-step-backward"></i>
        </button>
        <button class="exp-ctrl-btn exp-ctrl-play" onclick="togglePlay(); document.getElementById('expPlayIcon').className = isPlaying ? 'fas fa-pause' : 'fas fa-play';">
          <i id="expPlayIcon" class="fas fa-play"></i>
        </button>
        <button class="exp-ctrl-btn" onclick="nextTrack()">
          <i class="fas fa-step-forward"></i>
        </button>
        <button class="exp-ctrl-btn" id="expBtnRepeat" onclick="cycleRepeat(); _refreshExpandedMeta();">
          <i id="expRepeatIcon" class="fas fa-redo"></i>
        </button>
      </div>

      <!-- Lyrics panel -->
      <div class="exp-lyrics-panel">
        <div class="exp-lyrics-label">LYRICS</div>
        <div class="exp-lyrics-body" id="expLyricsBody">
          <div class="exp-lyrics-empty">No lyrics for this track</div>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);
}

// ══════════════════════════════════════════════════════
//  MINI PLAYER — click cover to open expanded
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Click on now-playing art opens expanded player
  document.getElementById('nowArt')?.addEventListener('click', openExpandedPlayer);

  // Double-click anywhere on the player bar background (not buttons/sliders)
  document.getElementById('playerBar')?.addEventListener('dblclick', e => {
    const tag = e.target.tagName;
    if (['BUTTON', 'INPUT', 'I'].includes(tag)) return;
    openExpandedPlayer();
  });
});

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function fmt(s) {
  if (!s || isNaN(s) || !isFinite(s)) return '0:00';
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return m + ':' + String(ss).padStart(2, '0');
}

function updatePlayBtn() {
  const icon = document.getElementById('playIcon');
  if (icon) icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';

  // Sync expanded player play icon too
  const expIcon = document.getElementById('expPlayIcon');
  if (expIcon) expIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';

  const heroBtn = document.querySelector('#albumHero .btn-play-all i');
  if (heroBtn) {
    const cur = flatList[trackIdx];
    heroBtn.className = (cur && cur.albumId === currentAlbumId && isPlaying)
      ? 'fas fa-pause'
      : 'fas fa-play';
  }
}

function renderTrackHighlights() {
  const cur = flatList[trackIdx];
  document.querySelectorAll('[data-orig-idx]').forEach(row => {
    const active = cur
      && parseInt(row.dataset.origIdx) === cur.origIdx
      && row.dataset.albumId           === cur.albumId;
    row.classList.toggle('playing', !!active);
  });
}

// ══════════════════════════════════════════════════════
//  VISUALIZER
// ══════════════════════════════════════════════════════
const waveStrokes = document.querySelectorAll('#waveViz .stroke');
let vizFrameId = null;
const vizHeights = Array.from({ length: waveStrokes.length }, () => 3);

function startViz() {
  document.getElementById('waveViz').classList.add('visible');
  if (vizFrameId) return;
  (function frame() {
    if (!isPlaying) { stopViz(); return; }
    if (analyser) {
      const buf  = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);
      const step = Math.max(1, Math.floor(buf.length / waveStrokes.length));
      waveStrokes.forEach((s, i) => {
        const val = buf[i * step] || 0;
        const target = Math.max(10, (val / 255) * 18);
        vizHeights[i] = vizHeights[i] * 0.7 + target * 0.3;
        s.style.height = vizHeights[i] + 'px';
      });
    } else {
      waveStrokes.forEach((s, i) => {
        const h = 4 + Math.abs(Math.sin(Date.now() / 300 + i * 0.8)) * 14;
        s.style.height = h + 'px';
      });
    }
    vizFrameId = requestAnimationFrame(frame);
  })();
}

function stopViz() {
  document.getElementById('waveViz').classList.remove('visible');
  if (vizFrameId) { cancelAnimationFrame(vizFrameId); vizFrameId = null; }
  waveStrokes.forEach(s => s.style.height = '3px');
}
