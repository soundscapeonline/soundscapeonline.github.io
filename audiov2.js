// ══════════════════════════════════════════════════════
//  AUDIOV2.JS — FULL IMPLEMENTATION
// ══════════════════════════════════════════════════════
let audio = new Audio();
audio.preload = 'auto';
audio.crossOrigin = 'anonymous'; // required for Web Audio API + CDN sources

// ── State ──
let flatList    = [];   // [{name,src,albumId,albumTitle,cover,artist,origIdx,pIdx,lastPIdx,isMulti,statId}]
let trackIdx    = -1;
let isPlaying   = false;
let shuffleOn   = false;
let repeatMode  = 0;    // 0=off 1=all 2=one
let shuffleOrder = [];
let shufflePos  = 0;
let seekDragging = false;
let fullListenFired = false; // prevent multiple 90% fires per track

// ── Web Audio API (lazy init) ──
let audioCtx = null, analyser = null, source = null, gainNode = null;

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
  // re-apply current volume into gain node
  applyVolume();
}

// ══════════════════════════════════════════════════════
//  URL RESOLUTION
// ══════════════════════════════════════════════════════
function resolveTrackSrc(file, album) {
  if (!file || file === '#') return null;
  // Already absolute
  if (/^https?:\/\//i.test(file)) return file;
  // Needs baseUrl
  const base = (album.baseUrl || '').trim();
  if (!base) {
    console.warn('[Audio] No baseUrl for album:', album.id, '— using file as-is:', file);
    return file;
  }
  const normalizedBase = base.endsWith('/')   ? base         : base + '/';
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
        statId:     t.statId || null
      });
    });
  });
  return list;
}

// ══════════════════════════════════════════════════════
//  LOAD ALBUM — primary entry point from UI
// ══════════════════════════════════════════════════════
function loadAlbum(album, startOrigIdx = 0, autoplay = false) {
  if (!album) return;
  flatList = buildFlat(album);
  if (!flatList.length) {
    console.warn('[Audio] No playable tracks in album:', album.id);
    return;
  }
  if (shuffleOn) rebuildShuffle();
  // Find flat index for requested origIdx, fall back to 0
  let startIdx = flatList.findIndex(t => t.origIdx === startOrigIdx);
  if (startIdx < 0) startIdx = 0;
  loadTrack(startIdx);
  if (autoplay) playTrack();
}

// ══════════════════════════════════════════════════════
//  LOAD TRACK
// ══════════════════════════════════════════════════════
function loadTrack(idx) {
  if (!flatList.length) return;
  idx = Math.max(0, Math.min(idx, flatList.length - 1));
  trackIdx = idx;
  fullListenFired = false;

  const t = flatList[idx];
  audio.src = t.src;
  audio.load();

  // Player bar
  document.getElementById('playerBar').classList.remove('hidden');
  const artEl = document.getElementById('nowArt');
  artEl.src = t.cover;
  artEl.classList.remove('hidden');
  document.getElementById('nowTitle').textContent   = t.name;
  document.getElementById('nowArtist').textContent  = t.artist + ' · ' + t.albumTitle;
  document.getElementById('currTime').textContent   = '0:00';
  document.getElementById('totalTime').textContent  = '0:00';
  document.getElementById('seekFill').style.width   = '0%';
  document.getElementById('seekSlider').value       = 0;

  applyVolume();
  renderTrackHighlights();
  updatePlayBtn();

  // Stats
  if (t.statId) recordTrackView(t.statId);

  // Media Session metadata
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
  if (shuffleOn) {
    shufflePos = Math.max(0, shufflePos - 1);
    loadTrack(shuffleOrder[shufflePos]);
  } else {
    let ni = trackIdx - 1;
    if (ni < 0) ni = repeatMode === 1 ? flatList.length - 1 : 0;
    loadTrack(ni);
  }
  if (isPlaying) playTrack();
}

function nextTrack() {
  if (!flatList.length) return;
  if (shuffleOn) {
    shufflePos++;
    if (shufflePos >= shuffleOrder.length) {
      if (repeatMode === 1) { rebuildShuffle(); shufflePos = 0; }
      else { shufflePos = shuffleOrder.length - 1; pauseTrack(); return; }
    }
    loadTrack(shuffleOrder[shufflePos]);
  } else {
    let ni = trackIdx + 1;
    if (ni >= flatList.length) {
      if (repeatMode === 1) ni = 0;
      else { pauseTrack(); return; }
    }
    loadTrack(ni);
  }
  if (isPlaying) playTrack();
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
  document.getElementById('currTime').textContent     = fmt(cur);
  document.getElementById('totalTime').textContent    = fmt(dur);
  const pct = dur ? (cur / dur) * 100 : 0;
  document.getElementById('seekFill').style.width     = pct + '%';
  document.getElementById('seekSlider').value         = pct;

  // 90% listen — fire once per track load
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
//  SEEK SLIDER
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
    // gainNode allows >100% boost; linear scale from slider
    gainNode.gain.value = val / 100;
  } else {
    // Pre-WebAudio fallback: clamp to 0–1
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

  // Sync album hero button
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