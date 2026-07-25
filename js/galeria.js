/* ========== 432UP GALERIA — v1.7.1 — 2026-07-25 ========== */
(function(){'use strict';

var C = window.CONFIG_432UP || window.C;
var CORE = window.CORE_432UP;

if(!C){ console.error('[432UP Galeria] config.js não carregou'); }

/* ========== SUPABASE OFICIAL ========== */
var SB = (C && C.supabase && C.supabase.url) || 'https://paetkspbfejtjjkngqej.supabase.co';
var SK = (C && C.supabase && C.supabase.key) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
var BUCKET = (C && C.storage && C.storage.bucket) || '432up_galeria';
var TAB_FOTOS = 'co_galeria_fotos';
var TAB_CATS = 'co_galeria_categorias';

function sbHeaders(){
  return {
    'apikey': SK,
    'Authorization': 'Bearer ' + SK,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

function sbGet(table, query) {
  var url = SB + '/rest/v1/' + table + '?' + (query || '') + '&apikey=' + SK;
  return fetch(url, { headers: sbHeaders() }).then(function(r){
    if(!r.ok) throw new Error(r.status);
    return r.json();
  });
}

function sbPost(table, body) {
  return fetch(SB + '/rest/v1/' + table + '?apikey=' + SK, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(body)
  }).then(function(r){
    if(!r.ok) throw new Error(r.status);
    return r.json();
  });
}

function sbPatch(table, id, body) {
  return fetch(SB + '/rest/v1/' + table + '?id=eq.' + id + '&apikey=' + SK, {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify(body)
  }).then(function(r){
    if(!r.ok) throw new Error(r.status);
    return r.json();
  });
}

function sbDelete(table, id) {
  return fetch(SB + '/rest/v1/' + table + '?id=eq.' + id + '&apikey=' + SK, {
    method: 'DELETE',
    headers: sbHeaders()
  }).then(function(r){
    if(!r.ok) throw new Error(r.status);
  });
}

function sbUpload(path, file) {
  return fetch(SB + '/storage/v1/object/' + BUCKET + '/' + path + '?apikey=' + SK, {
    method: 'POST',
    headers: {
      'apikey': SK,
      'Authorization': 'Bearer ' + SK,
      'Content-Type': file.type,
      'x-upsert': 'true'
    },
    body: file
  }).then(function(r){
    if(!r.ok) throw new Error(r.status);
    return r.json();
  });
}

function sbPublicUrl(path) {
  return SB + '/storage/v1/object/public/' + BUCKET + '/' + path;
}

/* ========== HELPERS ========== */
function $(s){ return (C && C.$) ? C.$(s) : document.querySelector(s); }
function $$(s){ return (C && C.$$) ? C.$$(s) : document.querySelectorAll(s); }
function toast(msg, tipo) {
  if(CORE && CORE.toast) return CORE.toast(msg, tipo);
  var box = $('#toastBox');
  if(!box) return;
  var t = document.createElement('div');
  t.className = 'toast ' + (tipo || 'info');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(function(){ t.remove(); }, 3500);
}
function ytId(url){
  if(!url) return '';
  var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}
function ytThumb(url){
  var id = ytId(url);
  return id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : '';
}
function setDbg(sel, val){ var el = $(sel); if(el) el.textContent = val; }

/* ========== DEVICE ========== */
var isMob = (C && typeof C.isMobile !== 'undefined') ? !!C.isMobile : /iPad|iPhone|Android/i.test(navigator.userAgent);
var ALG_N = isMob ? 50 : 90;
var ORB_N = isMob ? 12 : 22;
var PRT_N = isMob ? 60 : 120;

/* ========== STATE ========== */
var FOTOS = [];
var CATS = {};
var CATS_LIST = [];
var lbLista = []; var lbIdx = 0;
var filtroAtual = '';
var adminFiles = [];
var adminVidFile = null;
var DB_LOADING = true;

/* ========== CFG ========== */
var CFG = {
  gal_herdar_camadas: true,
  gal_layer_motion: true,
  gal_layer_aurora: true,
  gal_layer_algae: true,
  gal_layer_particles: true,
  gal_layer_cta: true,
  motion_enabled: true,
  layer_aurora: true,
  layer_algae: true,
  layer_particles: true,
  cta_pulse_enabled: true,
  bpm_global: 74,
  orbs_intensity: 50,
  particles_density: 50,
  aurora_opacity: 0.6,
  fog_opacity: 0.4,
  carousel_gallery_speed: 4000,
  carousel_gallery_autoplay: true,
  carousel_gallery_pause_hover: true,
  carousel_gallery_max_items: 12,
  galeria_carrossel_ativo: true,
  masonry_columns_mobile: 1,
  masonry_columns_tablet: 2,
  masonry_columns_desktop: 3,
  masonry_gap: 16
};

/* ========== BPM ========== */
var BPM_BASE = 74;
var BPM_FACTOR = 1;
function setBpmFactor(bpm){ var b = parseInt(bpm) || BPM_BASE; BPM_FACTOR = Math.max(0.2, Math.min(4, b / BPM_BASE)); }
function applyBpmToBands(bpm){
  var speed = Math.max(0.2, Math.min(4, (parseInt(bpm) || BPM_BASE) / BPM_BASE));
  var aurBase = [11,14,9,17];
  document.querySelectorAll('.aurora-band').forEach(function(el,i){ el.style.animationDuration = ((aurBase[i]||12)/speed).toFixed(3) + 's'; });
  var fogBase = [22,32];
  document.querySelectorAll('.fog-band').forEach(function(el,i){ el.style.animationDuration = ((fogBase[i]||30)/speed).toFixed(3) + 's'; });
}

/* ========== CAMADAS VISUAIS ========== */
function genConfetti(){
  var c = document.getElementById('algaeLayer');
  if(!c) return;
  c.innerHTML = '';
  var isLight = document.documentElement.dataset.theme === 'light';

  var palette = isLight ? [
    {color:'rgba(217,160,40,.45)',weight:20},
    {color:'rgba(196,140,30,.40)',weight:10},
    {color:'rgba(180,120,25,.35)',weight:10},
    {color:'rgba(139,92,246,.30)',weight:18},
    {color:'rgba(167,139,250,.25)',weight:17},
    {color:'rgba(132,204,22,.30)',weight:13},
    {color:'rgba(163,230,53,.25)',weight:12}
  ] : [
    {color:'rgba(139,92,246,.35)',weight:20},
    {color:'rgba(167,139,250,.30)',weight:20},
    {color:'rgba(236,72,153,.28)',weight:15},
    {color:'rgba(244,114,182,.25)',weight:15},
    {color:'rgba(132,204,22,.30)',weight:15},
    {color:'rgba(163,230,53,.25)',weight:15}
  ];

  var pool = [];
  palette.forEach(function(p){ for(var i=0;i<p.weight;i++) pool.push(p.color); });
  function pickColor(){ return pool[Math.floor(Math.random()*pool.length)]; }

  var factorP = (CFG.particles_density || 50) / 50;
  var total = Math.max(0, Math.round(ALG_N * factorP));
  var sparkleCount = Math.floor(total * 0.2);
  var confettiCount = total - sparkleCount;

  for(var i=0; i<confettiCount; i++){
    var d = document.createElement('div');
    var shape = Math.random();
    var w, h, cls;
    if(shape<0.4){ w=4+Math.random()*10; h=8+Math.random()*18; cls='confetti confetti-rect'; }
    else if(shape<0.75){ w=5+Math.random()*12; h=w; cls='confetti confetti-circle'; }
    else{ w=6+Math.random()*10; h=w; cls='confetti confetti-diamond'; }
    var co = isLight ? (0.15+Math.random()*0.25) : (0.12+Math.random()*0.22);
    var dur = (6+Math.random()*12)/BPM_FACTOR;
    var delay = Math.random()*-15;
    var cr = Math.random()*360;
    var cy1 = -8-Math.random()*20;
    var cy2 = -4-Math.random()*12;
    var cy3 = -10-Math.random()*25;
    d.className = cls;
    d.style.cssText = 'width:'+w+'px;height:'+h+'px;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;background:'+pickColor()+';--co:'+co+';--cr:'+cr+'deg;--cy1:'+cy1+'px;--cy2:'+cy2+'px;--cy3:'+cy3+'px;animation:confettiFall '+dur+'s ease-in-out infinite '+delay+'s;opacity:'+co;
    c.appendChild(d);
  }

  for(var j=0; j<sparkleCount; j++){
    var s = document.createElement('div');
    s.className = 'sparkle';
    var so = isLight ? (0.15+Math.random()*0.25) : (0.10+Math.random()*0.20);
    var sdur = (3+Math.random()*6)/BPM_FACTOR;
    var sdelay = Math.random()*-8;
    var ssize = 8+Math.random()*14;
    var scolor = pickColor();
    s.textContent = Math.random()>0.5 ? '✦' : '✧';
    s.style.cssText = 'left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;font-size:'+ssize+'px;color:'+scolor+';--so:'+so+';animation:sparklePulse '+sdur+'s ease-in-out infinite '+sdelay+'s;opacity:'+so;
    c.appendChild(s);
  }

  setDbg('#dAlg', total);
}

function genOrbs(){
  var c = document.getElementById('orbsLayer');
  if(!c) return;
  c.innerHTML = '';
  var factorO = (CFG.orbs_intensity || 50) / 50;
  var total = Math.max(0, Math.round(ORB_N * factorO));
  for(var i=0; i<total; i++){
    var d = document.createElement('div'); d.className = 'orb';
    var s = 5+Math.random()*17;
    var odur = (6+Math.random()*12)/BPM_FACTOR;
    d.style.cssText = 'width:'+s+'px;height:'+s+'px;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;--ox:'+(3+Math.random()*10)+'px;--oy:'+(-3-Math.random()*10)+'px;--oy2:'+(2+Math.random()*8)+'px;animation:orbFloat '+odur+'s ease-in-out infinite '+(Math.random()*-8)+'s;opacity:'+(0.3+Math.random()*0.4);
    c.appendChild(d);
  }
  setDbg('#dOrb', total);
}

function genParticles(){
  var c = document.getElementById('particlesLayer');
  if(!c) return;
  c.innerHTML = '';
  var factorP = (CFG.particles_density || 50) / 50;
  var total = Math.max(0, Math.round(PRT_N * factorP));
  for(var i=0; i<total; i++){
    var d = document.createElement('div'); d.className = 'ptc';
    var pdur = (4+Math.random()*10)/BPM_FACTOR;
    d.style.cssText = 'left:'+Math.random()*100+'%;top:'+(60+Math.random()*40)+'%;--po:'+(0.15+Math.random()*0.35)+';--py:'+(-30-Math.random()*80)+'px;animation:ptcFloat '+pdur+'s linear infinite '+(Math.random()*-8)+'s';
    c.appendChild(d);
  }
  setDbg('#dPrt', total);
}

function gerarCamadas(){
  setBpmFactor(CFG.bpm_global || 74);
  applyBpmToBands(CFG.bpm_global || 74);

  if(CORE && CORE.applyVisualConfig){
    CORE.applyVisualConfig(CFG, {page:'gal'});
  }

  var L = resolveGalLayers(CFG);

  if(L.motion && L.algae)     genConfetti();
  if(L.motion)                genOrbs();
  if(L.motion && L.particles) genParticles();

  var alg = document.getElementById('algaeLayer');
  if(alg) alg.style.display = (L.motion && L.algae) ? '' : 'none';
  var orb = document.getElementById('orbsLayer');
  if(orb) orb.style.display = L.motion ? '' : 'none';
  var prt = document.getElementById('particlesLayer');
  if(prt) prt.style.display = (L.motion && L.particles) ? '' : 'none';
}

function resolveGalLayers(cfg){
  cfg = cfg || {};
  var herdar = cfg.gal_herdar_camadas !== false;
  var L = {
    motion:    cfg.motion_enabled !== false,
    aurora:    cfg.layer_aurora !== false,
    algae:     cfg.layer_algae !== false,
    particles: cfg.layer_particles !== false,
    cta:       cfg.cta_pulse_enabled !== false
  };
  if(herdar) return L;
  if(cfg.gal_layer_motion != null)    L.motion    = cfg.gal_layer_motion !== false;
  if(cfg.gal_layer_aurora != null)    L.aurora    = cfg.gal_layer_aurora !== false;
  if(cfg.gal_layer_algae != null)     L.algae     = cfg.gal_layer_algae !== false;
  if(cfg.gal_layer_particles != null) L.particles = cfg.gal_layer_particles !== false;
  if(cfg.gal_layer_cta != null)       L.cta       = cfg.gal_layer_cta !== false;
  return L;
}

/* ========== FALLBACK & CACHE SEGURO ========== */
var FB_CATS = [
  {slug:'casamento',nome:'Casamento',emoji:'💍',ordem:1},
  {slug:'formatura',nome:'Formatura',emoji:'🎓',ordem:2},
  {slug:'corporativo',nome:'Corporativo',emoji:'🏢',ordem:3},
  {slug:'aniversario',nome:'Aniversário',emoji:'🎂',ordem:4},
  {slug:'festival',nome:'Festival / Show',emoji:'🎵',ordem:5}
];

var CACHE_KEY_FOTOS = '432up_gal_fotos';
var CACHE_KEY_CATS = '432up_gal_cats';

function cacheGet(key){
  try { var d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch(e){ return null; }
}
function cacheSet(key, data){
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e){}
}

function applyGalleryConfig(){
  setBpmFactor(CFG.bpm_global || 74);
  applyBpmToBands(CFG.bpm_global || 74);
  var gap = (CFG.masonry_gap != null) ? CFG.masonry_gap : 16;
  document.documentElement.style.setProperty('--masonry-gap', gap + 'px');
  applyMasonryColumns();
  var mareSection = document.querySelector('.mare-section');
  if(mareSection) mareSection.style.display = (CFG.galeria_carrossel_ativo === false) ? 'none' : '';
}

/* ========== LOAD DATA ========== */
function loadAll(){
  DB_LOADING = true;

  var cachedCats = cacheGet(CACHE_KEY_CATS);
  var cachedFotos = cacheGet(CACHE_KEY_FOTOS);

  if(cachedCats && cachedCats.length){ CATS_LIST = cachedCats; } else { CATS_LIST = FB_CATS; }
  CATS = {};
  CATS_LIST.forEach(function(c){ CATS[c.slug] = (c.emoji||'') + ' ' + c.nome; });
  setDbg('#dCats', CATS_LIST.length);
  buildFiltros(); buildAdminCatSelect(); renderCatManager();

  if(cachedFotos && cachedFotos.length){
    FOTOS = cachedFotos;
    DB_LOADING = false;
    setDbg('#dDb', 'CACHE');
    var dDb = $('#dDb'); if(dDb) dDb.className = 'y';
  } else {
    FOTOS = [];
    setDbg('#dDb', '…');
    var dDb2 = $('#dDb'); if(dDb2) dDb2.className = 'y';
  }
  setDbg('#dFotos', FOTOS.length);

  buildMare();
  renderMasonry('');

  sbGet(TAB_CATS, 'select=*&order=ordem.asc').then(function(data){
    if(data && data.length){
      CATS_LIST = data;
      cacheSet(CACHE_KEY_CATS, data);
      CATS = {};
      CATS_LIST.forEach(function(c){ CATS[c.slug] = (c.emoji||'') + ' ' + c.nome; });
      setDbg('#dCats', CATS_LIST.length);
      buildFiltros(); buildAdminCatSelect(); renderCatManager();
    }
    return sbGet(TAB_FOTOS, 'select=*&order=ordem.asc,created_at.desc');
  }).then(function(data){
    DB_LOADING = false;
    if(data && data.length){
      FOTOS = data;
      cacheSet(CACHE_KEY_FOTOS, data);
      setDbg('#dFotos', FOTOS.length);
      setDbg('#dDb', 'OK');
      var el = $('#dDb'); if(el) el.className = 'g';
      buildMare();
      renderMasonry(filtroAtual);
    } else {
      renderMasonry(filtroAtual);
    }
  }).catch(function(err){
    DB_LOADING = false;
    console.error('DB error:', err);
    if(cachedFotos && cachedFotos.length){
      setDbg('#dDb', 'CACHE');
      var el2 = $('#dDb'); if(el2) el2.className = 'y';
    } else {
      setDbg('#dDb', 'ERRO');
      var el3 = $('#dDb'); if(el3) el3.className = 'r';
    }
    renderMasonry(filtroAtual);
  });
}

/* ========== FILTROS ========== */
function buildFiltros(){
  var wrap = $('#filtrosWrap'); if(!wrap) return;
  wrap.querySelectorAll('[data-filtro-dynamic]').forEach(function(el){ el.remove(); });
  CATS_LIST.forEach(function(cat){
    var btn = document.createElement('button');
    btn.className = 'filtro-chip';
    btn.setAttribute('data-filtro', cat.slug);
    btn.setAttribute('data-filtro-dynamic', '1');
    btn.textContent = (cat.emoji||'') + ' ' + cat.nome;
    btn.addEventListener('click', function(){ filtrar(cat.slug); });
    wrap.appendChild(btn);
  });
}

function filtrar(slug){
  filtroAtual = slug;
  $$('.filtro-chip').forEach(function(c){
    c.classList.toggle('ativo', c.getAttribute('data-filtro') === slug || (slug==='' && c.getAttribute('data-filtro')===''));
  });
  renderMasonry(slug);
}

/* ========== CAROUSEL MARÉ ========== */
var mareOffset = 0; var mareAnimId = null; var mareDragging = false; var mareStartX = 0; var mareScrollLeft = 0;
var mareSpeed = 0.5; var marePausedByHover = false;

function buildMare(){
  var track = $('#mareTrack'); if(!track) return; track.innerHTML = '';
  var mareSection = document.querySelector('.mare-section');
  if(CFG.galeria_carrossel_ativo === false){ if(mareSection) mareSection.style.display = 'none'; return; }
  if(!FOTOS.length){ if(mareSection) mareSection.style.display = 'none'; return; }
  if(mareSection) mareSection.style.display = '';

  var maxItems = CFG.carousel_gallery_max_items || 12;
  var items = FOTOS.filter(function(f){ return f.destaque || f.ordem<=6; }).slice(0, maxItems);
  if(!items.length) items = FOTOS.slice(0, maxItems);

  var all = items.concat(items).concat(items);
  all.forEach(function(f){
    var div = document.createElement('div'); div.className = 'mare-item';
    var isVid = (f.tipo==='video' || f.tipo==='video_yt' || f.tipo==='video_up');
    var thumbUrl = isVid ? (f.tipo==='video_up' ? (f.url_thumb||f.url) : ytThumb(f.video_url)) : (f.url_thumb||f.url);
    div.innerHTML = '<img src="' + thumbUrl + '" alt="' + (f.titulo||'') + '" loading="lazy"><div class="mare-overlay"><span class="mare-label">' + (f.titulo||'') + '</span></div>';
    track.appendChild(div);
  });

  if(mareAnimId) cancelAnimationFrame(mareAnimId);
  var speed = CFG.carousel_gallery_speed || 4000;
  mareSpeed = Math.max(0.2, Math.min(3, 4000/speed));
  var autoplay = CFG.carousel_gallery_autoplay !== false;

  function mareLoop(){
    if(autoplay && !mareDragging && !marePausedByHover){
      mareOffset -= mareSpeed;
      var firstItem = track.children[0];
      if(firstItem){
        var itemW = firstItem.offsetWidth + 14;
        var totalW = itemW * items.length;
        if(Math.abs(mareOffset) >= totalW) mareOffset += totalW;
      }
      track.style.transform = 'translateX(' + mareOffset + 'px)';
    }
    mareAnimId = requestAnimationFrame(mareLoop);
  }
  mareLoop();

  if(CFG.carousel_gallery_pause_hover !== false){
    track.addEventListener('mouseenter', function(){ marePausedByHover = true; });
    track.addEventListener('mouseleave', function(){ marePausedByHover = false; });
  }
}

function setupMareDrag(){
  var track = $('#mareTrack'); if(!track) return;
  function start(x){ mareDragging = true; mareStartX = x; mareScrollLeft = mareOffset; track.classList.add('dragging'); }
  function move(x){ if(!mareDragging) return; var dx = x - mareStartX; mareOffset = mareScrollLeft + dx; track.style.transform = 'translateX(' + mareOffset + 'px)'; }
  function end(){ mareDragging = false; track.classList.remove('dragging'); }
  track.addEventListener('mousedown', function(e){ start(e.pageX); });
  track.addEventListener('mousemove', function(e){ move(e.pageX); });
  track.addEventListener('mouseup', end); track.addEventListener('mouseleave', end);
  track.addEventListener('touchstart', function(e){ start(e.touches[0].pageX); }, {passive:true});
  track.addEventListener('touchmove', function(e){ move(e.touches[0].pageX); }, {passive:true});
  track.addEventListener('touchend', end);
}

/* ========== MASONRY ========== */
function applyMasonryColumns(){
  var grid = $('#masonryGrid'); if(!grid) return;
  var mob = CFG.masonry_columns_mobile || 1;
  var tab = CFG.masonry_columns_tablet || 2;
  var desk = CFG.masonry_columns_desktop || 3;
  var w = window.innerWidth;
  var cols = w<=580 ? mob : w<=900 ? tab : desk;
  var gap = CFG.masonry_gap != null ? CFG.masonry_gap : 16;
  grid.style.columnCount = cols;
  grid.style.columnGap = gap + 'px';
  document.documentElement.style.setProperty('--masonry-cols', cols);
  document.documentElement.style.setProperty('--masonry-gap', gap + 'px');
}

function renderSkeleton(grid){
  applyMasonryColumns();
  var cols = parseInt(document.documentElement.style.getPropertyValue('--masonry-cols') || '3');
  var heights = [220, 280, 200, 260, 180, 240, 300, 190, 250];
  var total = cols * 3;
  for(var i=0; i<total; i++){
    var h = heights[i % heights.length];
    var card = document.createElement('div');
    card.className = 'masonry-item skeleton-card';
    card.innerHTML = '<div class="sk-img" style="height:' + h + 'px"></div><div class="sk-body"><div class="sk-line sk-line--cat"></div><div class="sk-line sk-line--title"></div></div>';
    card.style.opacity = '0';
    card.style.transform = 'translateY(14px)';
    (function(el, delay){
      setTimeout(function(){
        el.style.transition = 'opacity .4s ease, transform .4s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 40 + delay * 60);
    })(card, i);
    grid.appendChild(card);
  }
}

function renderEmptyState(grid, isError){
  grid.style.display = '';
  var icon = isError ? '📡' : '🖼️';
  var titulo = isError ? 'Não foi possível carregar' : 'Nenhuma memória ainda';
  var sub = isError ? 'Verifique sua conexão e tente novamente.' : 'Em breve novos momentos serão publicados aqui.';
  var div = document.createElement('div');
  div.className = 'gal-empty-state';
  div.innerHTML = '<span class="ges-icon">' + icon + '</span><p class="ges-titulo">' + titulo + '</p><p class="ges-sub">' + sub + '</p>';
  grid.appendChild(div);
}

function renderMasonry(filtro){
  var grid = $('#masonryGrid');
  var empty = $('#galEmpty');
  if(!grid || !empty) return;

  grid.innerHTML = '';
  empty.style.display = 'none';

  if(DB_LOADING && !FOTOS.length){
    grid.style.display = '';
    renderSkeleton(grid);
    return;
  }

  var lista;
  if(filtro === 'video'){
    lista = FOTOS.filter(function(f){ return f.tipo === 'video' || f.tipo === 'video_yt' || f.tipo === 'video_up'; });
  } else if(filtro){
    lista = FOTOS.filter(function(f){ return (f.cat||'').toLowerCase() === filtro.toLowerCase(); });
  } else {
    lista = FOTOS;
  }

  if(!lista.length){
    grid.style.display = '';
    if(!FOTOS.length){ renderEmptyState(grid, false); } else { empty.style.display = 'block'; }
    return;
  }

  grid.style.display = '';
  applyMasonryColumns();

  lista.forEach(function(foto, i){
    var item = document.createElement('div');
    item.className = 'masonry-item glass';
    var dur = (4.8 + i%6 * 0.7).toFixed(2);
    var delay = (i%7 * 0.65).toFixed(2);
    item.style.animation = 'masonryBreath ' + dur + 's ' + delay + 's ease-in-out infinite';

    var isVid = (foto.tipo==='video' || foto.tipo==='video_yt' || foto.tipo==='video_up');
    var thumbUrl = isVid ? (foto.tipo==='video_up' ? (foto.url_thumb||foto.url) : ytThumb(foto.video_url)) : (foto.url_thumb||foto.url);

    var html = '';
    if(foto.destaque) html += '<span class="masonry-dest">⭐</span>';
    if(isVid)         html += '<div class="masonry-play">▶</div>';

    html += '<img src="' + (thumbUrl||'') + '" alt="' + (foto.titulo || '') + '" ' +
            (i < 6 ? 'loading="eager"' : 'loading="lazy"') +
            ' onerror="this.style.display=\'none\';this.parentElement.classList.add(\'img-error\')"' +
            ' onload="this.style.opacity=1"' +
            ' style="opacity:0;transition:opacity .4s ease">';

    html += '<div class="masonry-overlay"><div class="masonry-cat">' + (CATS[foto.cat]||foto.cat||'') + '</div><div class="masonry-titulo">' + (foto.titulo||'') + '</div></div>';

    item.innerHTML = html;
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    setTimeout(function(){
      item.style.transition = 'opacity .5s var(--ease-out-expo),transform .5s var(--ease-out-expo)';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, 60 + i * 55);

    item.addEventListener('click', function(){ abrirLb(i, lista); });
    grid.appendChild(item);
  });
}

/* ========== LIGHTBOX ========== */
function abrirLb(idx, lista){ lbLista = lista; lbIdx = idx; atualizarLb(); var lb = $('#lightbox'); if(lb) lb.classList.add('open'); document.body.style.overflow = 'hidden'; preloadAdjacentLb(idx, lista); }
function fecharLb(){ var lb = $('#lightbox'); if(lb) lb.classList.remove('open'); document.body.style.overflow = ''; limparLbMedia(); }
function navegarLb(dir){ limparLbMedia(); lbIdx = (lbIdx + dir + lbLista.length) % lbLista.length; atualizarLb(); preloadAdjacentLb(lbIdx, lbLista); }
function preloadAdjacentLb(idx, lista){ [-1, 1].forEach(function(offset){ var target = lista[(idx + offset + lista.length) % lista.length]; if(!target) return; var isVid = (target.tipo==='video' || target.tipo==='video_yt' || target.tipo==='video_up'); var src = isVid ? (target.tipo==='video_up' ? (target.url_thumb||target.url) : ytThumb(target.video_url)) : (target.url||target.url_thumb); if(src){ var img = new Image(); img.src = src; } }); }
function limparLbMedia(){ var inner = $('#lbInner'); if(!inner) return; var yt = inner.querySelector('.lb-video-yt'); if(yt) yt.remove(); var vid = inner.querySelector('video'); if(vid) vid.remove(); var fb = inner.querySelector('.lb-video-fallback'); if(fb) fb.remove(); var img = $('#lbImg'); if(img) img.style.display = ''; }
function atualizarLb(){
  var f = lbLista[lbIdx]; var inner = $('#lbInner'); var img = $('#lbImg');
  if(!f || !inner || !img) return;
  var isYt = (f.tipo==='video' || f.tipo==='video_yt') && f.video_url;
  var isUp = (f.tipo==='video_up') && f.url;
  if(isYt){
    img.style.display = 'none';
    var videoId = ytId(f.video_url);
    if(videoId){
      var iframe = document.createElement('iframe');
      iframe.className = 'lb-video-yt';
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0';
      iframe.allow = 'accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share';
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('allowfullscreen', 'true');
      inner.insertBefore(iframe, inner.querySelector('.lb-caption'));
    }
  } else if(isUp){
    img.style.display = 'none';
    var video = document.createElement('video');
    video.controls = true; video.autoplay = true; video.playsInline = true; video.src = f.url;
    inner.insertBefore(video, inner.querySelector('.lb-caption'));
  } else {
    img.style.display = ''; img.src = f.url || f.url_thumb;
  }
  var cap = $('#lbCaption');
  if(cap) cap.textContent = [f.titulo, CATS[f.cat]||f.cat, f.local].filter(Boolean).join(' · ');
}

/* ========== EXPOSE GLOBALS & INIT ========== */
window.filtrar = filtrar;
window.fecharLb = fecharLb; window.navegarLb = navegarLb;

(async function init(){
  try {
    if(!document.documentElement.getAttribute('data-theme')){
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    var cfgPromise = (CORE && CORE.loadVisualConfig) ? CORE.loadVisualConfig() : Promise.resolve(null);

    applyGalleryConfig();
    setupMareDrag();
    loadAll();
    window.addEventListener('resize', function(){ applyMasonryColumns(); });

    var cfg = await cfgPromise;
    if(cfg && typeof cfg === 'object'){
      Object.keys(cfg).forEach(function(k){ CFG[k] = cfg[k]; });
    }
    applyGalleryConfig();
    gerarCamadas();
  } catch(e){
    console.error('[432UP Galeria init]', e);
    DB_LOADING = false;
    gerarCamadas();
    renderMasonry(filtroAtual);
  }
})();

})();
