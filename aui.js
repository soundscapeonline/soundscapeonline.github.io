// ══════════════════════════════════════════════════════
//  NAV HISTORY
// ══════════════════════════════════════════════════════
let navHistory = [], navPos = -1;
function pushNav(fn) { if (navPos < navHistory.length - 1) navHistory = navHistory.slice(0, navPos + 1); navHistory.push(fn); navPos++; }
function navBack() { if (navPos > 0) { navPos--; navHistory[navPos](); } }
function navFwd() { if (navPos < navHistory.length - 1) { navPos++; navHistory[navPos](); } }

// ══════════════════════════════════════════════════════
//  VIEW SWITCHING
// ══════════════════════════════════════════════════════
let currentAlbumId = null, currentPlaylistId = null;

function showView(id, push = true) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const viewId = 'view' + id.charAt(0).toUpperCase() + id.slice(1);
  const v = document.getElementById(viewId);
  if (v) v.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (id === 'home')          { document.getElementById('navHome')?.classList.add('active');     renderHome();    setTitle('Dashboard', 'Home'); }
  if (id === 'discover')      { document.getElementById('navDiscover')?.classList.add('active'); setTitle('Discover', 'Browse'); }
  if (id === 'search')        { document.getElementById('navSearch')?.classList.add('active');   setTitle('Search', 'Find Music'); }
  if (id === 'settings')      { document.getElementById('navSettings')?.classList.add('active'); setTitle('Settings', 'Preferences'); }
  if (id === 'fullReleased')  setTitle('Library', 'Official Releases');
  if (id === 'fullUnreleased') setTitle('Library', 'Shelved & Unreleased');
  if (id === 'fullAllAlbums') setTitle('Library', 'All Albums');
  if (id === 'profile')       setTitle('Profile', getCurrentUser()?.displayName || getCurrentUser()?.username || 'My Profile');
}

function renderHome() {
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const releasedCount = ALBUMS.filter(a => a.type !== 'unreleased').length;
  const countSpan = document.getElementById('releasedCountSpan');
  if (countSpan) countSpan.textContent = `(${releasedCount} albums)`;

  const artistsEl = document.getElementById('homeFeaturedArtists');
  if (artistsEl) {
    artistsEl.innerHTML = '';
    const ALL_ARTISTS = [
      'Kanye West','Tyler, the Creator','Kendrick Lamar','Lil Uzi Vert','Playboi Carti',
      'JAŸ-Z','Kid Cudi','Ty Dolla $ign','Kids See Ghosts','GOOD Music','¥$','Travis Scott',
      'SCANDAL','Mac DeMarco','Syndicate.','oddfuture','A$AP ROCKY','HOMIXIDE GANG',
      'Ken Carson','Destroy Lonely','Frank Ocean','MF DOOM','King Ghidra','Rhap5ody'
    ];
    const picks = shuffle([...new Set(ALL_ARTISTS)]).slice(0, 10);
    picks.forEach(artist => {
      const profile = getArtistProfile(artist);
      const card = document.createElement('div');
      card.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;width:90px;';
      card.innerHTML = `
        <div style="width:72px;height:72px;border-radius:50%;background:var(--surface3);overflow:hidden;border:2px solid var(--border);transition:border-color .2s;">
          <img src="${profile.pfp || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}"
               style="width:100%;height:100%;object-fit:cover;"
               onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'"/>
        </div>
        <div style="font-size:11px;text-align:center;font-family:'Space Mono',monospace;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;">${artist}</div>`;
      card.addEventListener('mouseenter', () => card.querySelector('div').style.borderColor = 'var(--accent2)');
      card.addEventListener('mouseleave', () => card.querySelector('div').style.borderColor = 'var(--border)');
      card.addEventListener('click', () => openArtist(artist));
      artistsEl.appendChild(card);
    });
  }

  const grid = document.getElementById('gridHome');
  if (grid) {
    grid.innerHTML = '';
    const recent = [...ALBUMS].filter(a => a.type !== 'unreleased').slice(-6).reverse();
    recent.forEach(album => grid.appendChild(makeAlbumCard(album)));
  }

  const recGrid = document.getElementById('gridHomeRecommended');
  if (recGrid) {
    recGrid.innerHTML = '';
    shuffle(ALBUMS).slice(0, 18).forEach(album => recGrid.appendChild(makeAlbumCard(album)));
  }

  const unrelGrid = document.getElementById('gridHomeUnreleased');
  if (unrelGrid) {
    unrelGrid.innerHTML = '';
    shuffle(ALBUMS.filter(a => a.type === 'unreleased')).slice(0, 6).forEach(album => unrelGrid.appendChild(makeAlbumCard(album)));
  }
}

// ══════════════════════════════════════════════════════
//  DISCOVER VIEW
// ══════════════════════════════════════════════════════
const DISCOVER_RELEASED_LIMIT = 18;
const DISCOVER_UNRELEASED_LIMIT = 6;

function renderDiscover() {
  const official = document.getElementById('gridOfficial');
  const unreleased = document.getElementById('gridUnreleased');
  official.innerHTML = '';
  unreleased.innerHTML = '';
  ALBUMS.filter(a => a.type !== 'unreleased').slice(0, DISCOVER_RELEASED_LIMIT).forEach(album => official.appendChild(makeAlbumCard(album)));
  ALBUMS.filter(a => a.type === 'unreleased').slice(0, DISCOVER_UNRELEASED_LIMIT).forEach(album => unreleased.appendChild(makeAlbumCard(album)));
}

function makeAlbumCard(album) {
  const card = document.createElement('div');
  card.className = 'album-card';
  card.innerHTML = `<img class="album-card-art" src="${album.cover}" alt="${album.title}" onerror="this.style.background='#222'"/><div class="album-card-title">${album.title}</div><div class="album-card-sub">${album.artist} · ${album.year}</div>`;
  card.addEventListener('click', () => openAlbum(album.id));
  return card;
}

function openFullList(type, push = true) {
  if (type === 'allAlbums') {
    const albums = [...ALBUMS];
    const grid = document.getElementById('gridFullAllAlbums');
    const desc = document.getElementById('fullAllAlbumsDesc');
    if (grid) { grid.innerHTML = ''; if (desc) desc.textContent = `${albums.length} total projects`; albums.forEach(album => grid.appendChild(makeAlbumCard(album))); }
    showView('fullAllAlbums'); setTitle('Library', 'All Albums');
    if (push) pushNav(() => openFullList('allAlbums', false));
  } else if (type === 'released') {
    const albums = ALBUMS.filter(a => a.type !== 'unreleased');
    const grid = document.getElementById('gridFullReleased');
    const desc = document.getElementById('fullReleasedDesc');
    if (grid) { grid.innerHTML = ''; if (desc) desc.textContent = `${albums.length} official albums`; albums.forEach(album => grid.appendChild(makeAlbumCard(album))); }
    showView('fullReleased'); setTitle('Library', 'Official Releases');
    if (push) pushNav(() => openFullList('released', false));
  } else {
    const albums = ALBUMS.filter(a => a.type === 'unreleased');
    const grid = document.getElementById('gridFullUnreleased');
    const desc = document.getElementById('fullUnreleasedDesc');
    if (grid) { grid.innerHTML = ''; if (desc) desc.textContent = `${albums.length} shelved / unreleased projects`; albums.forEach(album => grid.appendChild(makeAlbumCard(album))); }
    showView('fullUnreleased'); setTitle('Library', 'Shelved & Unreleased');
    if (push) pushNav(() => openFullList('unreleased', false));
  }
}

