/* ========== 432UP GALERIA — v1.7.2 — 2026-07-25 ========== */
(function(){'use strict';

var C = window.CONFIG_432UP || window.C;

/* ========== SUPABASE DIRECT URL ========== */
var SB = (C && C.supabase && C.supabase.url) ? C.supabase.url : 'https://paetkspbfejtjjkngqej.supabase.co';
var SK = (C && C.supabase && C.supabase.key) ? C.supabase.key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
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

/* ========== HELPERS ========== */
function $(s){ return (C && C.$) ? C.$(s) : document.querySelector(s); }
function $$(s){ return (C && C.$$) ? C.$$(s) : document.querySelectorAll(s); }
function toast(msg, tipo) {
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
var isMob = /iPad|iPhone|Android/i.test(navigator.userAgent);
var ALG_N = isMob ? 50 : 90;
var ORB_N = isMob ? 12 : 22;
var PRT_N = isMob ? 60 : 120;

/* ========== STATE ========== */
var FOTOS = [];
var CATS = {};
var CATS_LIST = [];
var lbLista = []; var lbIdx = 0;
var filtroAtual = '';
var DB_LOADING = true;

var CFG = {
  galeria_carrossel_ativo: true,
  masonry_columns_mobile: 1,
  masonry_columns_tablet: 2,
  masonry_columns_desktop: 3,
  masonry_gap: 16
};

/* ========== FALLBACKS & CACHE ========== */
var FB_CATS = [
  {slug:'casamento',nome:'Casamento',emoji:'💍',ordem:1},
  {slug:'formatura',nome:'Formatura',emoji:'🎓',ordem:2},
  {slug:'corporativo',nome:'Corporativo',emoji:'🏢',ordem:3},
  {slug:'aniversario',nome:'Aniversário',emoji:'🎂',ordem:4},
  {slug:'festival',nome:'Festival / Show',emoji:'🎵',ordem:5}
];

function cacheGet(key){
  try { var d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch(e){ return null; }
}
function cacheSet(key, data){
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e){}
}

/* ========== LOAD DATA ========== */
function loadAll(){
  DB_LOADING = true;

  var cachedCats = cacheGet('432up_gal_cats');
  var cachedFotos = cacheGet('432up_gal_fotos');

  if(cachedCats && cachedCats.length){ CATS_LIST = cachedCats; } else { CATS_LIST = FB_CATS; }
  CATS = {};
  CATS_LIST.forEach(function(c){ CATS[c.slug] = (c.emoji||'') + ' ' + c.nome; });
  setDbg('#dCats', CATS_LIST.length);
  buildFiltros();

  if(cachedFotos && cachedFotos.length){
    FOTOS = cachedFotos;
    DB_LOADING = false;
    setDbg('#dDb', 'CACHE');
  } else {
    FOTOS = [];
    setDbg('#dDb', '…');
  }
  setDbg('#dFotos', FOTOS.length);

  buildMare();
  renderMasonry('');

  // Busca real no Supabase
  sbGet(TAB_CATS, 'select=*&order=ordem.asc').then(function(data){
    if(data && data.length){
      CATS_LIST = data;
      cacheSet('432up_gal_cats', data);
      CATS = {};
      CATS_LIST.forEach(function(c){ CATS[c.slug] = (c.emoji||'') + ' ' + c.nome; });
      setDbg('#dCats', CATS_LIST.length);
      buildFiltros();
    }
    return sbGet(TAB_FOTOS, 'select=*&order=ordem.asc,created_at.desc');
  }).then(function(data){
    DB_LOADING = false;
    if(data && data.length){
      FOTOS = data;
      cacheSet('432up_gal_fotos', data);
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
    console.error('[Galeria DB Error]', err);
    setDbg('#dDb', 'ERRO');
    var el3 = $('#dDb'); if(el3) el3.className = 'r';
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
function buildMare(){
  var track = $('#mareTrack'); if(!track) return; track.innerHTML = '';
  var mareSection = document.querySelector('.mare-section');
  if(!FOTOS.length){ if(mareSection) mareSection.style.display = 'none'; return; }
  if(mareSection) mareSection.style.display = '';

  var maxItems = 12;
  var items = FOTOS.filter(function(f){ return f.destaque || f.ordem<=6; }).slice(0, maxItems);
  if(!items.length) items = FOTOS.slice(0, maxItems);

  items.forEach(function(f){
    var div = document.createElement('div'); div.className = 'mare-item';
    var isVid = (f.tipo==='video' || f.tipo==='video_yt' || f.tipo==='video_up');
    var thumbUrl = isVid ? (f.tipo==='video_up' ? (f.url_thumb||f.url) : ytThumb(f.video_url)) : (f.url_thumb||f.url);
    div.innerHTML = '<img src="' + thumbUrl + '" alt="' + (f.titulo||'') + '" loading="lazy"><div class="mare-overlay"><span class="mare-label">' + (f.titulo||'') + '</span></div>';
    track.appendChild(div);
  });
}

/* ========== MASONRY GRID ========== */
function applyMasonryColumns(){
  var grid = $('#masonryGrid'); if(!grid) return;
  var mob = CFG.masonry_columns_mobile || 1;
  var tab = CFG.masonry_columns_tablet || 2;
  var desk = CFG.masonry_columns_desktop || 3;
  var w = window.innerWidth;
  var cols = w<=580 ? mob : w<=900 ? tab : desk;
  grid.style.columnCount = cols;
  grid.style.columnGap = '16px';
}

function renderMasonry(filtro){
  var grid = $('#masonryGrid');
  var empty = $('#galEmpty');
  if(!grid || !empty) return;

  grid.innerHTML = '';
  empty.style.display = 'none';

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
    empty.style.display = 'block';
    return;
  }

  grid.style.display = '';
  applyMasonryColumns();

  lista.forEach(function(foto, i){
    var item = document.createElement('div');
    item.className = 'masonry-item glass';

    var isVid = (foto.tipo==='video' || foto.tipo==='video_yt' || foto.tipo==='video_up');
    var thumbUrl = isVid ? (foto.tipo==='video_up' ? (foto.url_thumb||foto.url) : ytThumb(foto.video_url)) : (foto.url_thumb||foto.url);

    var html = '';
    if(foto.destaque) html += '<span class="masonry-dest">⭐</span>';
    if(isVid)         html += '<div class="masonry-play">▶</div>';

    html += '<img src="' + (thumbUrl||'') + '" alt="' + (foto.titulo || '') + '" loading="lazy" onload="this.style.opacity=1" style="opacity:0;transition:opacity .4s ease">';
    html += '<div class="masonry-overlay"><div class="masonry-cat">' + (CATS[foto.cat]||foto.cat||'') + '</div><div class="masonry-titulo">' + (foto.titulo||'') + '</div></div>';

    item.innerHTML = html;
    grid.appendChild(item);
  });
}

/* ========== EXPOSE GLOBALS & INIT ========== */
window.filtrar = filtrar;

document.addEventListener('DOMContentLoaded', function(){
  applyMasonryColumns();
  loadAll();
  window.addEventListener('resize', applyMasonryColumns);
});

})();