// ══════════════════════════════════════════════════════
//  ARTIST PROFILES
// ══════════════════════════════════════════════════════
const ARTIST_PROFILES = {
  "Kanye West": { pfp: "https://i.scdn.co/image/ab6761610000e5eb6e835a500e791bf9c27a422a", banner: "", bio: "Chicago-born rapper, producer, and creative director. One of the most influential artists in hip-hop history." },
  "JAŸ-Z": { pfp: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Flag_of_Israel.svg/1280px-Flag_of_Israel.svg.png", banner: "", bio: "Brooklyn rapper, entrepreneur, and business mogul. Co-founder of Roc-A-Fella Records and Tidal. epstien associate, fled the country and changed his name to jaÿ-z." },
  "Kid Cudi": { pfp: "https://bookingagentinfo.com/wp-content/uploads/2025/04/ab6761610000e5eb876faa285687786c3d314ae0-1.jpg", banner: "", bio: "Cleveland rapper and singer known for introspective, genre-defying music." },
  "Ty Dolla $ign": { pfp: "https://thefader-res.cloudinary.com/private_images/w_1440,c_limit,f_auto,q_auto:best/5_sibjco/ty-dolla-sign-beach-house-3-deluxe-lauren-jauregui-interview.jpg", banner: "", bio: "Los Angeles-based rapper and singer, frequent collaborator on the ¥$ project." },
  "Kids See Ghosts": { pfp: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDfpzGj1OevZrpaF5Si8udmsr7GBC45v_SFiE2-nRFxyiATU3iQzRiqWk&s=10", banner: "", bio: "Supergroup formed by Kanye West and Kid Cudi, releasing their self-titled debut in 2018." },
  "GOOD Music": { pfp: "https://raw.githubusercontent.com/dontevenjokelad/dontevenjokelad.github.io/main/images/artists/goodmusic.png", banner: "", bio: "Kanye West's record label collective featuring Big Sean, Pusha T, Teyana Taylor, and more." },
  "¥$": { pfp: "https://www.colorhexa.com/000000.png", banner: "", bio: "Collaborative project between Kanye West and Ty Dolla $ign, released as Vultures 1 & 2." },
  "Playboi Carti": { pfp: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyYjY8Zksm8LgCrHGD_Mwp7eM8xh7tMRuxeBQ-fkcrravILrjWhkGYvn7-&s=10", banner: "", bio: "Atlanta-based rapper known for his experimental sound and Die Lit." },
  "Lil Uzi Vert": { pfp: "https://assets-cdn-prod.muso.ai/images/avatar/b9ead624-424b-4385-805f-6cd79b9759c0_7e7c17d5-b7ad-494e-a7aa-6a6cca3dbf41.jpeg", banner: "", bio: "Philadelphia rapper known for Eternal Atake and melodic rap style." },
  "Rhap5ody": { pfp: "https://raw.githubusercontent.com/dontevenjokelad/dontevenjokelad.github.io/main/audio/thoth/covers/cover.png", banner: "", bio: "Upcoming artist with unreleased projects including maybe (Maybe). and Syndicate." },
  "Tyler, the Creator": { pfp: "https://64.media.tumblr.com/a7e3da5794e7065fd966a0e76da356e7/tumblr_ousywxDiY91vk6sabo1_640.pnj", banner: "", bio: "Rapper, producer, and creative director from Ladera Heights, CA. Founder of Odd Future." },
  "Kendrick Lamar": { pfp: "https://cdn.britannica.com/51/259151-050-3D9EDA09/rapper-kendrick-lamar-performs-onstage-at-rolling-loud-miami-2022.jpg", banner: "", bio: "Compton rapper and Pulitzer Prize-winning lyricist. One of the most acclaimed artists of his generation." },
  "Travis Scott": { pfp: "https://i.discogs.com/oln4jg-vGnkoB4PlHmM6dcxl3jerHvyZXO01CwEZRXA/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI3ODAw/NTgwLTE2OTA0OTMw/MjctOTg5NC5qcGVn.jpeg", banner: "", bio: "Houston rapper, producer, and founder of Cactus Jack Records known for the Astroworld era and psychedelic trap sound." },
  "SCANDAL": { pfp: "best-scandal.jpeg", banner: "", bio: "Japanese pop rock band formed in Osaka in 2006, known for energetic performances and anime theme songs. MAMI" },
  "Mac DeMarco": { pfp: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/MacDeMarcoAnotherOne.png/250px-MacDeMarcoAnotherOne.png", banner: "", bio: "Canadian indie rock musician known for laid-back guitar music and albums like Salad Days." },
  "Syndicate.": { pfp: "https://raw.githubusercontent.com/dontevenjokelad/dontevenjokelad.github.io/main/audio/thoth/covers/cover.png", banner: "", bio: "Underground collective associated with Rhap5ody and experimental hip-hop releases." },
  "oddfuture": { pfp: "https://i.discogs.com/wzq9LlXsZeCcDYk-lh9HXPEhZvBXAiRoY08UGWEJpGE/rs:fit/g:sm/q:90/h:568/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI0ODQ5/MDUtMTI5MDI5Mjc0/NC5naWY.jpeg", banner: "", bio: "Los Angeles hip-hop collective founded by Tyler, the Creator featuring Earl Sweatshirt, Frank Ocean, and others." },
  "A$AP ROCKY": { pfp: "https://i.discogs.com/CQbJuug8Rs_5VKiK-KpMp9CrWrSB63s6x0JFExLcClw/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTM2MjI5/OTA5LTE3Njg2MDI2/NTAtMzQwNi5qcGVn.jpeg", banner: "", bio: "Harlem rapper and member of the A$AP Mob known for fashion influence and albums like LONG.LIVE.A$AP." },
  "HOMIXIDE GANG": { pfp: "https://i.discogs.com/QaSh_cyQoLV57G6I7CLCN63U0oi5V5iLTodsh-iaQSg/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI4MDU3/NjQxLTE2OTI4MjM2/OTQtNTU2MS5qcGVn.jpeg", banner: "", bio: "Atlanta rap duo Homixide Gang affiliated with Playboi Carti's Opium label." },
  "Ken Carson": { pfp: "https://i.discogs.com/Nf2gS-ZEPqxbRQkk5Ft_9crQ_N0yMOFSLEtMP9O-nnE/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI0MDcy/MTA3LTE2NTkzOTY2/MTktNTM1Ni5qcGVn.jpeg", banner: "", bio: "Atlanta rapper signed to Playboi Carti's Opium label, known for the albums Project X and A Great Chaos." },
  "Destroy Lonely": { pfp: "https://i.discogs.com/-PvJ6Z11VG_douKzQNPagP47LQ32TOfUW19-HDAN_W0/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTMyNDQz/MTMxLTE3MzMwMTIy/NjEtNDM3Ny5qcGVn.jpeg", banner: "", bio: "Atlanta rapper and Opium artist known for the albums NO STYLIST and If Looks Could Kill." },
  "Frank Ocean": { pfp: "https://i.discogs.com/vj8YDK3sf3Z16PuTau3UEjcxV89V-H-jLsq7ET2mfIE/rs:fit/g:sm/q:90/h:599/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTk1MDky/NDgtMTQ4MTgxMzM0/Ny0yODEyLmpwZWc.jpeg", banner: "", bio: "Singer, songwriter, and former Odd Future member acclaimed for albums Blonde and Channel Orange." },
  "MF DOOM": { pfp: "https://i.discogs.com/P4f-Xk_3Iwt_LIoWwjbCIs0NH3XEVy3B2rf9kPcO8gg/rs:fit/g:sm/q:90/h:569/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTM3NTU1/MS0xNTM2NDc3NjM0/LTMyNzQucG5n.jpeg", banner: "", bio: "Legendary masked rapper and producer known for intricate lyricism and projects like Madvillainy." },
  "King Ghidra": { pfp: "https://m.media-amazon.com/images/I/71v0-K9anzL._UF1000,1000_QL80_.jpg", banner: "", bio: "Alias of MF DOOM used for the 2003 album Take Me to Your Leader, inspired by the Godzilla villain King Ghidorah." },
"2 Chainz": { pfp: "https://i.discogs.com/GLB5bKIiNzwoBHP97ASeu6FHzGS-LO4rUTql2u56yjw/rs:fit/g:sm/q:90/h:500/w:500/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTQ3Mjkw/NDMtMTM3MzYzMTEz/Ni0zMzc3LmpwZWc.jpeg", banner: "", bio: "" },
"Big Sean": { pfp: "https://i.discogs.com/Lq9gFlYRPveK81zSAoRTn8z_UQmEZp8Ko5lFSmnr-WQ/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTEwNTUz/MzYxLTE1NjIyNzAx/NDQtMTg3Ny5qcGVn.jpeg", banner: "", bio: "" },
"Teyana Taylor": { pfp: "https://i.discogs.com/tXzAu4yrC9EAXpY2b8Tvf44hf8bC8WzGFmKAY63yoT4/rs:fit/g:sm/q:90/h:600/w:597/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9BLTEzMDEx/MTAtMTYxNjg3NzU5/NS05MjYxLmpwZWc.jpeg", banner: "", bio: "" },

"John Legend": { pfp: "https://i.discogs.com/Ybf7fXlOezcwpXyRn6cSy9lS8al0xhPA30o6ylwOswc/rs:fit/g:sm/q:90/h:596/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTIwMDc0/NTAtMTI2MzU2OTgz/OS5qcGVn.jpeg", banner: "", bio: "" },
"Madvillain": { pfp: "https://i.discogs.com/5rMRjd77zHTcTsqkF7Jj8rlIUSLFGVhRXEGz4Wbn6ro/rs:fit/g:sm/q:90/h:494/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9BLTE1Nzc2/My0xNzUzNjA3NDU1/LTM3NjMuanBlZw.jpeg", banner: "", bio: "" },
"The Jet Age of Tomorrow": { pfp: "https://i.discogs.com/readJuL-YK42jo6fengtFPSdLAG0qtOC-CSwomzlqkQ/rs:fit/g:sm/q:90/h:269/w:379/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9BLTIwODMx/MzQtMTQwNDQ5OTAz/OC04OTAwLmpwZWc.jpeg", banner: "", bio: "" },
"Danger Doom": { pfp: "https://i.discogs.com/SSp6UqQENsKXrpfdbI918aH8hgYz1qcx1cupuZQVP1w/rs:fit/g:sm/q:90/h:525/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9BLTMyNDYx/OS0xMjUwMTUwMDMz/LnBuZw.jpeg", banner: "", bio: "" },
"Viktor Vaughn": { pfp: "https://i.discogs.com/qc2g1sQy3jhGhWnv_ua8QtsgVW_DzY8DJB9Wkt36FWI/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI2ODA5/OS0xNTEzOTk4MjE3/LTU5ODkucG5n.jpeg", banner: "", bio: "" },
"Yeat": { pfp: "https://i.discogs.com/FobTd7wbEDLqIQNXVAAu4BT82UoPyQJPvprS79JUFVg/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTMzNzM4/MTU2LTE3NDQ5Nzc3/ODMtNzIxMy5wbmc.jpeg", banner: "", bio: "" },
"A$AP Rocky": { pfp: "https://i.discogs.com/CQbJuug8Rs_5VKiK-KpMp9CrWrSB63s6x0JFExLcClw/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTM2MjI5/OTA5LTE3Njg2MDI2/NTAtMzQwNi5qcGVn.jpeg", banner: "", bio: "" },
"Future": { pfp: "https://i.pinimg.com/736x/d4/96/d7/d496d7a19e1fab82e494b71a34a7f1b4.jpg", banner: "", bio: "" },
"Flatbush Zombies": { pfp: "https://i.discogs.com/KjYvBguC7KAeXpa5ufr6oqdXnU8yPsvJVlRXwgF99Qw/rs:fit/g:sm/q:90/h:320/w:320/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI0MTMx/MDE4LTE2NTk5MDI5/NzAtNjE1NS5qcGVn.jpeg", banner: "", bio: "" },
"Odd Future": { pfp: "https://i.discogs.com/wzq9LlXsZeCcDYk-lh9HXPEhZvBXAiRoY08UGWEJpGE/rs:fit/g:sm/q:90/h:568/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI0ODQ5/MDUtMTI5MDI5Mjc0/NC5naWY.jpeg", banner: "", bio: "" },
"Young Thug": { pfp: "https://i.discogs.com/RCUTlk9ouh2Jffd3eHvkHY2upxi-DUmhVeKK_UpYgo0/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTM1MjA0/ODYzLTE3NTg4NjYy/MjItNzkyMS5wbmc.jpeg", banner: "", bio: "" },
"Lil Uzi Vert & Playboi Carti": { pfp: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBObqhVKYP8zDXFDygGU_CkUteGL2pL5nFIw&amp;s", banner: "", bio: "" },
"A$AP Mob": { pfp: "https://i.discogs.com/NuOiNxRFjkkePchuNVbfi91ezoX2jiRCYE4KHdelGZU/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9BLTI4OTg1/NTQtMTc1MTY2MzYw/OC0yODgzLnBuZw.jpeg", banner: "", bio: "" },
"Tame Impala": { pfp: "https://i.discogs.com/_pZNESCaPzf9bTXRrZjabJO9w0spkDk0q2XRaSnihXY/rs:fit/g:sm/q:90/h:400/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9BLTEyNDU1/MTMtMTQ2NjQ5MTkz/OC04NDAxLmpwZWc.jpeg", banner: "", bio: "" },
"Arctic Monkeys": { pfp: "https://i.discogs.com/0ONFvGtxnm2knk4OIBorIQrVWtsMxBX8cVLoWDzPt-w/rs:fit/g:sm/q:90/h:600/w:480/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9BLTM5MTE3/MC0xNzY5MTI4Mjgw/LTE4NjkuanBlZw.jpeg", banner: "", bio: "" },
"Czarface & MF DOOM": { pfp: "https://i.discogs.com/H6e1VL1nR8UkC4iiAi6D3kPDweQbotorEK2liUf-pA4/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE4Mzkw/Nzg3LTE2MTg5OTg5/MTctODAxNC5qcGVn.jpeg", banner: "", bio: "" },
"Joey Bada$$": { pfp: "https://i.discogs.com/GjntRfU6LaCfzHONoqM8JieZXFcG1SU4ynNzXcacoj8/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTY2MTM4/NjYtMTY1OTYyOTgz/OC05MTUxLmpwZWc.jpeg", banner: "", bio: "" },
"Drake & 21 Savage": { pfp: "https://www.rollingstone.com/wp-content/uploads/2022/10/drake-21-savage-album-delayed-1.jpg", banner: "", bio: "" },
"Drake": { pfp: "https://i.discogs.com/gGDbUjSctcWA4VYWj8GrPeehSA93m89Kjzvp5kpwhjU/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI4NTEy/NDE1LTE2OTY1OTAx/MTctNzQ2MS5qcGVn.jpeg", banner: "", bio: "" },
"PARTYNEXTDOOR": { pfp: "", banner: "", bio: "" },
"Drake & PARTYNEXTDOOR": { pfp: "", banner: "", bio: "" },
"": { pfp: "", banner: "", bio: "" },
"": { pfp: "", banner: "", bio: "" }
};

// Normalize Jay-Z variants to the canonical JAŸ-Z entry
function _normalizeArtistName(name) {
  if (!name) return name;
  if (name.trim().toLowerCase() === 'jay-z') return 'JAŸ-Z';
  return name;
}
function getArtistProfile(name) { return ARTIST_PROFILES[_normalizeArtistName(name)] || ARTIST_PROFILES[name] || { pfp: '', banner: '', bio: '' }; }

// ══════════════════════════════════════════════════════
//  ARTIST QR SHARE
// ══════════════════════════════════════════════════════
function openArtistShareModal(artistName) {
  // Inject QRCode library if not already present
  if (!window.QRCode) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
    script.onload = () => _renderArtistQR(artistName);
    document.head.appendChild(script);
  } else {
    _renderArtistQR(artistName);
  }
}

function _renderArtistQR(artistName) {
  // Remove existing modal if any
  const existing = document.getElementById('artistShareModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'artistShareModal';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    background:rgba(0,0,0,.72);backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;
    animation:fadeInOverlay .18s ease;`;

  overlay.innerHTML = `
    <div id="artistShareCard" style="
      background:var(--surface2,#1a1a1a);
      border:1px solid var(--border,#333);
      border-radius:16px;
      padding:32px 28px 24px;
      display:flex;flex-direction:column;align-items:center;gap:20px;
      box-shadow:0 24px 64px rgba(0,0,0,.7);
      min-width:280px;max-width:320px;width:90vw;
      animation:scaleInCard .2s cubic-bezier(.34,1.56,.64,1);
      position:relative;">

      <!-- Close -->
      <button onclick="document.getElementById('artistShareModal').remove()"
        style="position:absolute;top:14px;right:14px;background:none;border:none;color:var(--muted,#888);font-size:18px;cursor:pointer;line-height:1;padding:4px;">✕</button>

      <!-- Header -->
      <div style="text-align:center;">
        <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--muted,#888);text-transform:uppercase;margin-bottom:6px;">Share Artist</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:1px;">${artistName}</div>
      </div>

      <!-- QR canvas -->
      <div style="background:#fff;border-radius:10px;padding:12px;display:flex;align-items:center;justify-content:center;">
        <canvas id="artistQRCanvas"></canvas>
      </div>

      <!-- URL pill -->
      <div id="artistShareUrlPill" style="
        background:var(--surface3,#2a2a2a);border:1px solid var(--border,#333);
        border-radius:20px;padding:8px 14px;
        font-family:'Space Mono',monospace;font-size:10px;color:var(--muted,#888);
        word-break:break-all;text-align:center;max-width:100%;cursor:pointer;"
        title="Click to copy"
        onclick="_copyArtistShareUrl(this)">
        ${window.location.href}
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:10px;width:100%;">
        <button onclick="_downloadArtistQR('${artistName.replace(/'/g, "\\'")}')"
          style="flex:1;background:var(--surface3,#2a2a2a);border:1px solid var(--border,#333);color:var(--text,#fff);border-radius:8px;padding:10px 0;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .15s,border-color .15s;"
          onmouseover="this.style.borderColor='var(--text)'" onmouseout="this.style.borderColor='var(--border)'">
          <i class="fas fa-download"></i> Download
        </button>
        <button onclick="_copyArtistShareUrl(document.getElementById('artistShareUrlPill'))"
          style="flex:1;background:var(--surface3,#2a2a2a);border:1px solid var(--border,#333);color:var(--text,#fff);border-radius:8px;padding:10px 0;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .15s,border-color .15s;"
          onmouseover="this.style.borderColor='var(--text)'" onmouseout="this.style.borderColor='var(--border)'">
          <i class="fas fa-link"></i> Copy Link
        </button>
      </div>
    </div>`;

  // Inject keyframe CSS once
  if (!document.getElementById('artistShareModalCSS')) {
    const style = document.createElement('style');
    style.id = 'artistShareModalCSS';
    style.textContent = `
      @keyframes fadeInOverlay { from { opacity:0; } to { opacity:1; } }
      @keyframes scaleInCard { from { opacity:0;transform:scale(.88); } to { opacity:1;transform:scale(1); } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Render QR after DOM is ready
  requestAnimationFrame(() => {
    const canvas = document.getElementById('artistQRCanvas');
    if (!canvas) return;
    QRCode.toCanvas(canvas, window.location.href, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } }, err => {
      if (err) console.error('QR error:', err);
    });
  });
}

function _downloadArtistQR(artistName) {
  const canvas = document.getElementById('artistQRCanvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `${artistName.replace(/[^a-z0-9]/gi, '_')}_qr.png`;
  link.href = canvas.toDataURL();
  link.click();
}

function _copyArtistShareUrl(el) {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const orig = el.textContent;
    el.textContent = '✓ Copied!';
    el.style.color = '#2ecc71';
    el.style.borderColor = '#2ecc71';
    setTimeout(() => {
      el.textContent = orig;
      el.style.color = '';
      el.style.borderColor = '';
    }, 1800);
  }).catch(() => {
    showToast('Copy failed — please copy the URL manually');
  });
}

// ══════════════════════════════════════════════════════
//  HIDDEN TRACKS  (persisted per user)
// ══════════════════════════════════════════════════════
function getHiddenTracks() {
  const u = getCurrentUser(); if (!u) return [];
  const a = getAccounts();
  return a[u.id].hiddenTracks || [];
}
function isTrackHidden(albumId, origIdx) {
  return getHiddenTracks().some(h => h.albumId === albumId && h.origIdx === origIdx);
}
function toggleHideTrack(albumId, origIdx) {
  const u = getCurrentUser(); if (!u) { openModal('modalAuth'); return; }
  const a = getAccounts(); const acc = a[u.id];
  if (!acc.hiddenTracks) acc.hiddenTracks = [];
  const idx = acc.hiddenTracks.findIndex(h => h.albumId === albumId && h.origIdx === origIdx);
  if (idx === -1) { acc.hiddenTracks.push({ albumId, origIdx }); showToast('Track hidden'); }
  else { acc.hiddenTracks.splice(idx, 1); showToast('Track unhidden'); }
  saveAccounts(a);
}

// ══════════════════════════════════════════════════════
//  FAVORITED TRACKS  (persisted per user)
// ══════════════════════════════════════════════════════
function getFavoriteTracks() {
  const u = getCurrentUser(); if (!u) return [];
  const a = getAccounts();
  return a[u.id].favoriteTracks || [];
}
function isTrackFavorited(albumId, origIdx) {
  return getFavoriteTracks().some(f => f.albumId === albumId && f.origIdx === origIdx);
}
function toggleFavoriteTrack(albumId, origIdx) {
  const u = getCurrentUser(); if (!u) { openModal('modalAuth'); return; }
  const a = getAccounts(); const acc = a[u.id];
  if (!acc.favoriteTracks) acc.favoriteTracks = [];
  const idx = acc.favoriteTracks.findIndex(f => f.albumId === albumId && f.origIdx === origIdx);
  if (idx === -1) {
    const album = ALBUMS.find(al => al.id === albumId);
    const track = album?.tracks[origIdx];
    if (!track) return;
    acc.favoriteTracks.push({ albumId, origIdx, name: track.name, cover: album.cover, artist: album.primaryArtist || album.artist, albumTitle: album.title });
    showToast('❤️ Added to favorites');
  } else {
    acc.favoriteTracks.splice(idx, 1);
    showToast('Removed from favorites');
  }
  saveAccounts(a);
}

// ══════════════════════════════════════════════════════
//  TRACK SIDE PANEL  (replaces old ctx menu for tracks)
// ══════════════════════════════════════════════════════
function openTrackPanel(albumId, origIdx) {
  const album = ALBUMS.find(a => a.id === albumId);
  const track = album?.tracks[origIdx];
  if (!track) return;

  const u = getCurrentUser();
  const favorited = u && isTrackFavorited(albumId, origIdx);
  const hidden = u && isTrackHidden(albumId, origIdx);

  // Build or reuse panel
  let panel = document.getElementById('trackSidePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'trackSidePanel';
    panel.style.cssText = `
      position:fixed;right:-340px;top:0;width:320px;height:100%;
      background:var(--surface2,#1a1a1a);border-left:1px solid var(--border,#333);
      z-index:9000;display:flex;flex-direction:column;transition:right .28s cubic-bezier(.4,0,.2,1);
      box-shadow:-4px 0 24px rgba(0,0,0,.5);`;
    document.body.appendChild(panel);

    // Overlay to close
    const overlay = document.createElement('div');
    overlay.id = 'trackSidePanelOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:8999;display:none;';
    overlay.addEventListener('click', closeTrackPanel);
    document.body.appendChild(overlay);
  }

  const playlists = u ? (u.playlists || []) : [];

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 16px 12px;border-bottom:1px solid var(--border,#333);">
      <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:2px;color:var(--muted,#888);text-transform:uppercase;">Track Options</div>
      <button onclick="closeTrackPanel()" style="background:none;border:none;color:var(--muted,#888);font-size:18px;cursor:pointer;line-height:1;">✕</button>
    </div>

    <div style="display:flex;gap:14px;align-items:center;padding:16px;border-bottom:1px solid var(--border,#333);">
      <img src="${album.cover}" style="width:56px;height:56px;border-radius:6px;object-fit:cover;" onerror="this.style.background='#333'"/>
      <div style="overflow:hidden;">
        <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${track.name}</div>
        <div style="font-size:12px;color:var(--muted,#888);margin-top:2px;cursor:pointer;" onclick="closeTrackPanel();openAlbum('${albumId}')">${album.title}</div>
        <div style="font-size:11px;color:var(--muted,#888);cursor:pointer;" onclick="closeTrackPanel();openArtist('${(album.primaryArtist || album.artist).replace(/'/g,"\\'")}')">
          ${album.primaryArtist || album.artist}
        </div>
      </div>
    </div>

    <div style="flex:1;overflow-y:auto;padding:8px 0;">

      <!-- Favorite -->
      <div class="track-panel-row" id="tpFavRow" onclick="toggleFavoriteTrack('${albumId}',${origIdx});refreshTrackPanel('${albumId}',${origIdx})">
        <i class="fas ${favorited ? 'fa-heart' : 'fa-heart'}" style="color:${favorited ? '#e74c3c' : 'var(--muted,#888)'};width:20px;text-align:center;"></i>
        <span>${favorited ? 'Remove from Favorites' : 'Add to Favorites'}</span>
      </div>

      <!-- Add to Playlist -->
      <div class="track-panel-row" onclick="openTrackPanelPlaylistPicker('${albumId}',${origIdx})">
        <i class="fas fa-plus" style="width:20px;text-align:center;"></i>
        <span>Add to Playlist</span>
      </div>

      <!-- Hide Track -->
      ${u ? `<div class="track-panel-row" onclick="toggleHideTrack('${albumId}',${origIdx});refreshTrackPanel('${albumId}',${origIdx})">
        <i class="fas ${hidden ? 'fa-eye' : 'fa-eye-slash'}" style="width:20px;text-align:center;"></i>
        <span>${hidden ? 'Unhide Track' : 'Hide Track'}</span>
      </div>` : ''}

      <div style="height:1px;background:var(--border,#333);margin:8px 0;"></div>

      <!-- Go to Album -->
      <div class="track-panel-row" onclick="closeTrackPanel();openAlbum('${albumId}')">
        <i class="fas fa-compact-disc" style="width:20px;text-align:center;"></i>
        <span>Go to Album</span>
      </div>

      <!-- Go to Artist -->
      <div class="track-panel-row" onclick="closeTrackPanel();openArtist('${(album.primaryArtist || album.artist).replace(/'/g,"\\'")}')">
        <i class="fas fa-user" style="width:20px;text-align:center;"></i>
        <span>Go to Artist</span>
      </div>

      ${track.url ? `
      <div style="height:1px;background:var(--border,#333);margin:8px 0;"></div>
      <div class="track-panel-row" onclick="window.open('${track.url}','_blank')">
        <i class="fab fa-spotify" style="width:20px;text-align:center;color:#1DB954;"></i>
        <span>Open on Spotify</span>
      </div>` : ''}

      ${(Array.isArray(track.file) ? track.file[0] : track.file) && (Array.isArray(track.file) ? track.file[0] : track.file) !== '#' ? `
      <div style="height:1px;background:var(--border,#333);margin:8px 0;"></div>
      <div class="track-panel-row" onclick="downloadTrack('${albumId}',${origIdx})">
        <i class="fas fa-download" style="width:20px;text-align:center;"></i>
        <span>Download Track</span>
      </div>` : ''}

    </div>`;

  // Inject CSS for rows once
  if (!document.getElementById('trackPanelCSS')) {
    const style = document.createElement('style');
    style.id = 'trackPanelCSS';
    style.textContent = `
      .track-panel-row {
        display:flex;align-items:center;gap:14px;padding:13px 18px;
        cursor:pointer;font-size:13px;font-family:'Space Mono',monospace;
        transition:background .15s;color:var(--text,#fff);
      }
      .track-panel-row:hover { background:var(--surface3,#2a2a2a); }
      .track-panel-row span { flex:1; }
      #trackSidePanelPlaylistPicker { padding:0; }
      .tpp-row {
        display:flex;align-items:center;gap:12px;padding:11px 18px;cursor:pointer;
        font-size:12px;font-family:'Space Mono',monospace;transition:background .15s;color:var(--text,#fff);
      }
      .tpp-row:hover { background:var(--surface3,#2a2a2a); }
      .tpp-row.already { opacity:.45;cursor:default; }
    `;
    document.head.appendChild(style);
  }

  // Show panel
  document.getElementById('trackSidePanelOverlay').style.display = 'block';
  requestAnimationFrame(() => { panel.style.right = '0'; });
}

function closeTrackPanel() {
  const panel = document.getElementById('trackSidePanel');
  const overlay = document.getElementById('trackSidePanelOverlay');
  if (panel) panel.style.right = '-340px';
  if (overlay) overlay.style.display = 'none';
}

function refreshTrackPanel(albumId, origIdx) {
  // Re-render just the panel in place to reflect state change
  openTrackPanel(albumId, origIdx);
}

function openTrackPanelPlaylistPicker(albumId, origIdx) {
  const panel = document.getElementById('trackSidePanel');
  if (!panel) return;
  const u = getCurrentUser();
  if (!u) { closeTrackPanel(); openModal('modalAuth'); return; }

  const playlists = u.playlists || [];
  const album = ALBUMS.find(a => a.id === albumId);
  const track = album?.tracks[origIdx];

  // Replace panel body with picker
  const body = panel.querySelector('div[style*="flex:1"]');
  if (!body) return;

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:14px 18px 10px;border-bottom:1px solid var(--border,#333);">
      <button onclick="openTrackPanel('${albumId}',${origIdx})" style="background:none;border:none;color:var(--muted,#888);font-size:16px;cursor:pointer;">←</button>
      <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:1px;color:var(--muted,#888);text-transform:uppercase;">Add to Playlist</div>
    </div>
    <div id="trackSidePanelPlaylistPicker" style="flex:1;overflow-y:auto;">
      <div class="tpp-row" onclick="createPlaylistThenAdd('${albumId}',${origIdx})" style="color:var(--accent2,#ccc);">
        <i class="fas fa-plus-circle" style="width:20px;text-align:center;"></i>
        <span>New Playlist</span>
      </div>
      <div style="height:1px;background:var(--border,#333);margin:4px 0;"></div>
      ${playlists.length === 0 ? `<div style="padding:16px 18px;font-size:12px;font-family:'Space Mono',monospace;color:var(--muted,#888);">No playlists yet</div>` : ''}
      ${playlists.map(pl => {
        const already = pl.tracks.some(t => t.albumId === albumId && t.origIdx === origIdx);
        return `<div class="tpp-row${already ? ' already' : ''}" ${!already ? `onclick="doAddToPlaylist('${pl.id}','${albumId}',${origIdx});closeTrackPanel()"` : ''}>
          <div style="width:32px;height:32px;background:var(--surface3,#2a2a2a);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">♪</div>
          <div style="overflow:hidden;">
            <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.name}</div>
            <div style="font-size:10px;color:var(--muted,#888);margin-top:1px;">${pl.tracks.length} tracks${already ? ' · Already added' : ''}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function createPlaylistThenAdd(albumId, origIdx) {
  closeTrackPanel();
  pendingAddTrack = { albumId, origIdx };
  document.getElementById('newPlaylistName').value = '';
  document.getElementById('newPlaylistDesc').value = '';
  openModal('modalCreatePlaylist');
}

// openTrackCtx now opens the side panel
function openTrackCtx(e, albumId, origIdx) {
  e.stopPropagation();
  openTrackPanel(albumId, origIdx);
}

// ══════════════════════════════════════════════════════
//  ALBUM VIEW
// ══════════════════════════════════════════════════════
function openAlbum(id, push = true) {
  const album = ALBUMS.find(a => a.id === id);
  if (!album) return;
  currentAlbumId = id;
  const u = getCurrentUser();
  const saved = u && u.savedAlbums && u.savedAlbums.includes(id);

  setTitle('Album', album.title);

  const hero = document.getElementById('albumHero');
  hero.innerHTML = `
    <img class="album-hero-art" src="${album.cover}" alt="${album.title}" onerror="this.style.background='#333'"/>
    <div class="album-hero-info">
      <div class="album-hero-label">Album · ${album.type === 'unreleased' ? 'Unreleased' : album.year}</div>
      <div class="album-hero-title">${album.title}</div>
      <div class="album-hero-artist" onclick="openArtist('${(album.primaryArtist || album.artist).replace(/'/g, "\\'")}', true)">${album.primaryArtist || album.artist}</div>
      <div class="album-hero-meta">${album.year} · ${album.tracks.length} tracks</div>
      <div class="album-actions">
        <button class="btn-play-all" onclick="playAlbum('${id}')"><i class="fas fa-play"></i></button>
        <button class="btn-save ${saved ? 'saved' : ''}" id="btnSaveAlbum" onclick="toggleSaveAlbum('${id}')">${saved ? '✓ Saved' : '+ Save'}</button>
        <button class="btn-save" onclick="downloadAlbum('${id}')" title="Download Album" style="display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-download"></i> Download</button>
      </div>
    </div>`;

  const rows = document.getElementById('albumTrackRows');
  rows.innerHTML = '';
  let logicalNum = 0;
  album.tracks.forEach((t, origIdx) => {
    const unavail = !t.file || t.file === '#';
    if (!unavail) logicalNum++;
    const row = document.createElement('div');
    row.className = 'track-row' + (unavail ? ' unavailable' : '');
    row.dataset.origIdx = origIdx;
    row.dataset.albumId = id;
    row.innerHTML = `
      <div class="track-num">
        <span class="track-num-text">${logicalNum || '·'}</span>
        <span class="track-num-icon" style="display:none"><i class="fas fa-volume-up"></i></span>
      </div>
      <div class="track-name-cell">${t.name}</div>
      <div class="track-dur">—</div>
      ${!unavail ? `<button class="track-menu-btn" onclick="openTrackCtx(event,'${id}',${origIdx})"><i class="fas fa-ellipsis-h"></i></button>` : '<div></div>'}`;    if (!unavail) {
      row.addEventListener('click', e => {
        if (e.target.closest('.track-menu-btn')) return;
        playAlbumFromTrack(id, origIdx);
      });
    }
    rows.appendChild(row);
  });

showView('album');
  document.getElementById('viewAlbum')?.scrollTo({ top: 0 });
  if (push) pushNav(() => openAlbum(id, false));
  renderSidebarLibrary();
  setTimeout(() => loadDurationsFor(album, (src, dur) => {
    rows.querySelectorAll('.track-row').forEach(row => {
      const oi = parseInt(row.dataset.origIdx);
      const t2 = album.tracks[oi];
      if (!t2) return;
      const files = Array.isArray(t2.file) ? t2.file : [t2.file];
      if (files[0] && files[0] === src) row.querySelector('.track-dur').textContent = dur;
    });
  }), 50);

  // Render album recommendations
  setTimeout(() => renderAlbumRecommendations(id), 0);
}

function renderAlbumRecommendations(albumId) {
  const album = ALBUMS.find(a => a.id === albumId);
  if (!album) return;
  const artistName = album.primaryArtist || album.artist;
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

  // Same artist albums (excluding current)
  const sameArtist = ALBUMS.filter(a => (a.primaryArtist || a.artist) === artistName && a.id !== albumId);
  // Other albums (different artist, shuffled)
  const others = shuffle(ALBUMS.filter(a => (a.primaryArtist || a.artist) !== artistName && a.id !== albumId)).slice(0, 6); // you might also like handler amount

  // Remove old rec section if exists
  const existingRec = document.getElementById('albumRecsSection');
  if (existingRec) existingRec.remove();

  const container = document.getElementById('albumTrackRows')?.parentElement;
  if (!container) return;

  const recSection = document.createElement('div');
  recSection.id = 'albumRecsSection';
  recSection.style.cssText = 'padding:0 24px 32px;';

  if (sameArtist.length) {
    const sec = document.createElement('div');
    sec.innerHTML = `<div class="section-title" style="margin-top:16px;">More from ${artistName}</div><div class="album-grid" style="padding:0 0 16px;"></div>`;
    shuffle(sameArtist).slice(0, 6).forEach(a => sec.querySelector('.album-grid').appendChild(makeAlbumCard(a)));
    recSection.appendChild(sec);
  }

  if (others.length) {
    const sec2 = document.createElement('div');
    sec2.innerHTML = `<div class="section-title" style="margin-top:8px;">You Might Also Like</div><div class="album-grid" style="padding:0;"></div>`;
    others.forEach(a => sec2.querySelector('.album-grid').appendChild(makeAlbumCard(a)));
    recSection.appendChild(sec2);
  }

  container.appendChild(recSection);
}

function downloadAlbum(albumId) {
  const album = ALBUMS.find(a => a.id === albumId);
  if (!album) return;
  const files = album.tracks.map(t => Array.isArray(t.file) ? t.file[0] : t.file).filter(f => f && f !== '#');
  if (!files.length) { showToast('No downloadable tracks'); return; }
  files.forEach(fileUrl => {
    const w = window.open('about:blank', '_blank');
    if (w) { w.location.href = fileUrl; }
  });
}

function downloadTrack(albumId, origIdx) {
  const album = ALBUMS.find(a => a.id === albumId);
  if (!album) return;
  const track = album.tracks[origIdx];
  if (!track) return;
  const fileUrl = Array.isArray(track.file) ? track.file[0] : track.file;
  if (!fileUrl || fileUrl === '#') { showToast('Track not available for download'); return; }
  const w = window.open('about:blank', '_blank');
  if (w) { w.location.href = fileUrl; }
}

function playAlbum(id) {
  const album = ALBUMS.find(a => a.id === id);
  if (!album) return;
  const cur = flatList[trackIdx];
  if (cur && cur.albumId === id && flatList.length) { togglePlay(); updateAlbumPlayBtn(id); return; }
  flatList = buildFlat(album);
  if (shuffleOn) { rebuildShuffle(); loadTrack(shuffleOrder[0]); }
  else loadTrack(0);
  playTrack();
  updateAlbumPlayBtn(id);
}

function updateAlbumPlayBtn(id) {
  const btn = document.querySelector(`#albumHero .btn-play-all`);
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (!icon) return;
  setTimeout(() => { icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play'; }, 50);
}

function playAlbumFromTrack(albumId, origIdx) {
  const album = ALBUMS.find(a => a.id === albumId);
  if (!album) return;
  flatList = buildFlat(album);
  if (shuffleOn) { rebuildShuffle(); }
  const fi = flatList.findIndex(f => f.origIdx === origIdx && f.pIdx === 0);
  loadTrack(fi === -1 ? 0 : fi);
  playTrack();
}

function loadDurationsFor(album, onEach) {
  const fl = buildFlat(album);
  let i = 0;
  function next() {
    if (i >= fl.length) return;
    const t = fl[i++];
    if (t.pIdx > 0) { next(); return; }
    if (cachedDurations[t.src]) { onEach(t.src, cachedDurations[t.src]); next(); return; }
    const a = new Audio();
    a.preload = 'metadata'; a.src = t.src;
    const to = setTimeout(() => { a.src = ''; next(); }, 4000);
    a.onloadedmetadata = () => { clearTimeout(to); const d = fmt(a.duration); cachedDurations[t.src] = d; onEach(t.src, d); next(); };
    a.onerror = () => { clearTimeout(to); next(); };
  }
  next();
}

// ══════════════════════════════════════════════════════
//  ARTIST VIEW
// ══════════════════════════════════════════════════════
function openArtist(artistName, push = true) {
  // Merge Jay-Z variants
  const JAY_Z_VARIANTS = ['jay-z', 'jaÿ-z', 'jaŸ-z'];
  const isJayZ = JAY_Z_VARIANTS.includes(artistName.toLowerCase());
  if (isJayZ) artistName = 'JAŸ-Z';

  const primaryAlbums = ALBUMS.filter(a => {
    const art = a.primaryArtist || a.artist;
    return art === artistName || (isJayZ && JAY_Z_VARIANTS.includes(art.toLowerCase()));
  });
  const featuredOnAlbums = ALBUMS.filter(a => {
    const art = a.primaryArtist || a.artist;
    if (art === artistName || (isJayZ && JAY_Z_VARIANTS.includes(art.toLowerCase()))) return false;
    return a.featuredArtists && a.featuredArtists.some(f => f === artistName || (isJayZ && JAY_Z_VARIANTS.includes(f.toLowerCase())));
  });
  const u = getCurrentUser();
  const following = u && u.following && u.following.includes(artistName);
  const profile = getArtistProfile(artistName);

  setTitle('Artist', artistName);

  const hero = document.getElementById('artistHero');
  hero.style.cssText = 'display:flex;align-items:flex-end;gap:24px;padding:36px 24px 24px;background:linear-gradient(180deg,rgba(255,0,0,.08) 0%,transparent 100%);border-bottom:1px solid var(--border);flex-shrink:0;';
  const pfpHtml = profile.pfp
    ? `<div class="artist-pfp"><img src="${profile.pfp}" alt="${artistName}" onerror="this.parentNode.innerHTML='<img src=\'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png\'/>'"/></div>`
    : `<div class="artist-pfp"><img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"/></div>`;
  hero.innerHTML = `${pfpHtml}<div>
    <div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Artist</div>
    <div style="font-family:'Bebas Neue',sans-serif;font-size:44px;letter-spacing:2px;">${artistName}</div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px;">${primaryAlbums.length} release${primaryAlbums.length !== 1 ? 's' : ''}${featuredOnAlbums.length ? ` · Featured on ${featuredOnAlbums.length} more` : ''}</div>
    ${profile.bio ? `<div style="font-size:12px;color:var(--muted);margin-top:6px;max-width:460px;line-height:1.5;">${profile.bio}</div>` : ''}
    <div style="display:flex;gap:10px;margin-top:14px;align-items:center;">
      <button class="btn-play-all" onclick="playArtist('${artistName.replace(/'/g, "\\'")}')"><i class="fas fa-play"></i></button>
      <button class="btn-follow ${following ? 'following' : ''}" id="btnFollowArtist" onclick="toggleFollowArtist('${artistName.replace(/'/g, "\\'")}')">${following ? 'Following' : 'Follow'}</button>
      <button class="btn-share-artist" onclick="openArtistShareModal('${artistName.replace(/'/g, "\\'")}')"><i class="fas fa-share-alt"></i> Share</button>
    </div>
  </div>`;

  // Inject share button CSS once
  if (!document.getElementById('artistShareBtnCSS')) {
    const style = document.createElement('style');
    style.id = 'artistShareBtnCSS';
    style.textContent = `
      .btn-share-artist {
        display:inline-flex;align-items:center;gap:7px;
        background:none;
        border:1px solid var(--border,#333);
        color:var(--muted,#888);
        border-radius:20px;
        padding:8px 16px;
        font-family:'Space Mono',monospace;
        font-size:11px;
        letter-spacing:.5px;
        cursor:pointer;
        transition:color .18s,border-color .18s,background .18s;
      }
      .btn-share-artist:hover {
        color:var(--text,#fff);
        border-color:var(--text,#fff);
        background:rgba(255,255,255,.06);
      }
    `;
    document.head.appendChild(style);
  }

  const aa = document.getElementById('artistAlbums');
  aa.innerHTML = '';
  aa.style.cssText = 'padding:0 24px 24px;';

  if (primaryAlbums.length) {
    const sec = document.createElement('div');
    sec.innerHTML = `<div class="section-title">Discography</div><div class="album-grid" id="artistPrimaryGrid" style="padding:0 0 20px;"></div>`;
    aa.appendChild(sec);
    primaryAlbums.forEach(album => document.getElementById('artistPrimaryGrid').appendChild(makeAlbumCard(album)));
  }
  if (featuredOnAlbums.length) {
    const sec = document.createElement('div');
    sec.innerHTML = `<div class="section-title">Featured On</div><div class="album-grid" id="artistFeatGrid" style="padding:0 0 20px;"></div>`;
    aa.appendChild(sec);
    featuredOnAlbums.forEach(album => document.getElementById('artistFeatGrid').appendChild(makeAlbumCard(album)));
  }

  // ── "Others You Might Like" – recommended artists ──
  const allArtistsInLib = [...new Set(ALBUMS.map(a => a.primaryArtist || a.artist))];
  // Find artists that share albums/features with this artist
  const relatedSet = new Set();
  ALBUMS.forEach(a => {
    const art = a.primaryArtist || a.artist;
    const isThisArtist = art === artistName || (isJayZ && JAY_Z_VARIANTS.includes(art.toLowerCase()));
    if (isThisArtist && a.featuredArtists) {
      a.featuredArtists.forEach(f => { if (f !== artistName) relatedSet.add(f); });
    }
    if (a.featuredArtists && a.featuredArtists.some(f => f === artistName || (isJayZ && JAY_Z_VARIANTS.includes(f.toLowerCase())))) {
      if (art !== artistName) relatedSet.add(art);
    }
  });
  // Fill with random artists if needed
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  let suggestions = [...relatedSet].filter(n => n && n !== artistName && ALBUMS.some(a => (a.primaryArtist || a.artist) === n));
  if (suggestions.length < 6) {
    const extra = shuffle(allArtistsInLib.filter(n => n && n !== artistName && !relatedSet.has(n)));
    suggestions = [...suggestions, ...extra].slice(0, 10);
  } else {
    suggestions = shuffle(suggestions).slice(0, 10);
  }
  if (suggestions.length) {
    const recSec = document.createElement('div');
    recSec.innerHTML = `<div class="section-title" style="margin-top:8px;">Others You Might Like</div>`;
    const recGrid = document.createElement('div');
    recGrid.style.cssText = 'display:flex;gap:18px;flex-wrap:wrap;padding:0 0 28px;';
    suggestions.forEach(name => {
      const prof = getArtistProfile(name);
      const card = document.createElement('div');
      card.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;width:82px;';
      card.innerHTML = `
        <div style="width:68px;height:68px;border-radius:50%;overflow:hidden;border:2px solid var(--border);transition:border-color .2s;background:var(--surface3);">
          <img src="${prof.pfp || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}"
               style="width:100%;height:100%;object-fit:cover;"
               onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'"/>
        </div>
        <div style="font-size:10px;text-align:center;font-family:'Space Mono',monospace;color:var(--dim,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;">${name}</div>`;
      card.addEventListener('mouseenter', () => card.querySelector('div').style.borderColor = 'var(--accent2)');
      card.addEventListener('mouseleave', () => card.querySelector('div').style.borderColor = 'var(--border)');
      card.addEventListener('click', () => openArtist(name));
      recGrid.appendChild(card);
    });
    recSec.appendChild(recGrid);
    aa.appendChild(recSec);
  }

  showView('artist');
  if (push) pushNav(() => openArtist(artistName, false));
}

function playArtist(artistName) {
  const albums = ALBUMS.filter(a => a.artist === artistName || a.primaryArtist === artistName);
  if (!albums.length) return;
  let all = [];
  albums.forEach(a => all = all.concat(buildFlat(a)));
  flatList = all;
  if (shuffleOn) { rebuildShuffle(); loadTrack(shuffleOrder[0]); }
  else loadTrack(0);
  playTrack();
}

// ══════════════════════════════════════════════════════
//  SAVE ALBUM / FOLLOW ARTIST
// ══════════════════════════════════════════════════════
function toggleSaveAlbum(albumId) {
  const u = getCurrentUser(); if (!u) { openModal('modalAuth'); return; }
  const a = getAccounts(); const acc = a[u.id];
  if (!acc.savedAlbums) acc.savedAlbums = [];
  const i = acc.savedAlbums.indexOf(albumId);
  if (i === -1) { acc.savedAlbums.push(albumId); showToast('Album saved to library'); }
  else { acc.savedAlbums.splice(i, 1); showToast('Removed from library'); }
  saveAccounts(a);
  const btn = document.getElementById('btnSaveAlbum');
  if (btn) { const saved2 = acc.savedAlbums.includes(albumId); btn.textContent = saved2 ? '✓ Saved' : '+ Save'; btn.classList.toggle('saved', saved2); }
  renderSidebarLibrary();
}

function toggleFollowArtist(artistName) {
  const u = getCurrentUser(); if (!u) { openModal('modalAuth'); return; }
  const a = getAccounts(); const acc = a[u.id];
  if (!acc.following) acc.following = [];
  const i = acc.following.indexOf(artistName);
  if (i === -1) { acc.following.push(artistName); showToast('Following ' + artistName); }
  else { acc.following.splice(i, 1); showToast('Unfollowed ' + artistName); }
  saveAccounts(a);
  const btn = document.getElementById('btnFollowArtist');
  if (btn) { const f2 = acc.following.includes(artistName); btn.textContent = f2 ? 'Following' : 'Follow'; btn.classList.toggle('following', f2); }
}

// ══════════════════════════════════════════════════════
//  PLAYLISTS  — core data helpers
// ══════════════════════════════════════════════════════
function getUserPlaylists() { const u = getCurrentUser(); if (!u) return []; return u.playlists || []; }

let pendingAddTrack = null;

function openCreatePlaylist() {
  const u = getCurrentUser(); if (!u) { openModal('modalAuth'); return; }
  document.getElementById('newPlaylistName').value = '';
  document.getElementById('newPlaylistDesc').value = '';
  openModal('modalCreatePlaylist');
}

function openCreatePlaylistFromAdd() {
  closeModal('modalAddToPlaylist');
  document.getElementById('newPlaylistName').value = '';
  document.getElementById('newPlaylistDesc').value = '';
  openModal('modalCreatePlaylist');
}

function doCreatePlaylist() {
  const name = document.getElementById('newPlaylistName').value.trim();
  if (!name) { showToast('Enter a playlist name'); return; }
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const acc = a[u.id];
  if (!acc.playlists) acc.playlists = [];
  const pid = 'pl_' + Date.now();
  acc.playlists.push({ id: pid, name, desc: document.getElementById('newPlaylistDesc').value.trim(), art: '', tracks: [] });
  saveAccounts(a);
  closeModal('modalCreatePlaylist');
  showToast('Playlist created');
  if (pendingAddTrack) { doAddToPlaylist(pid, pendingAddTrack.albumId, pendingAddTrack.origIdx); pendingAddTrack = null; }
  renderSidebarLibrary();
}

function doAddToPlaylist(playlistId, albumId, origIdx) {
  const u = getCurrentUser(); if (!u) return;
  const album = ALBUMS.find(a => a.id === albumId);
  const track = album?.tracks[origIdx]; if (!track) return;
  const a = getAccounts(); const acc = a[u.id];
  const pl = acc.playlists.find(p => p.id === playlistId); if (!pl) return;
  // Prevent duplicate
  if (pl.tracks.some(t => t.albumId === albumId && t.origIdx === origIdx)) { showToast('Already in playlist'); return; }
  pl.tracks.push({ albumId, origIdx, name: track.name, cover: album.cover, artist: album.primaryArtist || album.artist, albumTitle: album.title });
  saveAccounts(a);
  showToast(`Added to "${pl.name}"`);
  renderSidebarLibrary();
  // If currently viewing this playlist, refresh
  if (currentPlaylistId === playlistId) renderPlaylistView(playlistId);
}

// ══════════════════════════════════════════════════════
//  PLAYLIST VIEW
// ══════════════════════════════════════════════════════
function openPlaylistView(playlistId, push = true) {
  const u = getCurrentUser(); if (!u) return;
  const pl = (u.playlists || []).find(p => p.id === playlistId); if (!pl) return;
  currentPlaylistId = playlistId;
  setTitle('Playlist', pl.name);
  renderPlaylistView(playlistId);
  showView('playlist');
  if (push) pushNav(() => openPlaylistView(playlistId, false));
}

function renderPlaylistView(playlistId) {
  const u = getCurrentUser(); if (!u) return;
  const pl = (u.playlists || []).find(p => p.id === playlistId); if (!pl) return;

  const artSrc = pl.art || '';
  const artHtml = artSrc
    ? `<img src="${artSrc}" style="width:110px;height:110px;border-radius:10px;object-fit:cover;" onerror="this.style.background='var(--surface3)'"/>`
    : `<div style="width:110px;height:110px;border-radius:10px;background:linear-gradient(135deg,var(--surface3),var(--surface2));display:flex;align-items:center;justify-content:center;font-size:42px;color:var(--accent2);">♪</div>`;

  const hero = document.getElementById('playlistHero');
  hero.innerHTML = `
    <div style="cursor:pointer;flex-shrink:0;" onclick="promptPlaylistArt('${playlistId}')" title="Change artwork">${artHtml}</div>
    <div>
      <div style="font-size:10px;color:var(--muted);font-family:'Space Mono',monospace;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Playlist</div>
      <div class="playlist-hero-name" id="playlistHeroName">${pl.name}</div>
      <div class="playlist-hero-owner">${u.displayName || u.username}</div>
      <div class="playlist-hero-count">${pl.tracks.length} tracks</div>
      ${pl.desc ? `<div style="font-size:12px;color:var(--muted);margin-top:4px;">${pl.desc}</div>` : ''}
    </div>`;

  document.getElementById('playlistActionRow').innerHTML = `
    <button class="btn-play-all" onclick="playPlaylist('${playlistId}')"><i class="fas fa-play"></i></button>
    <button class="btn-save" onclick="openAddTrackToPlaylistSearch('${playlistId}')">+ Add Songs</button>
    <button class="btn-save" onclick="openPlaylistOptionsPanel('${playlistId}')" style="margin-left:4px;"><i class="fas fa-ellipsis-h"></i></button>`;

  const rows = document.getElementById('playlistTrackRows');
  rows.innerHTML = '';

  if (!pl.tracks.length) {
    rows.innerHTML = '<div class="empty-state" style="padding:20px 0;"><i class="fas fa-music"></i>No tracks yet — add some from any album</div>';
    return;
  }

  pl.tracks.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'playlist-track-row';
    row.innerHTML = `
      <div style="font-size:12px;color:var(--muted);font-family:'Space Mono',monospace;text-align:center;">${i + 1}</div>
      <img class="playlist-track-art" src="${t.cover}" onerror="this.style.background='#222'"/>
      <div class="playlist-track-info">
        <div class="playlist-track-name">${t.name}</div>
        <div class="playlist-track-album">${t.artist} · ${t.albumTitle}</div>
      </div>
      <div style="font-size:11px;color:var(--muted);font-family:'Space Mono',monospace;text-align:right;">—</div>
      <button style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;" onclick="openPlaylistTrackPanel(event,'${playlistId}',${i})">
        <i class="fas fa-ellipsis-h"></i>
      </button>`;
    row.addEventListener('click', e => { if (e.target.closest('button')) return; playPlaylistFromIndex(playlistId, i); });
    rows.appendChild(row);
  });
}

// ══════════════════════════════════════════════════════
//  PLAYLIST TRACK SIDE PANEL  (replaces old ctx menu)
// ══════════════════════════════════════════════════════
function openPlaylistTrackPanel(e, playlistId, trackIndex) {
  e.stopPropagation();
  const u = getCurrentUser(); if (!u) return;
  const pl = (u.playlists || []).find(p => p.id === playlistId); if (!pl) return;
  const t = pl.tracks[trackIndex]; if (!t) return;

  // Reuse the same side panel element
  let panel = document.getElementById('trackSidePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'trackSidePanel';
    panel.style.cssText = `position:fixed;right:-340px;top:0;width:320px;height:100%;background:var(--surface2,#1a1a1a);border-left:1px solid var(--border,#333);z-index:9000;display:flex;flex-direction:column;transition:right .28s cubic-bezier(.4,0,.2,1);box-shadow:-4px 0 24px rgba(0,0,0,.5);`;
    document.body.appendChild(panel);
    const overlay = document.createElement('div');
    overlay.id = 'trackSidePanelOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:8999;display:none;';
    overlay.addEventListener('click', closeTrackPanel);
    document.body.appendChild(overlay);
  }

  const favorited = isTrackFavorited(t.albumId, t.origIdx);
  const hidden = isTrackHidden(t.albumId, t.origIdx);

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 16px 12px;border-bottom:1px solid var(--border,#333);">
      <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:2px;color:var(--muted,#888);text-transform:uppercase;">Track Options</div>
      <button onclick="closeTrackPanel()" style="background:none;border:none;color:var(--muted,#888);font-size:18px;cursor:pointer;">✕</button>
    </div>

    <div style="display:flex;gap:14px;align-items:center;padding:16px;border-bottom:1px solid var(--border,#333);">
      <img src="${t.cover}" style="width:56px;height:56px;border-radius:6px;object-fit:cover;" onerror="this.style.background='#333'"/>
      <div style="overflow:hidden;">
        <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.name}</div>
        <div style="font-size:12px;color:var(--muted,#888);margin-top:2px;">${t.albumTitle}</div>
        <div style="font-size:11px;color:var(--muted,#888);">${t.artist}</div>
      </div>
    </div>

    <div style="flex:1;overflow-y:auto;padding:8px 0;">

      <!-- Favorite -->
      <div class="track-panel-row" onclick="toggleFavoriteTrack('${t.albumId}',${t.origIdx});openPlaylistTrackPanel(event,'${playlistId}',${trackIndex})">
        <i class="fas fa-heart" style="color:${favorited ? '#e74c3c' : 'var(--muted,#888)'};width:20px;text-align:center;"></i>
        <span>${favorited ? 'Remove from Favorites' : 'Add to Favorites'}</span>
      </div>

      <!-- Add to another playlist -->
      <div class="track-panel-row" onclick="openPlaylistTrackAddToPlaylist('${playlistId}',${trackIndex})">
        <i class="fas fa-plus" style="width:20px;text-align:center;"></i>
        <span>Add to Another Playlist</span>
      </div>

      <!-- Hide Track -->
      <div class="track-panel-row" onclick="toggleHideTrack('${t.albumId}',${t.origIdx});openPlaylistTrackPanel(event,'${playlistId}',${trackIndex})">
        <i class="fas ${hidden ? 'fa-eye' : 'fa-eye-slash'}" style="width:20px;text-align:center;"></i>
        <span>${hidden ? 'Unhide Track' : 'Hide Track'}</span>
      </div>

      <div style="height:1px;background:var(--border,#333);margin:8px 0;"></div>

      <!-- Recommend: open album to discover similar -->
      <div class="track-panel-row" onclick="closeTrackPanel();openAlbum('${t.albumId}')">
        <i class="fas fa-thumbs-up" style="width:20px;text-align:center;"></i>
        <span>Go to Album</span>
      </div>

      <!-- Go to Artist -->
      <div class="track-panel-row" onclick="closeTrackPanel();openArtist('${t.artist.replace(/'/g,"\\'")}')">
        <i class="fas fa-user" style="width:20px;text-align:center;"></i>
        <span>Go to Artist</span>
      </div>

      <div style="height:1px;background:var(--border,#333);margin:8px 0;"></div>

      <!-- Remove from this playlist -->
      <div class="track-panel-row" onclick="removePlaylistTrack('${playlistId}',${trackIndex});closeTrackPanel();" style="color:#e74c3c;">
        <i class="fas fa-trash" style="width:20px;text-align:center;"></i>
        <span>Remove from Playlist</span>
      </div>

    </div>`;

  document.getElementById('trackSidePanelOverlay').style.display = 'block';
  requestAnimationFrame(() => { panel.style.right = '0'; });
}

function openPlaylistTrackAddToPlaylist(sourcePlaylistId, trackIndex) {
  const u = getCurrentUser(); if (!u) return;
  const sourcePl = (u.playlists || []).find(p => p.id === sourcePlaylistId); if (!sourcePl) return;
  const t = sourcePl.tracks[trackIndex]; if (!t) return;

  const panel = document.getElementById('trackSidePanel');
  if (!panel) return;
  const body = panel.querySelector('div[style*="flex:1"]');
  if (!body) return;

  const playlists = (u.playlists || []).filter(p => p.id !== sourcePlaylistId);

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:14px 18px 10px;border-bottom:1px solid var(--border,#333);">
      <button onclick="openPlaylistTrackPanel(event,'${sourcePlaylistId}',${trackIndex})" style="background:none;border:none;color:var(--muted,#888);font-size:16px;cursor:pointer;">←</button>
      <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:1px;color:var(--muted,#888);text-transform:uppercase;">Add to Playlist</div>
    </div>
    <div style="overflow-y:auto;">
      <div class="tpp-row" onclick="createPlaylistThenAdd('${t.albumId}',${t.origIdx})" style="color:var(--accent2,#ccc);">
        <i class="fas fa-plus-circle" style="width:20px;text-align:center;"></i>
        <span>New Playlist</span>
      </div>
      <div style="height:1px;background:var(--border,#333);margin:4px 0;"></div>
      ${playlists.length === 0 ? `<div style="padding:16px 18px;font-size:12px;font-family:'Space Mono',monospace;color:var(--muted,#888);">No other playlists</div>` : ''}
      ${playlists.map(pl => {
        const already = pl.tracks.some(x => x.albumId === t.albumId && x.origIdx === t.origIdx);
        return `<div class="tpp-row${already ? ' already' : ''}" ${!already ? `onclick="doAddToPlaylist('${pl.id}','${t.albumId}',${t.origIdx});closeTrackPanel()"` : ''}>
          <div style="width:32px;height:32px;background:var(--surface3,#2a2a2a);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">♪</div>
          <div><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.name}</div>
          <div style="font-size:10px;color:var(--muted,#888);">${pl.tracks.length} tracks${already ? ' · Already added' : ''}</div></div>
        </div>`;
      }).join('')}
    </div>`;
}

// ══════════════════════════════════════════════════════
//  PLAYLIST OPTIONS PANEL  (rename, art, delete, clear)
// ══════════════════════════════════════════════════════
function openPlaylistOptionsPanel(playlistId) {
  const u = getCurrentUser(); if (!u) return;
  const pl = (u.playlists || []).find(p => p.id === playlistId); if (!pl) return;

  let panel = document.getElementById('trackSidePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'trackSidePanel';
    panel.style.cssText = `position:fixed;right:-340px;top:0;width:320px;height:100%;background:var(--surface2,#1a1a1a);border-left:1px solid var(--border,#333);z-index:9000;display:flex;flex-direction:column;transition:right .28s cubic-bezier(.4,0,.2,1);box-shadow:-4px 0 24px rgba(0,0,0,.5);`;
    document.body.appendChild(panel);
    const overlay = document.createElement('div');
    overlay.id = 'trackSidePanelOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:8999;display:none;';
    overlay.addEventListener('click', closeTrackPanel);
    document.body.appendChild(overlay);
  }

  const artSrc = pl.art || '';

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 16px 12px;border-bottom:1px solid var(--border,#333);">
      <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:2px;color:var(--muted,#888);text-transform:uppercase;">Playlist Options</div>
      <button onclick="closeTrackPanel()" style="background:none;border:none;color:var(--muted,#888);font-size:18px;cursor:pointer;">✕</button>
    </div>

    <!-- Art preview + change -->
    <div style="display:flex;gap:14px;align-items:center;padding:16px;border-bottom:1px solid var(--border,#333);">
      <div id="plOptArtPreview" style="width:64px;height:64px;border-radius:8px;overflow:hidden;background:var(--surface3);display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--accent2);flex-shrink:0;cursor:pointer;" onclick="promptPlaylistArt('${playlistId}')">
        ${artSrc ? `<img src="${artSrc}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"/>` : '♪'}
      </div>
      <div style="flex:1;overflow:hidden;">
        <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.name}</div>
        <div style="font-size:12px;color:var(--muted,#888);margin-top:2px;">${pl.tracks.length} tracks</div>
        <div style="font-size:11px;color:var(--accent2,#ccc);cursor:pointer;margin-top:4px;" onclick="promptPlaylistArt('${playlistId}')">Change artwork</div>
      </div>
    </div>

    <!-- Rename -->
    <div style="padding:14px 16px;border-bottom:1px solid var(--border,#333);">
      <div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--muted,#888);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Rename Playlist</div>
      <div style="display:flex;gap:8px;">
        <input id="plOptRenameInput" type="text" value="${pl.name.replace(/"/g,'&quot;')}" style="flex:1;background:var(--surface3,#2a2a2a);border:1px solid var(--border,#333);border-radius:6px;color:var(--text,#fff);padding:8px 10px;font-size:13px;font-family:'Space Mono',monospace;outline:none;"/>
        <button onclick="doRenamePlaylist('${playlistId}')" style="background:var(--accent,#fff);color:#000;border:none;border-radius:6px;padding:8px 14px;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer;white-space:nowrap;">Save</button>
      </div>
    </div>

    <!-- Edit description -->
    <div style="padding:14px 16px;border-bottom:1px solid var(--border,#333);">
      <div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--muted,#888);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Description</div>
      <div style="display:flex;gap:8px;">
        <input id="plOptDescInput" type="text" value="${(pl.desc||'').replace(/"/g,'&quot;')}" placeholder="Add a description…" style="flex:1;background:var(--surface3,#2a2a2a);border:1px solid var(--border,#333);border-radius:6px;color:var(--text,#fff);padding:8px 10px;font-size:13px;font-family:'Space Mono',monospace;outline:none;"/>
        <button onclick="doUpdatePlaylistDesc('${playlistId}')" style="background:var(--accent,#fff);color:#000;border:none;border-radius:6px;padding:8px 14px;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer;white-space:nowrap;">Save</button>
      </div>
    </div>

    <div style="flex:1;overflow-y:auto;padding:8px 0;">

      <!-- Clear all tracks -->
      <div class="track-panel-row" onclick="clearPlaylistTracks('${playlistId}')">
        <i class="fas fa-broom" style="width:20px;text-align:center;"></i>
        <span>Clear All Tracks</span>
      </div>

      <!-- Remove by artist -->
      <div class="track-panel-row" onclick="showRemoveByGroup('${playlistId}','artist')">
        <i class="fas fa-user-minus" style="width:20px;text-align:center;"></i>
        <span>Remove by Artist</span>
      </div>

      <!-- Remove by album -->
      <div class="track-panel-row" onclick="showRemoveByGroup('${playlistId}','album')">
        <i class="fas fa-compact-disc" style="width:20px;text-align:center;"></i>
        <span>Remove by Album</span>
      </div>

      <div style="height:1px;background:var(--border,#333);margin:8px 0;"></div>

      <!-- Delete playlist -->
      <div class="track-panel-row" onclick="deletePlaylist('${playlistId}')" style="color:#e74c3c;">
        <i class="fas fa-trash" style="width:20px;text-align:center;"></i>
        <span>Delete Playlist</span>
      </div>

    </div>`;

  document.getElementById('trackSidePanelOverlay').style.display = 'block';
  requestAnimationFrame(() => { panel.style.right = '0'; });
}

function promptPlaylistArt(playlistId) {
  const url = prompt('Enter image URL for playlist artwork:', '');
  if (url === null) return;
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const pl = a[u.id].playlists.find(p => p.id === playlistId); if (!pl) return;
  pl.art = url.trim();
  saveAccounts(a);
  showToast('Artwork updated');
  renderPlaylistView(playlistId);
  closeTrackPanel();
}

function doRenamePlaylist(playlistId) {
  const input = document.getElementById('plOptRenameInput');
  const name = input ? input.value.trim() : '';
  if (!name) { showToast('Enter a name'); return; }
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const pl = a[u.id].playlists.find(p => p.id === playlistId); if (!pl) return;
  pl.name = name;
  saveAccounts(a);
  showToast('Playlist renamed');
  setTitle('Playlist', name);
  renderPlaylistView(playlistId);
  renderSidebarLibrary();
  closeTrackPanel();
}

function doUpdatePlaylistDesc(playlistId) {
  const input = document.getElementById('plOptDescInput');
  const desc = input ? input.value.trim() : '';
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const pl = a[u.id].playlists.find(p => p.id === playlistId); if (!pl) return;
  pl.desc = desc;
  saveAccounts(a);
  showToast('Description updated');
  renderPlaylistView(playlistId);
  closeTrackPanel();
}

function deletePlaylist(playlistId) {
  if (!confirm('Delete this playlist? This cannot be undone.')) return;
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const acc = a[u.id];
  acc.playlists = (acc.playlists || []).filter(p => p.id !== playlistId);
  saveAccounts(a);
  closeTrackPanel();
  renderSidebarLibrary();
  showToast('Playlist deleted');
  if (currentPlaylistId === playlistId) {
    currentPlaylistId = null;
    showView('home');
  }
}

function clearPlaylistTracks(playlistId) {
  if (!confirm('Remove all tracks from this playlist?')) return;
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const pl = a[u.id].playlists.find(p => p.id === playlistId); if (!pl) return;
  pl.tracks = [];
  saveAccounts(a);
  showToast('Playlist cleared');
  renderPlaylistView(playlistId);
  renderSidebarLibrary();
  closeTrackPanel();
}

function showRemoveByGroup(playlistId, mode) {
  const u = getCurrentUser(); if (!u) return;
  const pl = (u.playlists || []).find(p => p.id === playlistId); if (!pl) return;

  const panel = document.getElementById('trackSidePanel');
  if (!panel) return;
  const body = panel.querySelector('div[style*="flex:1"]');
  if (!body) return;

  const groups = mode === 'artist'
    ? [...new Set(pl.tracks.map(t => t.artist))]
    : [...new Set(pl.tracks.map(t => t.albumTitle))];

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:14px 18px 10px;border-bottom:1px solid var(--border,#333);">
      <button onclick="openPlaylistOptionsPanel('${playlistId}')" style="background:none;border:none;color:var(--muted,#888);font-size:16px;cursor:pointer;">←</button>
      <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:1px;color:var(--muted,#888);text-transform:uppercase;">Remove by ${mode === 'artist' ? 'Artist' : 'Album'}</div>
    </div>
    <div style="overflow-y:auto;">
      ${groups.length === 0 ? `<div style="padding:16px 18px;font-size:12px;font-family:'Space Mono',monospace;color:var(--muted,#888);">No tracks</div>` : ''}
      ${groups.map(g => {
        const cnt = mode === 'artist'
          ? pl.tracks.filter(t => t.artist === g).length
          : pl.tracks.filter(t => t.albumTitle === g).length;
        return `<div class="tpp-row" onclick="${mode === 'artist' ? `removeArtistFromPlaylist('${playlistId}','${g.replace(/'/g,"\\'")}')` : `removeAlbumFromPlaylist('${playlistId}','${g.replace(/'/g,"\\'")}') `};closeTrackPanel()">
          <div style="flex:1;overflow:hidden;">
            <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${g}</div>
            <div style="font-size:10px;color:var(--muted,#888);">${cnt} track${cnt !== 1 ? 's' : ''}</div>
          </div>
          <i class="fas fa-trash" style="color:#e74c3c;font-size:13px;"></i>
        </div>`;
      }).join('')}
    </div>`;
}

// ══════════════════════════════════════════════════════
//  PLAYLIST TRACK — remove / group remove
// ══════════════════════════════════════════════════════
function removePlaylistTrack(playlistId, index) {
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const pl = a[u.id].playlists.find(p => p.id === playlistId); if (!pl) return;
  pl.tracks.splice(index, 1);
  saveAccounts(a);
  renderPlaylistView(playlistId);
  showToast('Track removed');
  renderSidebarLibrary();
}

function removeArtistFromPlaylist(playlistId, artistName) {
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const pl = a[u.id].playlists.find(p => p.id === playlistId); if (!pl) return;
  const before = pl.tracks.length;
  pl.tracks = pl.tracks.filter(t => t.artist !== artistName);
  saveAccounts(a);
  showToast(`Removed ${before - pl.tracks.length} tracks by ${artistName}`);
  renderPlaylistView(playlistId);
  renderSidebarLibrary();
}

function removeAlbumFromPlaylist(playlistId, albumTitle) {
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const pl = a[u.id].playlists.find(p => p.id === playlistId); if (!pl) return;
  const before = pl.tracks.length;
  pl.tracks = pl.tracks.filter(t => t.albumTitle !== albumTitle);
  saveAccounts(a);
  showToast(`Removed ${before - pl.tracks.length} tracks from ${albumTitle}`);
  renderPlaylistView(playlistId);
  renderSidebarLibrary();
}

// ══════════════════════════════════════════════════════
//  PLAYLIST PLAYBACK
// ══════════════════════════════════════════════════════
function playPlaylist(playlistId) {
  const u = getCurrentUser(); if (!u) return;
  const pl = (u.playlists || []).find(p => p.id === playlistId); if (!pl || !pl.tracks.length) return;
  flatList = [];
  pl.tracks.forEach(t => {
    const album = ALBUMS.find(a => a.id === t.albumId); if (!album) return;
    const albumFlat = buildFlat(album);
    const trackEntries = albumFlat.filter(f => f.origIdx === t.origIdx);
    flatList = flatList.concat(trackEntries);
  });
  if (!flatList.length) return;
  if (shuffleOn) rebuildShuffle();
  loadTrack(0);
  playTrack();
}

function playPlaylistFromIndex(playlistId, startIdx) {
  const u = getCurrentUser(); if (!u) return;
  const pl = (u.playlists || []).find(p => p.id === playlistId); if (!pl) return;
  const trackStartIndices = [];
  flatList = [];
  pl.tracks.forEach((t, i) => {
    const album = ALBUMS.find(a => a.id === t.albumId); if (!album) return;
    const albumFlat = buildFlat(album);
    const trackEntries = albumFlat.filter(f => f.origIdx === t.origIdx);
    if (i === startIdx) trackStartIndices.push(flatList.length);
    flatList = flatList.concat(trackEntries);
  });
  if (!flatList.length) return;
  if (shuffleOn) rebuildShuffle();
  loadTrack(trackStartIndices[0] ?? 0);
  playTrack();
}

// ══════════════════════════════════════════════════════
//  SIDEBAR LIBRARY
// ══════════════════════════════════════════════════════
function renderSidebarLibrary() {
  const lib = document.getElementById('sidebarLibrary');
  lib.innerHTML = '';
  const u = getCurrentUser();
  if (!u) { lib.innerHTML = '<div style="padding:12px 10px;font-family:\'Space Mono\',monospace;font-size:11px;color:var(--muted);">Sign in to save albums & create playlists</div>'; return; }
  (u.playlists || []).forEach(pl => {
    const artSrc = pl.art || '';
    const artHtml = artSrc
      ? `<img src="${artSrc}" style="width:38px;height:38px;border-radius:5px;object-fit:cover;" onerror="this.style.display='none'"/>`
      : `<div class="saved-item-art playlist-icon" style="background:linear-gradient(135deg,var(--surface3),var(--surface2));font-size:18px;border-radius:5px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;color:var(--accent2);">♪</div>`;
    const item = document.createElement('div');
    item.className = 'saved-item' + (currentPlaylistId === pl.id ? ' active' : '');
    item.innerHTML = `${artHtml}<div class="saved-item-info"><div class="saved-item-name">${pl.name}</div><div class="saved-item-sub">Playlist · ${pl.tracks.length}</div></div>`;
    item.addEventListener('click', () => openPlaylistView(pl.id));
    lib.appendChild(item);
  });
  (u.savedAlbums || []).forEach(aid => {
    const album = ALBUMS.find(a => a.id === aid); if (!album) return;
    const item = document.createElement('div');
    item.className = 'saved-item' + (currentAlbumId === aid ? ' active' : '');
    item.innerHTML = `<img class="saved-item-art" src="${album.cover}" onerror="this.style.background='#222'"/><div class="saved-item-info"><div class="saved-item-name">${album.title}</div><div class="saved-item-sub">${album.artist}</div></div>`;
    item.addEventListener('click', () => openAlbum(aid));
    lib.appendChild(item);
  });
  if (!u.playlists?.length && !u.savedAlbums?.length) lib.innerHTML += '<div style="padding:8px 10px;font-family:\'Space Mono\',monospace;font-size:11px;color:var(--muted);">Save albums & create playlists to see them here</div>';
}

// ══════════════════════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════════════════════
function openOwnProfile() {
  const u = getCurrentUser(); if (!u) { openModal('modalAuth'); return; }
  setTitle('Profile', u.displayName || u.username);
  renderOwnProfile(); showView('profile');
  pushNav(() => { renderOwnProfile(); showView('profile'); });
}

function renderOwnProfile() {
  const u = getCurrentUser(); if (!u) return;
  const content = document.getElementById('profileContent');
  const stats = [
    { num: (u.savedAlbums || []).length, label: 'SAVED' },
    { num: (u.playlists || []).length, label: 'PLAYLISTS' },
    { num: (u.following || []).length, label: 'FOLLOWING' },
    { num: (u.favoriteTracks || []).length, label: 'FAVORITES' }
  ];
  content.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar" onclick="promptPfpChange()">
        ${u.pfp ? `<img src="${u.pfp}" alt=""/>` : '<span style="font-size:50px;"><img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"/></span>'}
        <div class="profile-avatar-edit"><i class="fas fa-camera"></i></div>
      </div>
      <div>
        <div class="profile-displayname">${u.displayName || u.username}</div>
        <div class="profile-username">@${u.username}</div>
        <div class="profile-id">${u.id}</div>
        <div class="profile-stats">${stats.map(s => `<div class="profile-stat"><div class="profile-stat-num">${s.num}</div><div class="profile-stat-label">${s.label}</div></div>`).join('')}</div>
        <div class="profile-actions">
          <button class="btn btn-secondary" onclick="openModal('modalEditProfile');loadEditProfile()"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-secondary" onclick="doLogout()"><i class="fas fa-sign-out-alt"></i> Sign Out</button>
        </div>
      </div>
    </div>
    <div class="profile-section"><h3>Playlists</h3><div id="profilePlaylists" style="display:flex;flex-wrap:wrap;gap:8px;"></div></div>
    <div class="profile-section"><h3>Saved Albums</h3><div class="album-grid" id="profileAlbums" style="padding:0;"></div></div>
    <div class="profile-section"><h3>Favorite Tracks</h3><div id="profileFavorites"></div></div>`;

  const ppEl = document.getElementById('profilePlaylists');
  (u.playlists || []).forEach(pl => {
    const card = document.createElement('div');
    card.className = 'playlist-card';
    const artHtml = pl.art ? `<img src="${pl.art}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'"/>` : `<div class="playlist-card-icon">♪</div>`;
    card.innerHTML = `${artHtml}<div class="playlist-card-name">${pl.name}</div><div class="playlist-card-count">${pl.tracks.length} tracks</div>`;
    card.addEventListener('click', () => openPlaylistView(pl.id));
    ppEl.appendChild(card);
  });
  if (!(u.playlists || []).length) ppEl.innerHTML = '<div style="font-family:\'Space Mono\',monospace;font-size:12px;color:var(--muted);">No playlists yet</div>';

  const paEl = document.getElementById('profileAlbums');
  (u.savedAlbums || []).forEach(aid => { const album = ALBUMS.find(a => a.id === aid); if (!album) return; paEl.appendChild(makeAlbumCard(album)); });
  if (!(u.savedAlbums || []).length) paEl.innerHTML = '<div style="font-family:\'Space Mono\',monospace;font-size:12px;color:var(--muted);">No saved albums yet</div>';

  const pfEl = document.getElementById('profileFavorites');
  const favs = u.favoriteTracks || [];
  if (!favs.length) {
    pfEl.innerHTML = '<div style="font-family:\'Space Mono\',monospace;font-size:12px;color:var(--muted);">No favorite tracks yet</div>';
  } else {
    favs.forEach((f, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;';
      row.innerHTML = `
        <img src="${f.cover}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;" onerror="this.style.background='#333'"/>
        <div style="flex:1;overflow:hidden;">
          <div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.name}</div>
          <div style="font-size:11px;color:var(--muted);">${f.artist} · ${f.albumTitle}</div>
        </div>
        <i class="fas fa-heart" style="color:#e74c3c;font-size:13px;"></i>`;
      row.addEventListener('click', () => openAlbum(f.albumId));
      pfEl.appendChild(row);
    });
  }
}

function openUserProfile(userId) {
  const accounts = getAccounts(); const u = accounts[userId]; if (!u) return;
  if (isInactive(u)) { showToast('This account is inactive'); return; }
  const me = getCurrentUser(); const isMe = me && me.id === userId; if (isMe) { openOwnProfile(); return; }
  setTitle('User', u.displayName || u.username);
  const content = document.getElementById('userContent');
  content.innerHTML = `<div class="profile-hero"><div class="profile-avatar" style="cursor:default;">${u.pfp ? `<img src="${u.pfp}" alt=""/>` : '<span style="font-size:50px;"><img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"/></span>'}</div><div><div class="profile-displayname">${u.displayName || u.username}</div><div class="profile-username">@${u.username}</div><div class="profile-id">${u.id}</div><div class="profile-stats"><div class="profile-stat"><div class="profile-stat-num">${(u.savedAlbums || []).length}</div><div class="profile-stat-label">SAVED</div></div><div class="profile-stat"><div class="profile-stat-num">${(u.playlists || []).length}</div><div class="profile-stat-label">PLAYLISTS</div></div></div></div></div><div class="profile-section"><h3>Playlists</h3><div id="userPlaylists" style="display:flex;flex-wrap:wrap;gap:8px;"></div></div>`;
  const ppEl = document.getElementById('userPlaylists');
  (u.playlists || []).forEach(pl => { const card = document.createElement('div'); card.className = 'playlist-card'; card.innerHTML = `<div class="playlist-card-icon">♪</div><div class="playlist-card-name">${pl.name}</div><div class="playlist-card-count">${pl.tracks.length} tracks</div>`; ppEl.appendChild(card); });
  if (!(u.playlists || []).length) ppEl.innerHTML = '<div style="font-family:\'Space Mono\',monospace;font-size:12px;color:var(--muted);">No public playlists</div>';
  showView('user'); pushNav(() => openUserProfile(userId));
}

function promptPfpChange() {
  // Remove old panel if exists
  const existing = document.getElementById('pfpPickerPanel');
  if (existing) { existing.remove(); return; }

  const PRESET_PFPS = [
    'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png',
    'https://i.scdn.co/image/ab6761610000e5eb6e835a500e791bf9c27a422a',
    'https://64.media.tumblr.com/a7e3da5794e7065fd966a0e76da356e7/tumblr_ousywxDiY91vk6sabo1_640.pnj',
    'https://bookingagentinfo.com/wp-content/uploads/2025/04/ab6761610000e5eb876faa285687786c3d314ae0-1.jpg',
    'https://cdn.britannica.com/51/259151-050-3D9EDA09/rapper-kendrick-lamar-performs-onstage-at-rolling-loud-miami-2022.jpg',
    'https://i.discogs.com/oln4jg-vGnkoB4PlHmM6dcxl3jerHvyZXO01CwEZRXA/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI3ODAw/NTgwLTE2OTA0OTMw/MjctOTg5NC5qcGVn.jpeg',
    'https://i.discogs.com/CQbJuug8Rs_5VKiK-KpMp9CrWrSB63s6x0JFExLcClw/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTM2MjI5/OTA5LTE3Njg2MDI2/NTAtMzQwNi5qcGVn.jpeg',
    'https://i.discogs.com/vj8YDK3sf3Z16PuTau3UEjcxV89V-H-jLsq7ET2mfIE/rs:fit/g:sm/q:90/h:599/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTk1MDky/NDgtMTQ4MTgxMzM0/Ny0yODEyLmpwZWc.jpeg',
    'https://www.colorhexa.com/000000.png',
    'https://raw.githubusercontent.com/dontevenjokelad/dontevenjokelad.github.io/main/images/artists/goodmusic.png',
  ];

  const panel = document.createElement('div');
  panel.id = 'pfpPickerPanel';
  panel.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    background:rgba(0,0,0,.7);backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;`;

  panel.innerHTML = `
    <div style="background:var(--surface2,#1a1a1a);border:1px solid var(--border,#333);border-radius:16px;
      padding:28px 24px;width:min(92vw,380px);display:flex;flex-direction:column;gap:16px;
      box-shadow:0 24px 64px rgba(0,0,0,.7);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);">Choose Profile Picture</div>
        <button onclick="document.getElementById('pfpPickerPanel').remove()"
          style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;line-height:1;">✕</button>
      </div>

      <div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;">Presets</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${PRESET_PFPS.map(url => `
          <div onclick="_applyPfp('${url}')" style="width:52px;height:52px;border-radius:50%;overflow:hidden;border:2px solid var(--border);cursor:pointer;flex-shrink:0;transition:border-color .15s;"
            onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='var(--border)'">
            <img src="${url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'"/>
          </div>`).join('')}
      </div>

      <div style="height:1px;background:var(--border);"></div>
      <div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;">Or paste image URL</div>
      <div style="display:flex;gap:8px;">
        <input id="pfpUrlInput" type="text" placeholder="https://..." value=""
          style="flex:1;background:var(--surface3,#2a2a2a);border:1px solid var(--border,#333);border-radius:8px;
          color:var(--text,#fff);padding:9px 12px;font-size:12px;font-family:'Space Mono',monospace;outline:none;"/>
        <button onclick="_applyPfp(document.getElementById('pfpUrlInput').value)"
          style="background:var(--accent,#fff);color:#000;border:none;border-radius:8px;padding:9px 16px;
          font-family:'Space Mono',monospace;font-size:11px;cursor:pointer;white-space:nowrap;">Apply</button>
      </div>
    </div>`;

  document.body.appendChild(panel);
  panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });
}

function _applyPfp(url) {
  url = (url || '').trim();
  if (!url) { showToast('Enter a valid URL'); return; }
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); a[u.id].pfp = url; saveAccounts(a);
  document.getElementById('pfpPickerPanel')?.remove();
  renderOwnProfile(); renderTopbarRight(); showToast('Profile picture updated');
}

function loadEditProfile() {
  const u = getCurrentUser(); if (!u) return;
  document.getElementById('editDisplayName').value = u.displayName || '';
  document.getElementById('editPfpUrl').value = u.pfp || '';
  document.getElementById('editOldPass').value = '';
  document.getElementById('editNewPass').value = '';
  document.getElementById('editPassError').style.display = 'none';
}

function saveProfileEdit() {
  const u = getCurrentUser(); if (!u) return;
  const a = getAccounts(); const acc = a[u.id];
  acc.displayName = document.getElementById('editDisplayName').value.trim() || acc.displayName;
  const newPfp = document.getElementById('editPfpUrl').value.trim(); if (newPfp) acc.pfp = newPfp;
  const oldP = document.getElementById('editOldPass').value; const newP = document.getElementById('editNewPass').value;
  if (oldP || newP) {
    if (oldP !== acc.password) { document.getElementById('editPassError').textContent = 'Current password incorrect'; document.getElementById('editPassError').style.display = 'block'; return; }
    if (newP.length < 6) { document.getElementById('editPassError').textContent = 'New password too short'; document.getElementById('editPassError').style.display = 'block'; return; }
    acc.password = newP;
  }
  saveAccounts(a); closeModal('modalEditProfile'); renderOwnProfile(); renderTopbarRight(); showToast('Profile updated');
}

// ══════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════
function switchAuthTab(tab) {
  document.querySelectorAll('#modalAuth .tab').forEach((t, i) => t.classList.toggle('active', i === (tab === 'login' ? 0 : 1)));
  document.getElementById('authLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('authRegister').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('authSuccess').style.display = 'none';
}

function doLogin() {
  const raw = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const accounts = getAccounts();
  const err = document.getElementById('loginError'); err.style.display = 'none';
  const match = Object.values(accounts).find(u => (u.id.toLowerCase() === raw.toLowerCase() || u.username.toLowerCase() === raw.toLowerCase().replace('@', '')) && u.password === pass);
  if (!match) { err.style.display = 'block'; return; }
  if (isInactive(match)) { err.textContent = 'Account inactive (>160 days).'; err.style.display = 'block'; return; }
  setSession(match.id); const a = getAccounts(); a[match.id].lastActive = Date.now(); saveAccounts(a);
  closeModal('modalAuth'); renderTopbarRight(); renderSidebarLibrary(); showToast('Welcome back, ' + (match.displayName || match.username) + '!');
}

function doRegister() {
  const username = document.getElementById('regUser').value.trim().toLowerCase();
  const display = document.getElementById('regDisplay').value.trim();
  const pass = document.getElementById('regPass').value;
  const fallback = document.getElementById('regFallback').value.trim();
  const ue = document.getElementById('regUserError'), re = document.getElementById('regError');
  ue.style.display = 'none'; re.style.display = 'none';
  if (!/^[a-z0-9_]{3,20}$/.test(username)) { ue.textContent = '3–20 chars, letters/numbers/underscores'; ue.style.display = 'block'; return; }
  if (pass.length < 6) { re.textContent = 'Password must be at least 6 characters'; re.style.display = 'block'; return; }
  if (!fallback) { re.textContent = 'Recovery answer is required'; re.style.display = 'block'; return; }
  const accounts = getAccounts();
  if (Object.values(accounts).some(u => u.username === username)) { ue.textContent = 'Username taken'; ue.style.display = 'block'; return; }
  let id; do { id = genId(); } while (accounts[id]);
  const now = Date.now();
  accounts[id] = { id, username, displayName: display || username, password: pass, fallback, pfp: '', playlists: [], savedAlbums: [], following: [], favoriteTracks: [], hiddenTracks: [], createdAt: now, lastActive: now };
  saveAccounts(accounts); setSession(id);
  document.getElementById('newIdBadge').textContent = id;
  document.getElementById('authLogin').style.display = 'none';
  document.getElementById('authRegister').style.display = 'none';
  document.getElementById('authSuccess').style.display = 'block';
  renderTopbarRight(); renderSidebarLibrary();
}

function doLogout() {
  setSession(null); renderTopbarRight(); renderSidebarLibrary();
  showView('home'); showToast('Signed out');
  setTitle('Dashboard', 'Home');
}

// ══════════════════════════════════════════════════════
//  TOPBAR RIGHT
// ══════════════════════════════════════════════════════
function renderTopbarRight() {
  const right = document.getElementById('topbarRight');
  const u = getCurrentUser();
  if (u) {
    right.innerHTML = `<button class="pfp-btn" id="pfpBtn" title="${u.displayName || u.username}" onclick="_handlePfpBtnClick(event)">${u.pfp ? `<img src="${u.pfp}" alt=""/>` : '<img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"/>'}</button>`;
  } else {
    right.innerHTML = `<button class="topbar-btn" onclick="switchAuthTab('login');openModal('modalAuth')">Sign In</button><button class="topbar-btn primary" onclick="switchAuthTab('register');openModal('modalAuth')">Create Account</button>`;
  }
}

// PFP button mini menu: Change PFP or View Profile
function _handlePfpBtnClick(e) {
  e.stopPropagation();
  const existing = document.getElementById('pfpMiniMenu');
  if (existing) { existing.remove(); return; }
  const btn = document.getElementById('pfpBtn');
  const rect = btn ? btn.getBoundingClientRect() : { right: window.innerWidth, bottom: 60 };
  const menu = document.createElement('div');
  menu.id = 'pfpMiniMenu';
  menu.style.cssText = `position:fixed;right:${window.innerWidth - rect.right}px;top:${rect.bottom + 6}px;
    background:var(--surface2,#1a1a1a);border:1px solid var(--border,#333);border-radius:10px;
    z-index:9500;min-width:160px;box-shadow:0 8px 32px rgba(0,0,0,.6);overflow:hidden;`;
  menu.innerHTML = `
    <div onclick="document.getElementById('pfpMiniMenu').remove();promptPfpChange()"
      style="padding:12px 16px;cursor:pointer;font-family:'Space Mono',monospace;font-size:12px;display:flex;align-items:center;gap:10px;transition:background .15s;"
      onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">
      <i class="fas fa-camera" style="width:16px;text-align:center;color:var(--muted);"></i> Change Picture
    </div>
    <div style="height:1px;background:var(--border);margin:0;"></div>
    <div onclick="document.getElementById('pfpMiniMenu').remove();openOwnProfile()"
      style="padding:12px 16px;cursor:pointer;font-family:'Space Mono',monospace;font-size:12px;display:flex;align-items:center;gap:10px;transition:background .15s;"
      onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">
      <i class="fas fa-user" style="width:16px;text-align:center;color:var(--muted);"></i> View Profile
    </div>`;
  document.body.appendChild(menu);
  setTimeout(() => {
    const close = ev => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  }, 10);
}

// ══════════════════════════════════════════════════════
//  MODAL / TOAST / CTX MENU (legacy, still used for simple things)
// ══════════════════════════════════════════════════════
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(el => { el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); }); });

function showToast(msg, dur = 2200) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

let ctxCleanup = null;
function showCtxMenu(x, y, items) {
  const menu = document.getElementById('ctxMenu'); menu.innerHTML = '';
  items.forEach(item => {
    if (!item) return;
    const el = document.createElement('div'); el.className = 'ctx-item' + (item.class ? ' ' + item.class : '');
    el.innerHTML = `<i class="fas ${item.icon}"></i>${item.label}`;
    el.addEventListener('click', () => { menu.classList.remove('open'); item.action(); }); menu.appendChild(el);
  });
  const vw = window.innerWidth, vh = window.innerHeight;
  let mx = x, my = y;
  menu.style.visibility = 'hidden'; menu.style.display = 'block'; menu.classList.add('open');
  const r = menu.getBoundingClientRect(); menu.style.display = '';
  if (mx + r.width > vw) mx = vw - r.width - 8; if (my + r.height > vh) my = vh - r.height - 8;
  menu.style.left = mx + 'px'; menu.style.top = my + 'px';
  if (ctxCleanup) ctxCleanup();
  const close = e => { if (!menu.contains(e.target)) { menu.classList.remove('open'); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 10); ctxCleanup = close;
}

// ══════════════════════════════════════════════════════
//  ADD SONGS — Recommendation Panel
// ══════════════════════════════════════════════════════

// Per-session hidden-from-recommendations set (not persisted, just for this panel session)
let _recHiddenKeys = new Set();

function openAddTrackToPlaylistSearch(playlistId) {
  const u = getCurrentUser(); if (!u) { openModal('modalAuth'); return; }
  const pl = (u.playlists || []).find(p => p.id === playlistId); if (!pl) return;

  _recHiddenKeys = new Set();
  _recSearchQuery = '';

  let panel = document.getElementById('trackSidePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'trackSidePanel';
    panel.style.cssText = `position:fixed;right:-340px;top:0;width:340px;height:100%;background:var(--surface2,#1a1a1a);border-left:1px solid var(--border,#333);z-index:9000;display:flex;flex-direction:column;transition:right .28s cubic-bezier(.4,0,.2,1);box-shadow:-4px 0 24px rgba(0,0,0,.5);`;
    document.body.appendChild(panel);
    const overlay = document.createElement('div');
    overlay.id = 'trackSidePanelOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:8999;display:none;';
    overlay.addEventListener('click', closeTrackPanel);
    document.body.appendChild(overlay);
  }

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px;border-bottom:1px solid var(--border,#333);flex-shrink:0;">
      <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:2px;color:var(--muted,#888);text-transform:uppercase;">Add Songs</div>
      <button onclick="closeTrackPanel()" style="background:none;border:none;color:var(--muted,#888);font-size:18px;cursor:pointer;line-height:1;">&#x2715;</button>
    </div>

    <!-- Search bar -->
    <div style="padding:10px 14px;border-bottom:1px solid var(--border,#333);flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:8px;background:var(--surface3,#2a2a2a);border:1px solid var(--border,#333);border-radius:8px;padding:8px 12px;transition:border-color .15s;" id="recSearchWrap">
        <i class="fas fa-search" style="color:var(--muted,#888);font-size:12px;flex-shrink:0;"></i>
        <input id="recSearchInput" type="text" placeholder="Search tracks, albums, artists..."
          style="flex:1;background:none;border:none;outline:none;color:var(--text,#fff);font-size:12px;font-family:'Space Mono',monospace;min-width:0;"
          oninput="_onRecSearch('${playlistId}', this.value)"
          onfocus="document.getElementById('recSearchWrap').style.borderColor='var(--accent,#fff)'"
          onblur="document.getElementById('recSearchWrap').style.borderColor='var(--border,#333)'"/>
        <button id="recSearchClear" onclick="_clearRecSearch('${playlistId}')"
          style="display:none;background:none;border:none;color:var(--muted,#888);cursor:pointer;font-size:13px;line-height:1;padding:0;flex-shrink:0;">&#x2715;</button>
      </div>
    </div>

    <!-- Tabs (hidden during search) -->
    <div style="display:flex;border-bottom:1px solid var(--border,#333);flex-shrink:0;" id="recTabBar">
      <button class="rec-tab active" data-tab="all" onclick="switchRecTab('all','${playlistId}')">All</button>
      <button class="rec-tab" data-tab="released" onclick="switchRecTab('released','${playlistId}')">Released</button>
      <button class="rec-tab" data-tab="unreleased" onclick="switchRecTab('unreleased','${playlistId}')">Unreleased</button>
    </div>

    <!-- Refresh all (hidden during search) -->
    <div id="recRefreshBar" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border,#333);flex-shrink:0;">
      <div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--muted,#888);letter-spacing:1px;text-transform:uppercase;">Recommendations</div>
      <button onclick="refreshAllRecs('${playlistId}')" style="background:none;border:1px solid var(--border,#333);color:var(--muted,#888);border-radius:20px;padding:4px 12px;font-size:11px;font-family:'Space Mono',monospace;cursor:pointer;display:flex;align-items:center;gap:6px;transition:color .15s,border-color .15s;" onmouseover="this.style.color='var(--text)';this.style.borderColor='var(--text)'" onmouseout="this.style.color='var(--muted)';this.style.borderColor='var(--border)'">
        <i class="fas fa-sync-alt" style="font-size:10px;"></i> Refresh All
      </button>
    </div>

    <!-- Track list -->
    <div id="recTrackList" style="flex:1;overflow-y:auto;padding:6px 0;"></div>`;

  // Inject tab CSS once
  if (!document.getElementById('recPanelCSS')) {
    const style = document.createElement('style');
    style.id = 'recPanelCSS';
    style.textContent = `
      .rec-tab {
        flex:1;padding:10px 0;background:none;border:none;border-bottom:2px solid transparent;
        color:var(--muted,#888);font-family:'Space Mono',monospace;font-size:11px;
        letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:color .15s,border-color .15s;
      }
      .rec-tab.active { color:var(--text,#fff);border-bottom-color:var(--accent,#fff); }
      .rec-track-row {
        display:flex;align-items:center;gap:10px;padding:9px 14px;
        transition:background .15s;border-bottom:1px solid rgba(255,255,255,.04);
      }
      .rec-track-row:hover { background:var(--surface3,#2a2a2a); }
      .rec-track-art { width:40px;height:40px;border-radius:5px;object-fit:cover;flex-shrink:0; }
      .rec-track-info { flex:1;overflow:hidden;cursor:pointer; }
      .rec-track-name { font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .rec-track-sub  { font-size:10px;color:var(--muted,#888);font-family:'Space Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px; }
      .rec-action-btn {
        width:28px;height:28px;border-radius:50%;border:1px solid var(--border,#333);
        background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
        font-size:13px;flex-shrink:0;transition:background .15s,border-color .15s,color .15s;color:var(--muted,#888);
      }
      .rec-action-btn:hover { background:var(--surface3,#2a2a2a);border-color:var(--text);color:var(--text); }
      .rec-action-btn.add:hover { border-color:#2ecc71;color:#2ecc71; }
      .rec-action-btn.hide-btn:hover { border-color:#e74c3c;color:#e74c3c; }
      .rec-section-header {
        display:flex;align-items:center;justify-content:space-between;
        padding:10px 14px 4px;
        font-family:'Space Mono',monospace;font-size:10px;letter-spacing:1.5px;
        text-transform:uppercase;color:var(--muted,#888);
      }
      .rec-refresh-sec {
        background:none;border:none;color:var(--muted,#888);cursor:pointer;font-size:11px;
        display:flex;align-items:center;gap:5px;font-family:'Space Mono',monospace;
        transition:color .15s;padding:0;
      }
      .rec-refresh-sec:hover { color:var(--text,#fff); }
    `;
    document.head.appendChild(style);
  }

  _recCurrentTab = 'all';
  _recCurrentPlaylistId = playlistId;
  renderRecTracks(playlistId, 'all');

  document.getElementById('trackSidePanelOverlay').style.display = 'block';
  requestAnimationFrame(() => { panel.style.right = '0'; });
}

let _recCurrentTab = 'all';
let _recCurrentPlaylistId = null;
let _recSearchQuery = '';
let _recShownReleased = [];
let _recShownUnreleased = [];

let _recSearchDebounce = null;
function _onRecSearch(playlistId, query) {
  _recSearchQuery = query.trim();
  const clearBtn = document.getElementById('recSearchClear');
  if (clearBtn) clearBtn.style.display = _recSearchQuery ? 'block' : 'none';
  const tabBar = document.getElementById('recTabBar');
  const refreshBar = document.getElementById('recRefreshBar');
  if (tabBar) tabBar.style.display = _recSearchQuery ? 'none' : 'flex';
  if (refreshBar) refreshBar.style.display = _recSearchQuery ? 'none' : 'flex';
  clearTimeout(_recSearchDebounce);
  _recSearchDebounce = setTimeout(() => {
    if (_recSearchQuery) { _renderRecSearch(playlistId, _recSearchQuery); }
    else { renderRecTracks(playlistId, _recCurrentTab); }
  }, 180);
}

function _clearRecSearch(playlistId) {
  _recSearchQuery = '';
  const input = document.getElementById('recSearchInput');
  if (input) { input.value = ''; input.focus(); }
  const clearBtn = document.getElementById('recSearchClear');
  if (clearBtn) clearBtn.style.display = 'none';
  const tabBar = document.getElementById('recTabBar');
  const refreshBar = document.getElementById('recRefreshBar');
  if (tabBar) tabBar.style.display = 'flex';
  if (refreshBar) refreshBar.style.display = 'flex';
  renderRecTracks(playlistId, _recCurrentTab);
}

function _renderRecSearch(playlistId, query) {
  const list = document.getElementById('recTrackList');
  if (!list) return;
  list.innerHTML = '';
  const q = query.toLowerCase();
  const u = getCurrentUser();
  const pl = (u?.playlists || []).find(p => p.id === playlistId);
  const inPlaylist = new Set((pl?.tracks || []).map(t => t.albumId + ':' + t.origIdx));
  const results = [];
  ALBUMS.forEach(album => {
    const albumMatch = album.title.toLowerCase().includes(q) || (album.primaryArtist || album.artist).toLowerCase().includes(q);
    album.tracks.forEach((track, origIdx) => {
      if (!track.file || track.file === '#') return;
      const trackMatch = track.name.toLowerCase().includes(q);
      if (!albumMatch && !trackMatch) return;
      const key = album.id + ':' + origIdx;
      results.push({ album, track, origIdx, key, inPl: inPlaylist.has(key) });
    });
  });
  if (!results.length) {
    list.innerHTML = '<div style="padding:20px 14px;font-family:\'Space Mono\',monospace;font-size:12px;color:var(--muted,#888);text-align:center;">No results for \"' + query + '\"</div>';
    return;
  }
  const label = document.createElement('div');
  label.style.cssText = 'padding:10px 14px 4px;font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted,#888);';
  label.textContent = results.length + ' result' + (results.length !== 1 ? 's' : '');
  list.appendChild(label);
  results.forEach(({ album, track, origIdx, key, inPl }) => {
    const row = document.createElement('div');
    row.className = 'rec-track-row';
    row.id = 'recrow_' + key.replace(':', '_');
    const typeTag = album.type === 'unreleased'
      ? '<span style="font-size:9px;background:rgba(255,100,50,.18);color:#f97;border-radius:3px;padding:1px 5px;margin-left:4px;font-family:\'Space Mono\',monospace;vertical-align:middle;">UNREL</span>'
      : '';
    row.innerHTML =
      '<img class="rec-track-art" src="' + album.cover + '" onerror="this.style.background=\'#333\'"/>' +
      '<div class="rec-track-info" onclick="closeTrackPanel();openAlbum(\'' + album.id + '\')">' +
        '<div class="rec-track-name">' + track.name + typeTag + '</div>' +
        '<div class="rec-track-sub">' + (album.primaryArtist || album.artist) + ' · ' + album.title + '</div>' +
      '</div>' +
      '<button class="rec-action-btn ' + (inPl ? '' : 'add') + '" title="' + (inPl ? 'Already in playlist' : 'Add to playlist') + '"' +
        ' onclick="_recAddTrack(\'' + playlistId + '\',\'' + album.id + '\',' + origIdx + ',\'' + key + '\')"' +
        (inPl ? ' style="color:#2ecc71;border-color:#2ecc71;"' : '') + '>' +
        '<i class="fas ' + (inPl ? 'fa-check' : 'fa-plus') + '"></i>' +
      '</button>';
    list.appendChild(row);
  });
}

function switchRecTab(tab, playlistId) {
  _recCurrentTab = tab;
  document.querySelectorAll('.rec-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  renderRecTracks(playlistId, tab);
}

function refreshAllRecs(playlistId) {
  _recHiddenKeys = new Set();
  renderRecTracks(playlistId, _recCurrentTab);
}

function _pickRecTracks(pool, playlistId, count, excludeKeys) {
  const u = getCurrentUser();
  const pl = (u?.playlists || []).find(p => p.id === playlistId);
  const inPlaylist = new Set((pl?.tracks || []).map(t => `${t.albumId}:${t.origIdx}`));

  const candidates = [];
  pool.forEach(album => {
    album.tracks.forEach((t, idx) => {
      if (!t.file || t.file === '#') return;
      const key = `${album.id}:${idx}`;
      if (inPlaylist.has(key)) return;
      if ((excludeKeys || _recHiddenKeys).has(key)) return;
      candidates.push({ album, track: t, origIdx: idx, key });
    });
  });

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, count);
}

function renderRecTracks(playlistId, tab) {
  const list = document.getElementById('recTrackList');
  if (!list) return;
  list.innerHTML = '';

  const releasedPool   = ALBUMS.filter(a => a.type !== 'unreleased');
  const unreleasedPool = ALBUMS.filter(a => a.type === 'unreleased');

  if (tab === 'all') {
    const relPicks = _pickRecTracks(releasedPool, playlistId, 8, _recHiddenKeys);
    _recShownReleased = relPicks.map(p => p.key);
    list.appendChild(_makeRecSection('Released', relPicks, playlistId, 'released'));

    const unrelPicks = _pickRecTracks(unreleasedPool, playlistId, 4, _recHiddenKeys);
    _recShownUnreleased = unrelPicks.map(p => p.key);
    list.appendChild(_makeRecSection('Unreleased', unrelPicks, playlistId, 'unreleased'));

  } else if (tab === 'released') {
    const picks = _pickRecTracks(releasedPool, playlistId, 14, _recHiddenKeys);
    _recShownReleased = picks.map(p => p.key);
    list.appendChild(_makeRecSection('Released', picks, playlistId, 'released', true));

  } else {
    const picks = _pickRecTracks(unreleasedPool, playlistId, 14, _recHiddenKeys);
    _recShownUnreleased = picks.map(p => p.key);
    list.appendChild(_makeRecSection('Unreleased', picks, playlistId, 'unreleased', true));
  }
}

function _makeRecSection(label, picks, playlistId, sectionType, hideHeader = false) {
  const wrap = document.createElement('div');

  if (!hideHeader) {
    const header = document.createElement('div');
    header.className = 'rec-section-header';
    header.innerHTML = `
      <span>${label}</span>
      <button class="rec-refresh-sec" onclick="_refreshRecSection('${playlistId}','${sectionType}')">
        <i class="fas fa-sync-alt" style="font-size:10px;"></i> Refresh
      </button>`;
    wrap.appendChild(header);
  }

  if (!picks.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:14px;font-family:\'Space Mono\',monospace;font-size:11px;color:var(--muted);';
    empty.textContent = 'No more tracks to recommend.';
    wrap.appendChild(empty);
    return wrap;
  }

  picks.forEach(({ album, track, origIdx, key }) => {
    const row = document.createElement('div');
    row.className = 'rec-track-row';
    row.id = 'recrow_' + key.replace(':', '_');

    const inPl = _isInPlaylist(playlistId, album.id, origIdx);

    row.innerHTML = `
      <img class="rec-track-art" src="${album.cover}" onerror="this.style.background='#333'"/>
      <div class="rec-track-info" onclick="closeTrackPanel();openAlbum('${album.id}')">
        <div class="rec-track-name">${track.name}</div>
        <div class="rec-track-sub">${album.primaryArtist || album.artist} · ${album.title}</div>
      </div>
      <button class="rec-action-btn ${inPl ? '' : 'add'}" title="${inPl ? 'Already in playlist' : 'Add to playlist'}"
        onclick="_recAddTrack('${playlistId}','${album.id}',${origIdx},'${key}')"
        style="${inPl ? 'color:#2ecc71;border-color:#2ecc71;' : ''}">
        <i class="fas ${inPl ? 'fa-check' : 'fa-plus'}"></i>
      </button>
      <button class="rec-action-btn hide-btn" title="Hide &amp; get new recommendation"
        onclick="_recHideTrack('${playlistId}','${key}','${sectionType}')">
        <i class="fas fa-times"></i>
      </button>`;
    wrap.appendChild(row);
  });

  return wrap;
}

function _isInPlaylist(playlistId, albumId, origIdx) {
  const u = getCurrentUser(); if (!u) return false;
  const pl = (u.playlists || []).find(p => p.id === playlistId);
  return !!(pl?.tracks.some(t => t.albumId === albumId && t.origIdx === origIdx));
}

function _recAddTrack(playlistId, albumId, origIdx, key) {
  doAddToPlaylist(playlistId, albumId, origIdx);
  const row = document.getElementById('recrow_' + key.replace(':', '_'));
  if (row) {
    const addBtn = row.querySelector('.rec-action-btn.add, .rec-action-btn:first-of-type');
    if (addBtn) {
      addBtn.innerHTML = '<i class="fas fa-check"></i>';
      addBtn.style.color = '#2ecc71';
      addBtn.style.borderColor = '#2ecc71';
      addBtn.classList.remove('add');
      addBtn.title = 'Added';
      addBtn.onclick = null;
    }
  }
}

function _recHideTrack(playlistId, key, sectionType) {
  _recHiddenKeys.add(key);
  const row = document.getElementById('recrow_' + key.replace(':', '_'));
  if (row) {
    row.style.transition = 'opacity .18s,max-height .22s';
    row.style.opacity = '0';
    row.style.maxHeight = row.offsetHeight + 'px';
    setTimeout(() => {
      row.style.maxHeight = '0';
      row.style.padding = '0';
      row.style.overflow = 'hidden';
    }, 40);
    setTimeout(() => {
      row.remove();
      _injectReplacementRec(playlistId, sectionType, key);
    }, 240);
  }
}

function _injectReplacementRec(playlistId, sectionType, hiddenKey) {
  const pool = sectionType === 'unreleased'
    ? ALBUMS.filter(a => a.type === 'unreleased')
    : ALBUMS.filter(a => a.type !== 'unreleased');

  const shownKeys = new Set([..._recShownReleased, ..._recShownUnreleased]);
  const exclude = new Set([..._recHiddenKeys, ...shownKeys]);

  const picks = _pickRecTracks(pool, playlistId, 1, exclude);
  if (!picks.length) return;

  const { album, track, origIdx, key } = picks[0];
  if (sectionType === 'released') _recShownReleased.push(key);
  else _recShownUnreleased.push(key);

  const inPl = _isInPlaylist(playlistId, album.id, origIdx);
  const newRow = document.createElement('div');
  newRow.className = 'rec-track-row';
  newRow.id = 'recrow_' + key.replace(':', '_');
  newRow.style.opacity = '0';
  newRow.style.transition = 'opacity .2s';
  newRow.innerHTML = `
    <img class="rec-track-art" src="${album.cover}" onerror="this.style.background='#333'"/>
    <div class="rec-track-info" onclick="closeTrackPanel();openAlbum('${album.id}')">
      <div class="rec-track-name">${track.name}</div>
      <div class="rec-track-sub">${album.primaryArtist || album.artist} · ${album.title}</div>
    </div>
    <button class="rec-action-btn ${inPl ? '' : 'add'}" title="${inPl ? 'Already in playlist' : 'Add to playlist'}"
      onclick="_recAddTrack('${playlistId}','${album.id}',${origIdx},'${key}')"
      style="${inPl ? 'color:#2ecc71;border-color:#2ecc71;' : ''}">
      <i class="fas ${inPl ? 'fa-check' : 'fa-plus'}"></i>
    </button>
    <button class="rec-action-btn hide-btn" title="Hide &amp; get new recommendation"
      onclick="_recHideTrack('${playlistId}','${key}','${sectionType}')">
      <i class="fas fa-times"></i>
    </button>`;

  const list = document.getElementById('recTrackList');
  if (!list) return;

  const sections = list.querySelectorAll('div > div.rec-section-header');
  let target = null;
  sections.forEach(hdr => {
    if (hdr.querySelector('span')?.textContent.toLowerCase() === sectionType ||
        (sectionType === 'released' && hdr.querySelector('span')?.textContent === 'Released') ||
        (sectionType === 'unreleased' && hdr.querySelector('span')?.textContent === 'Unreleased')) {
      target = hdr.parentElement;
    }
  });

  if (target) target.appendChild(newRow);
  else list.appendChild(newRow);

  requestAnimationFrame(() => { newRow.style.opacity = '1'; });
}

function _refreshRecSection(playlistId, sectionType) {
  if (sectionType === 'released') _recShownReleased = [];
  else _recShownUnreleased = [];

  const list = document.getElementById('recTrackList');
  if (!list) return;

  const pool = sectionType === 'unreleased'
    ? ALBUMS.filter(a => a.type === 'unreleased')
    : ALBUMS.filter(a => a.type !== 'unreleased');

  const count = _recCurrentTab === 'all' ? (sectionType === 'unreleased' ? 4 : 8) : 14;
  const picks = _pickRecTracks(pool, playlistId, count, _recHiddenKeys);

  if (sectionType === 'released') _recShownReleased = picks.map(p => p.key);
  else _recShownUnreleased = picks.map(p => p.key);

  const label = sectionType === 'released' ? 'Released' : 'Unreleased';
  const hideHeader = _recCurrentTab !== 'all';
  const newSection = _makeRecSection(label, picks, playlistId, sectionType, hideHeader);

  const sections = list.querySelectorAll(':scope > div');
  sections.forEach(sec => {
    const hdr = sec.querySelector('.rec-section-header span');
    if (hdr && hdr.textContent === label) sec.replaceWith(newSection);
    else if (!hdr && sections.length === 1) sec.replaceWith(newSection);
  });
}

// ══════════════════════════════════════════════════════
//  LEGACY stubs kept for compatibility
// ══════════════════════════════════════════════════════
function openPlaylistEditor(playlistId) { openPlaylistOptionsPanel(playlistId); }
function renderEditorTracks(playlistId) { /* handled by side panel now */ }
function editorRemoveAll() { if (currentPlaylistId) clearPlaylistTracks(currentPlaylistId); }
function openPlaylistTrackCtx(e, playlistId, trackIndex) { openPlaylistTrackPanel(e, playlistId, trackIndex); }
function openAddToPlaylist(albumId, origIdx) { openTrackPanel(albumId, origIdx); setTimeout(() => openTrackPanelPlaylistPicker(albumId, origIdx), 50); }
