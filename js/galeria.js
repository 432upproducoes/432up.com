/* ========== 432UP GALERIA — v1.7.0 — 2026-03-06 ========== */
(function(){'use strict';

var C = window.CONFIG_432UP || window.C;
var CORE = window.CORE_432UP;

if(!C){ console.error('[432UP Galeria] config.js não carregou'); }
if(!CORE){ console.error('[432UP Galeria] core.js não carregou'); }

/* ========== SUPABASE ========== */
var SB = 'https://www.432up.com/supabase-api';
var SK = (C&&C.supabase&&C.supabase.key)||'';
var BUCKET = (C&&C.storage&&C.storage.bucket)||'432up_galeria';
var TAB_FOTOS='co_galeria_fotos';
var TAB_CATS='co_galeria_categorias';

function sbHeaders(){return{'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':'application/json','Prefer':'return=representation'}}
function sbGet(table,query){return fetch(SB+'/rest/v1/'+table+'?'+(query||''),{headers:sbHeaders()}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
function sbPost(table,body){return fetch(SB+'/rest/v1/'+table,{method:'POST',headers:sbHeaders(),body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
function sbPatch(table,id,body){return fetch(SB+'/rest/v1/'+table+'?id=eq.'+id,{method:'PATCH',headers:sbHeaders(),body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
function sbDelete(table,id){return fetch(SB+'/rest/v1/'+table+'?id=eq.'+id,{method:'DELETE',headers:sbHeaders()}).then(function(r){if(!r.ok)throw new Error(r.status)})}
function sbUpload(path,file){return fetch(SB+'/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers:{'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':file.type,'x-upsert':'true'},body:file}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
function sbPublicUrl(path){return SB+'/storage/v1/object/public/'+BUCKET+'/'+path}

/* ========== HELPERS ========== */
function $(s){return (C&&C.$)?C.$(s):document.querySelector(s)}
function $$(s){return (C&&C.$$)?C.$$(s):document.querySelectorAll(s)}
function toast(msg,tipo){if(CORE&&CORE.toast)return CORE.toast(msg,tipo);var box=$('#toastBox');if(!box)return;var t=document.createElement('div');t.className='toast '+(tipo||'info');t.textContent=msg;box.appendChild(t);setTimeout(function(){t.remove()},3500)}
function ytId(url){if(!url)return'';var m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);return m?m[1]:''}
function ytThumb(url){var id=ytId(url);return id?'https://img.youtube.com/vi/'+id+'/hqdefault.jpg':''}
function setDbg(sel,val){var el=$(sel);if(el)el.textContent=val}

/* ========== DEVICE ========== */
var isMob=(C&&typeof C.isMobile!=='undefined')?!!C.isMobile:/iPad|iPhone|Android/i.test(navigator.userAgent);
var ALG_N=isMob?50:90;
var ORB_N=isMob?12:22;
var PRT_N=isMob?60:120;

/* ========== STATE ========== */
var FOTOS=[];
var CATS={};
var CATS_LIST=[];
var lbLista=[];var lbIdx=0;
var filtroAtual='';
var adminFiles=[];
var adminVidFile=null;

/* ─── FLAG DE LOADING ───────────────────────────────────────── */
var DB_LOADING = true;   /* true enquanto aguarda resposta do banco */

/* ========== CFG ========== */
var CFG={
  gal_herdar_camadas:true,
  gal_layer_motion:true,
  gal_layer_aurora:true,
  gal_layer_algae:true,
  gal_layer_particles:true,
  gal_layer_cta:true,
  motion_enabled:true,
  layer_aurora:true,
  layer_algae:true,
  layer_particles:true,
  cta_pulse_enabled:true,
  bpm_global:74,
  orbs_intensity:50,
  particles_density:50,
  aurora_opacity:0.6,
  fog_opacity:0.4,
  carousel_gallery_speed:4000,
  carousel_gallery_autoplay:true,
  carousel_gallery_pause_hover:true,
  carousel_gallery_max_items:12,
  galeria_carrossel_ativo:true,
  masonry_columns_mobile:1,
  masonry_columns_tablet:2,
  masonry_columns_desktop:3,
  masonry_gap:16
};

/* ========== PERF ========== */
function raf(fn){return requestAnimationFrame(fn)}

/* ========== BPM ========== */
var BPM_BASE=74;
var BPM_FACTOR=1;
function setBpmFactor(bpm){var b=parseInt(bpm)||BPM_BASE;BPM_FACTOR=Math.max(0.2,Math.min(4,b/BPM_BASE))}
function applyBpmToBands(bpm){
  var speed=Math.max(0.2,Math.min(4,(parseInt(bpm)||BPM_BASE)/BPM_BASE));
  var aurBase=[11,14,9,17];
  document.querySelectorAll('.aurora-band').forEach(function(el,i){el.style.animationDuration=((aurBase[i]||12)/speed).toFixed(3)+'s'});
  var fogBase=[22,32];
  document.querySelectorAll('.fog-band').forEach(function(el,i){el.style.animationDuration=((fogBase[i]||30)/speed).toFixed(3)+'s'});
}

/* ========== CAMADAS VISUAIS ========== */
function genConfetti(){
  var c=document.getElementById('algaeLayer');
  if(!c)return;
  c.innerHTML='';
  var isLight=document.documentElement.dataset.theme==='light';

  var palette=isLight?[
    {color:'rgba(217,160,40,.45)',weight:20},
    {color:'rgba(196,140,30,.40)',weight:10},
    {color:'rgba(180,120,25,.35)',weight:10},
    {color:'rgba(139,92,246,.30)',weight:18},
    {color:'rgba(167,139,250,.25)',weight:17},
    {color:'rgba(132,204,22,.30)',weight:13},
    {color:'rgba(163,230,53,.25)',weight:12}
  ]:[
    {color:'rgba(139,92,246,.35)',weight:20},
    {color:'rgba(167,139,250,.30)',weight:20},
    {color:'rgba(236,72,153,.28)',weight:15},
    {color:'rgba(244,114,182,.25)',weight:15},
    {color:'rgba(132,204,22,.30)',weight:15},
    {color:'rgba(163,230,53,.25)',weight:15}
  ];

  var pool=[];
  palette.forEach(function(p){for(var i=0;i<p.weight;i++)pool.push(p.color)});
  function pickColor(){return pool[Math.floor(Math.random()*pool.length)]}

  var factorP=(CFG.particles_density||50)/50;
  var total=Math.max(0,Math.round(ALG_N*factorP));
  var sparkleCount=Math.floor(total*0.2);
  var confettiCount=total-sparkleCount;

  for(var i=0;i<confettiCount;i++){
    var d=document.createElement('div');
    var shape=Math.random();
    var w,h,cls;
    if(shape<0.4){w=4+Math.random()*10;h=8+Math.random()*18;cls='confetti confetti-rect';}
    else if(shape<0.75){w=5+Math.random()*12;h=w;cls='confetti confetti-circle';}
    else{w=6+Math.random()*10;h=w;cls='confetti confetti-diamond';}
    var co=isLight?(0.15+Math.random()*0.25):(0.12+Math.random()*0.22);
    var dur=(6+Math.random()*12)/BPM_FACTOR;
    var delay=Math.random()*-15;
    var cr=Math.random()*360;
    var cy1=-8-Math.random()*20;
    var cy2=-4-Math.random()*12;
    var cy3=-10-Math.random()*25;
    d.className=cls;
    d.style.cssText='width:'+w+'px;height:'+h+'px;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;background:'+pickColor()+';--co:'+co+';--cr:'+cr+'deg;--cy1:'+cy1+'px;--cy2:'+cy2+'px;--cy3:'+cy3+'px;animation:confettiFall '+dur+'s ease-in-out infinite '+delay+'s;opacity:'+co;
    c.appendChild(d);
  }

  for(var j=0;j<sparkleCount;j++){
    var s=document.createElement('div');
    s.className='sparkle';
    var so=isLight?(0.15+Math.random()*0.25):(0.10+Math.random()*0.20);
    var sdur=(3+Math.random()*6)/BPM_FACTOR;
    var sdelay=Math.random()*-8;
    var ssize=8+Math.random()*14;
    var scolor=pickColor();
    s.textContent=Math.random()>0.5?'✦':'✧';
    s.style.cssText='left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;font-size:'+ssize+'px;color:'+scolor+';--so:'+so+';animation:sparklePulse '+sdur+'s ease-in-out infinite '+sdelay+'s;opacity:'+so;
    c.appendChild(s);
  }

  setDbg('#dAlg',total);
}

function genOrbs(){
  var c=document.getElementById('orbsLayer');
  if(!c)return;
  c.innerHTML='';
  var factorO=(CFG.orbs_intensity||50)/50;
  var total=Math.max(0,Math.round(ORB_N*factorO));
  for(var i=0;i<total;i++){
    var d=document.createElement('div');d.className='orb';
    var s=5+Math.random()*17;
    var odur=(6+Math.random()*12)/BPM_FACTOR;
    d.style.cssText='width:'+s+'px;height:'+s+'px;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;--ox:'+(3+Math.random()*10)+'px;--oy:'+(-3-Math.random()*10)+'px;--oy2:'+(2+Math.random()*8)+'px;animation:orbFloat '+odur+'s ease-in-out infinite '+(Math.random()*-8)+'s;opacity:'+(0.3+Math.random()*0.4);
    c.appendChild(d);
  }
  setDbg('#dOrb',total);
}

function genParticles(){
  var c=document.getElementById('particlesLayer');
  if(!c)return;
  c.innerHTML='';
  var factorP=(CFG.particles_density||50)/50;
  var total=Math.max(0,Math.round(PRT_N*factorP));
  for(var i=0;i<total;i++){
    var d=document.createElement('div');d.className='ptc';
    var pdur=(4+Math.random()*10)/BPM_FACTOR;
    d.style.cssText='left:'+Math.random()*100+'%;top:'+(60+Math.random()*40)+'%;--po:'+(0.15+Math.random()*0.35)+';--py:'+(-30-Math.random()*80)+'px;animation:ptcFloat '+pdur+'s linear infinite '+(Math.random()*-8)+'s';
    c.appendChild(d);
  }
  setDbg('#dPrt',total);
}

function gerarCamadas(){
  setBpmFactor(CFG.bpm_global||74);
  applyBpmToBands(CFG.bpm_global||74);

  if(CORE&&CORE.applyVisualConfig){
    CORE.applyVisualConfig(CFG,{page:'gal'});
  }

  var L=resolveGalLayers(CFG);

  if(L.motion&&L.algae)  genConfetti();
  if(L.motion)           genOrbs();
  if(L.motion&&L.particles) genParticles();

  var alg=document.getElementById('algaeLayer');
  if(alg) alg.style.display=(L.motion&&L.algae)?'':'none';
  var orb=document.getElementById('orbsLayer');
  if(orb) orb.style.display=L.motion?'':'none';
  var prt=document.getElementById('particlesLayer');
  if(prt) prt.style.display=(L.motion&&L.particles)?'':'none';
}

/* ========== RESOLVE LAYERS ========== */
function resolveGalLayers(cfg){
  cfg=cfg||{};
  var herdar=cfg.gal_herdar_camadas!==false;
  var L={
    motion:   cfg.motion_enabled!==false,
    aurora:   cfg.layer_aurora!==false,
    algae:    cfg.layer_algae!==false,
    particles:cfg.layer_particles!==false,
    cta:      cfg.cta_pulse_enabled!==false
  };
  if(herdar)return L;
  if(cfg.gal_layer_motion!=null)    L.motion    =cfg.gal_layer_motion!==false;
  if(cfg.gal_layer_aurora!=null)    L.aurora    =cfg.gal_layer_aurora!==false;
  if(cfg.gal_layer_algae!=null)     L.algae     =cfg.gal_layer_algae!==false;
  if(cfg.gal_layer_particles!=null) L.particles =cfg.gal_layer_particles!==false;
  if(cfg.gal_layer_cta!=null)       L.cta       =cfg.gal_layer_cta!==false;
  return L;
}

/* ========== FALLBACK DATA ========== */
/* Sem fotos aleatórias — galeria exibe skeleton enquanto carrega */
var FB_FOTOS = [];
var FB_CATS=[
  {slug:'casamento',nome:'Casamento',emoji:'💍',ordem:1},
  {slug:'formatura',nome:'Formatura',emoji:'🎓',ordem:2},
  {slug:'corporativo',nome:'Corporativo',emoji:'🏢',ordem:3},
  {slug:'aniversario',nome:'Aniversário',emoji:'🎂',ordem:4},
  {slug:'festival',nome:'Festival / Show',emoji:'🎵',ordem:5}
];

/* ========== CACHE ========== */
var CACHE_KEY_FOTOS='432up_gal_fotos';
var CACHE_KEY_CATS='432up_gal_cats';
function cacheGet(key){try{var d=localStorage.getItem(key);return d?JSON.parse(d):null}catch(e){return null}}
function cacheSet(key,data){try{localStorage.setItem(key,JSON.stringify(data))}catch(e){}}

/* ========== GALLERY CONFIG ========== */
function applyGalleryConfig(){
  setBpmFactor(CFG.bpm_global||74);
  applyBpmToBands(CFG.bpm_global||74);
  var gap=(CFG.masonry_gap!=null)?CFG.masonry_gap:16;
  document.documentElement.style.setProperty('--masonry-gap',gap+'px');
  applyMasonryColumns();
  var mareSection=document.querySelector('.mare-section');
  if(mareSection)mareSection.style.display=(CFG.galeria_carrossel_ativo===false)?'none':'';
}

/* ========== LOAD DATA ========== */
function loadAll(){
  DB_LOADING = true;

  var cachedCats=cacheGet(CACHE_KEY_CATS);
  var cachedFotos=cacheGet(CACHE_KEY_FOTOS);

  /* ── Categorias: cache ou fallback ── */
  if(cachedCats&&cachedCats.length){CATS_LIST=cachedCats;}else{CATS_LIST=FB_CATS;}
  CATS={};
  CATS_LIST.forEach(function(c){CATS[c.slug]=(c.emoji||'')+' '+c.nome;});
  setDbg('#dCats',CATS_LIST.length);
  buildFiltros();buildAdminCatSelect();renderCatManager();

  /* ── Fotos: cache (real) ou vazio enquanto aguarda ── */
  if(cachedFotos&&cachedFotos.length){
    FOTOS=cachedFotos;
    DB_LOADING=false;                    /* cache é dado real — sem skeleton */
    setDbg('#dDb','CACHE');
    var dDb=$('#dDb');if(dDb)dDb.className='y';
  }else{
    FOTOS=[];                            /* sem fotos falsas */
    /* DB_LOADING permanece true → skeleton será exibido */
    setDbg('#dDb','…');
    var dDb2=$('#dDb');if(dDb2)dDb2.className='y';
  }
  setDbg('#dFotos',FOTOS.length);

  buildMare();
  renderMasonry('');   /* exibe cache imediato OU skeleton */

  /* ── Busca real no banco ── */
  sbGet(TAB_CATS,'select=*&order=ordem.asc').then(function(data){
    if(data&&data.length){
      CATS_LIST=data;
      cacheSet(CACHE_KEY_CATS,data);
      CATS={};
      CATS_LIST.forEach(function(c){CATS[c.slug]=(c.emoji||'')+' '+c.nome;});
      setDbg('#dCats',CATS_LIST.length);
      buildFiltros();buildAdminCatSelect();renderCatManager();
    }
    return sbGet(TAB_FOTOS,'select=*&order=ordem.asc,created_at.desc');
  }).then(function(data){
    DB_LOADING=false;
    if(data&&data.length){
      FOTOS=data;
      cacheSet(CACHE_KEY_FOTOS,data);
      setDbg('#dFotos',FOTOS.length);
      setDbg('#dDb','OK');
      var el=$('#dDb');if(el)el.className='g';
      buildMare();
      renderMasonry(filtroAtual);
      toast('Galeria carregada — '+FOTOS.length+' mídias','ok');
    }else{
      /* banco respondeu mas não há fotos ainda */
      renderMasonry(filtroAtual);
    }
  }).catch(function(err){
    DB_LOADING=false;
    console.error('DB error:',err);
    if(cachedFotos&&cachedFotos.length){
      setDbg('#dDb','CACHE');
      var el2=$('#dDb');if(el2)el2.className='y';
    }else{
      setDbg('#dDb','ERRO');
      var el3=$('#dDb');if(el3)el3.className='r';
      toast('Não foi possível carregar a galeria','err');
    }
    renderMasonry(filtroAtual);   /* mostra vazio honesto ou cache */
  });
}

/* ========== FILTROS ========== */
function buildFiltros(){
  var wrap=$('#filtrosWrap');if(!wrap)return;
  wrap.querySelectorAll('[data-filtro-dynamic]').forEach(function(el){el.remove();});
  CATS_LIST.forEach(function(cat){
    var btn=document.createElement('button');
    btn.className='filtro-chip';
    btn.setAttribute('data-filtro',cat.slug);
    btn.setAttribute('data-filtro-dynamic','1');
    btn.textContent=(cat.emoji||'')+' '+cat.nome;
    btn.addEventListener('click',function(){filtrar(cat.slug);});
    wrap.appendChild(btn);
  });
}
function filtrar(slug){
  filtroAtual=slug;

  $$('.filtro-chip').forEach(function(c){
    c.classList.toggle('ativo',c.getAttribute('data-filtro')===slug||(slug===''&&c.getAttribute('data-filtro')===''));
  });
  renderMasonry(slug);
}

/* ========== CAROUSEL MARÉ ========== */
var mareOffset=0;var mareAnimId=null;var mareDragging=false;var mareStartX=0;var mareScrollLeft=0;
var mareSpeed=0.5;var marePausedByHover=false;

function buildMare(){
  var track=$('#mareTrack');if(!track)return;track.innerHTML='';
  var mareSection=document.querySelector('.mare-section');
  if(CFG.galeria_carrossel_ativo===false){if(mareSection)mareSection.style.display='none';return;}
  /* Se ainda não há fotos reais, oculta o carrossel silenciosamente */
  if(!FOTOS.length){if(mareSection)mareSection.style.display='none';return;}
  if(mareSection)mareSection.style.display='';
  var maxItems=CFG.carousel_gallery_max_items||12;
  var items=FOTOS.filter(function(f){return f.destaque||f.ordem<=6;}).slice(0,maxItems);
  if(!items.length)items=FOTOS.slice(0,maxItems);
  var all=items.concat(items).concat(items);
  all.forEach(function(f){
    var div=document.createElement('div');div.className='mare-item';
    var isVid=(f.tipo==='video'||f.tipo==='video_yt'||f.tipo==='video_up');
    var thumbUrl=isVid?(f.tipo==='video_up'?(f.url_thumb||f.url):ytThumb(f.video_url)):(f.url_thumb||f.url);
    div.innerHTML='<img src="'+thumbUrl+'" alt="'+(f.titulo||'')+'" loading="lazy"><div class="mare-overlay"><span class="mare-label">'+(f.titulo||'')+'</span></div>';
    track.appendChild(div);
  });
  if(mareAnimId)cancelAnimationFrame(mareAnimId);
  var speed=CFG.carousel_gallery_speed||4000;
  mareSpeed=Math.max(0.2,Math.min(3,4000/speed));
  var autoplay=CFG.carousel_gallery_autoplay!==false;
  function mareLoop(){
    if(autoplay&&!mareDragging&&!marePausedByHover){
      mareOffset-=mareSpeed;
      var firstItem=track.children[0];
      if(firstItem){var itemW=firstItem.offsetWidth+14;var totalW=itemW*items.length;if(Math.abs(mareOffset)>=totalW)mareOffset+=totalW;}
      track.style.transform='translateX('+mareOffset+'px)';
    }
    mareAnimId=requestAnimationFrame(mareLoop);
  }
  mareLoop();
  if(CFG.carousel_gallery_pause_hover!==false){
    track.addEventListener('mouseenter',function(){marePausedByHover=true;});
    track.addEventListener('mouseleave',function(){marePausedByHover=false;});
  }
}

function setupMareDrag(){
  var track=$('#mareTrack');if(!track)return;
  function start(x){mareDragging=true;mareStartX=x;mareScrollLeft=mareOffset;track.classList.add('dragging');}
  function move(x){if(!mareDragging)return;var dx=x-mareStartX;mareOffset=mareScrollLeft+dx;track.style.transform='translateX('+mareOffset+'px)';}
  function end(){mareDragging=false;track.classList.remove('dragging');}
  track.addEventListener('mousedown',function(e){start(e.pageX);});
  track.addEventListener('mousemove',function(e){move(e.pageX);});
  track.addEventListener('mouseup',end);track.addEventListener('mouseleave',end);
  track.addEventListener('touchstart',function(e){start(e.touches[0].pageX);},{passive:true});
  track.addEventListener('touchmove',function(e){move(e.touches[0].pageX);},{passive:true});
  track.addEventListener('touchend',end);
}

/* ========== MASONRY ========== */
function applyMasonryColumns(){
  var grid=$('#masonryGrid');if(!grid)return;
  var mob=CFG.masonry_columns_mobile||1;
  var tab=CFG.masonry_columns_tablet||2;
  var desk=CFG.masonry_columns_desktop||3;
  var w=window.innerWidth;
  var cols=w<=580?mob:w<=900?tab:desk;
  var gap=CFG.masonry_gap!=null?CFG.masonry_gap:16;
  grid.style.columnCount=cols;
  grid.style.columnGap=gap+'px';
  document.documentElement.style.setProperty('--masonry-cols',cols);
  document.documentElement.style.setProperty('--masonry-gap',gap+'px');
}

/* ─── SKELETON APPLE GLASS ─────────────────────────────────── */
function renderSkeleton(grid){
  applyMasonryColumns();
  var cols=parseInt(
    document.documentElement.style.getPropertyValue('--masonry-cols')||'3'
  );
  /* 3 linhas × colunas = N cards, alturas variadas para imitar masonry */
  var heights=[220,280,200,260,180,240,300,190,250];
  var total=cols*3;
  for(var i=0;i<total;i++){
    var h=heights[i%heights.length];
    var card=document.createElement('div');
    card.className='masonry-item skeleton-card';
    card.innerHTML=
      '<div class="sk-img" style="height:'+h+'px"></div>'+
      '<div class="sk-body">'+
        '<div class="sk-line sk-line--cat"></div>'+
        '<div class="sk-line sk-line--title"></div>'+
      '</div>';
    /* entrada suave escalonada */
    card.style.opacity='0';
    card.style.transform='translateY(14px)';
    (function(el,delay){
      setTimeout(function(){
        el.style.transition='opacity .4s ease, transform .4s ease';
        el.style.opacity='1';
        el.style.transform='translateY(0)';
      },40+delay*60);
    })(card,i);
    grid.appendChild(card);
  }
}

/* ─── ESTADO VAZIO ─────────────────────────────────────────── */
function renderEmptyState(grid,isError){
  grid.style.display='';
  var icon   = isError ? '📡' : '🖼️';
  var titulo = isError ? 'Não foi possível carregar' : 'Nenhuma memória ainda';
  var sub    = isError
    ? 'Verifique sua conexão e tente novamente.'
    : 'Em breve novos momentos serão publicados aqui.';
  var div=document.createElement('div');
  div.className='gal-empty-state';
  div.innerHTML=
    '<span class="ges-icon">'+icon+'</span>'+
    '<p class="ges-titulo">'+titulo+'</p>'+
    '<p class="ges-sub">'+sub+'</p>';
  grid.appendChild(div);
}

/* ─── RENDER MASONRY ───────────────────────────────────────── */
function renderMasonry(filtro){
  var grid=$('#masonryGrid');
  var empty=$('#galEmpty');
  if(!grid||!empty)return;

  grid.innerHTML='';
  empty.style.display='none';

  /* ── 1. Ainda aguardando banco (sem cache) → skeleton ── */
  if(DB_LOADING&&!FOTOS.length){
    grid.style.display='';
    renderSkeleton(grid);
    return;
  }

  /* ── 2. Filtra lista ── */
  var lista;
  if(filtro==='video'){
    lista=FOTOS.filter(function(f){return f.tipo==='video'||f.tipo==='video_yt'||f.tipo==='video_up';});
  }else if(filtro){
    lista=FOTOS.filter(function(f){return(f.cat||'').toLowerCase()===filtro.toLowerCase();});
  }else{
    lista=FOTOS;
  }

  /* ── 3. Lista vazia após filtro ── */
  if(!lista.length){
    grid.style.display='';
    /* distingue: sem fotos no banco vs filtro sem resultado */
    if(!FOTOS.length){
      renderEmptyState(grid,false);
    }else{
      /* categoria sem fotos → mensagem inline simples */
      empty.style.display='block';
    }
    return;
  }

  /* ── 4. Renderiza cards reais ── */
  grid.style.display='';
  applyMasonryColumns();

  lista.forEach(function(foto,i){
    var item=document.createElement('div');
    item.className='masonry-item glass';
    var dur=(4.8+i%6*0.7).toFixed(2);
    var delay=(i%7*0.65).toFixed(2);
    item.style.animation='masonryBreath '+dur+'s '+delay+'s ease-in-out infinite';

    var isVid=(foto.tipo==='video'||foto.tipo==='video_yt'||foto.tipo==='video_up');
    var thumbUrl=isVid
      ?(foto.tipo==='video_up'?(foto.url_thumb||foto.url):ytThumb(foto.video_url))
      :(foto.url_thumb||foto.url);

    var html='';
    if(foto.destaque) html+='<span class="masonry-dest">\u2B50</span>';
    if(isVid)         html+='<div class="masonry-play">\u25B6</div>';

    /* ── imagem sem fallback para foto aleatória ── */
    
html += '<img src="' + (thumbUrl||'') + '" alt="' + (foto.titulo || '') + '" ' +
        (i < 6 ? 'loading="eager"' : 'loading="lazy"') +
        ' onerror="this.style.display=\'none\';this.parentElement.classList.add(\'img-error\')"' +
        ' onload="this.style.opacity=1"' +
        ' style="opacity:0;transition:opacity .4s ease">';

    
        html+='<div class="masonry-overlay">'+
            '<div class="masonry-cat">'+(CATS[foto.cat]||foto.cat||'')+'</div>'+
            '<div class="masonry-titulo">'+(foto.titulo||'')+'</div>'+
          '</div>';




    item.innerHTML=html;
    item.style.opacity='0';
    item.style.transform='translateY(20px)';
    setTimeout(function(){
      item.style.transition='opacity .5s var(--ease-out-expo),transform .5s var(--ease-out-expo)';
      item.style.opacity='1';
      item.style.transform='translateY(0)';
      setTimeout(function(){item.style.transition='';},520);
    },60+i*55);

    item.addEventListener('click',function(){abrirLb(i,lista);});
    grid.appendChild(item);
  });
}

/* ========== LIGHTBOX ========== */
function abrirLb(idx,lista){lbLista=lista;lbIdx=idx;atualizarLb();var lb=$('#lightbox');if(lb)lb.classList.add('open');document.body.style.overflow='hidden';preloadAdjacentLb(idx,lista);}
function fecharLb(){var lb=$('#lightbox');if(lb)lb.classList.remove('open');document.body.style.overflow='';limparLbMedia();}
function navegarLb(dir){limparLbMedia();lbIdx=(lbIdx+dir+lbLista.length)%lbLista.length;atualizarLb();preloadAdjacentLb(lbIdx,lbLista);}
function preloadAdjacentLb(idx,lista){[-1,1].forEach(function(offset){var target=lista[(idx+offset+lista.length)%lista.length];if(!target)return;var isVid=(target.tipo==='video'||target.tipo==='video_yt'||target.tipo==='video_up');var src=isVid?(target.tipo==='video_up'?(target.url_thumb||target.url):ytThumb(target.video_url)):(target.url||target.url_thumb);if(src){var img=new Image();img.src=src;}});}
function limparLbMedia(){var inner=$('#lbInner');if(!inner)return;var yt=inner.querySelector('.lb-video-yt');if(yt)yt.remove();var vid=inner.querySelector('video');if(vid)vid.remove();var fb=inner.querySelector('.lb-video-fallback');if(fb)fb.remove();var img=$('#lbImg');if(img)img.style.display='';}
function atualizarLb(){
  var f=lbLista[lbIdx];var inner=$('#lbInner');var img=$('#lbImg');
  if(!f||!inner||!img)return;
  var isYt=(f.tipo==='video'||f.tipo==='video_yt')&&f.video_url;
  var isUp=(f.tipo==='video_up')&&f.url;
  if(isYt){
    img.style.display='none';
    var videoId=ytId(f.video_url);
    if(videoId){
      var iframe=document.createElement('iframe');
      iframe.className='lb-video-yt';
      iframe.src='https://www.youtube-nocookie.com/embed/'+videoId+'?autoplay=1&rel=0';
      iframe.allow='accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share';
      iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
      iframe.setAttribute('allowfullscreen','true');
      var fallbackTimer=setTimeout(function(){iframe.remove();showVideoFallback(inner,f,videoId);},8000);
      iframe.addEventListener('load',function(){clearTimeout(fallbackTimer);});
      iframe.addEventListener('error',function(){clearTimeout(fallbackTimer);iframe.remove();showVideoFallback(inner,f,videoId);});
      inner.insertBefore(iframe,inner.querySelector('.lb-caption'));
    }else{showVideoFallback(inner,f,'');}
  }else if(isUp){
    img.style.display='none';
    var video=document.createElement('video');
    video.controls=true;video.autoplay=true;video.playsInline=true;video.src=f.url;
    inner.insertBefore(video,inner.querySelector('.lb-caption'));
  }else{
    img.style.display='';img.src=f.url||f.url_thumb;
  }
  var cap=$('#lbCaption');
  if(cap)cap.textContent=[f.titulo,CATS[f.cat]||f.cat,f.local].filter(Boolean).join(' \u00B7 ');
}
function showVideoFallback(container,foto,videoId){
  var div=document.createElement('div');div.className='lb-video-fallback';
  var thumbSrc=videoId?'https://img.youtube.com/vi/'+videoId+'/hqdefault.jpg':'';
  var ytLink=videoId?'https://www.youtube.com/watch?v='+videoId:foto.video_url;
  div.innerHTML=
    (thumbSrc?'<div class="lb-fallback-thumb"><img src="'+thumbSrc+'" alt="'+(foto.titulo||'')+'"></div>':'')+
    '<p style="font-size:.9rem;color:rgba(255,255,255,.7)">Este vídeo não permite reprodução incorporada</p>'+
    '<a href="'+ytLink+'" target="_blank" rel="noopener" class="lb-fallback-btn">\u25B6 Assistir no YouTube</a>';
  container.insertBefore(div,container.querySelector('.lb-caption'));
}
(function(){
  var startX=0;
  document.addEventListener('touchstart',function(e){if($('#lightbox')&&$('#lightbox').classList.contains('open'))startX=e.touches[0].clientX;},{passive:true});
  document.addEventListener('touchend',function(e){if(!$('#lightbox')||!$('#lightbox').classList.contains('open'))return;var dx=e.changedTouches[0].clientX-startX;if(Math.abs(dx)>50)navegarLb(dx<0?1:-1);});
})();
document.addEventListener('keydown',function(e){var lb=$('#lightbox');if(!lb||!lb.classList.contains('open'))return;if(e.key==='Escape')fecharLb();if(e.key==='ArrowLeft')navegarLb(-1);if(e.key==='ArrowRight')navegarLb(1);});

/* ========== ADMIN OVERLAY ========== */
function abrirAdmin(){$('#adminOverlay').classList.add('open');document.body.style.overflow='hidden';renderAdminList();}
function fecharAdmin(){$('#adminOverlay').classList.remove('open');document.body.style.overflow='';}
function toggleTipoAdmin(){
  var tipo=document.querySelector('input[name=adminTipo]:checked').value;
  $('#adminUploadWrap').style.display=tipo==='foto'?'':'none';
  $('#adminVideoYtWrap').style.display=tipo==='video_yt'?'':'none';
  $('#adminVideoUpWrap').style.display=tipo==='video_up'?'':'none';
}
(function(){var zone=$('#uploadZone');if(!zone)return;zone.addEventListener('dragover',function(e){e.preventDefault();zone.classList.add('dragover');});zone.addEventListener('dragleave',function(){zone.classList.remove('dragover');});zone.addEventListener('drop',function(e){e.preventDefault();zone.classList.remove('dragover');handleFiles(e.dataTransfer.files);});})();
(function(){var zone=$('#uploadZoneVid');if(!zone)return;zone.addEventListener('dragover',function(e){e.preventDefault();zone.classList.add('dragover');});zone.addEventListener('dragleave',function(){zone.classList.remove('dragover');});zone.addEventListener('drop',function(e){e.preventDefault();zone.classList.remove('dragover');handleVidFile(e.dataTransfer.files);});})();
function handleFiles(files){adminFiles=Array.from(files).filter(function(f){return f.type.startsWith('image/');});if(adminFiles.length){$('#uploadZone').textContent=adminFiles.length+' foto(s) selecionada(s)';toast(adminFiles.length+' foto(s) pronta(s)','info');}}
function handleVidFile(files){var f=Array.from(files).filter(function(f){return f.type.startsWith('video/');})[0];if(!f)return;if(f.size>52428800){toast('Vídeo muito grande (máx 50MB)','err');return;}adminVidFile=f;$('#uploadZoneVid').textContent=f.name+' ('+Math.round(f.size/1048576)+'MB)';toast('Vídeo pronto','info');}
function comprimirImagem(file,maxW,quality){return new Promise(function(resolve){var reader=new FileReader();reader.onload=function(e){var img=new Image();img.onload=function(){var w=img.width;var h=img.height;if(w>maxW){h=Math.round(h*(maxW/w));w=maxW;}var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);canvas.toBlob(function(blob){resolve(blob);},'image/jpeg',quality);};img.src=e.target.result;};reader.readAsDataURL(file);});}
function gerarThumbVideo(file){return new Promise(function(resolve){var timeout=setTimeout(function(){criarThumbGenericaBlob(file,resolve);},3000);try{var video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;video.setAttribute('crossorigin','anonymous');function capturar(){clearTimeout(timeout);try{var canvas=document.createElement('canvas');canvas.width=Math.min(video.videoWidth||600,600);canvas.height=Math.round(canvas.width*((video.videoHeight||338)/(video.videoWidth||600)));canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(function(blob){URL.revokeObjectURL(video.src);resolve(blob);},'image/jpeg',0.7);}catch(e){URL.revokeObjectURL(video.src);criarThumbGenericaBlob(file,resolve);}}video.onseeked=capturar;video.onloadeddata=function(){video.currentTime=0.5;setTimeout(function(){if(video.readyState>=2)capturar();},2000);};video.onerror=function(){clearTimeout(timeout);URL.revokeObjectURL(video.src);criarThumbGenericaBlob(file,resolve);};video.src=URL.createObjectURL(file);video.load();}catch(e){clearTimeout(timeout);criarThumbGenericaBlob(file,resolve);}});}
function criarThumbGenericaBlob(file,resolve){var canvas=document.createElement('canvas');canvas.width=600;canvas.height=338;var ctx=canvas.getContext('2d');ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,600,338);ctx.beginPath();ctx.arc(300,169,50,0,Math.PI*2);ctx.fillStyle='#8b5cf6';ctx.fill();ctx.beginPath();ctx.moveTo(285,145);ctx.lineTo(285,193);ctx.lineTo(325,169);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.font='bold 13px sans-serif';ctx.fillStyle='rgba(255,255,255,.6)';ctx.textAlign='center';ctx.fillText(file.name.substring(0,40),300,310);canvas.toBlob(function(blob){resolve(blob);},'image/jpeg',0.8);}
function publicar(){
  var tipo=document.querySelector('input[name=adminTipo]:checked').value;
  var titulo=$('#adminTitulo').value.trim();var cat=$('#adminCat').value;var local=$('#adminLocal').value.trim();var desc=$('#adminDesc').value.trim();var dest=$('#adminDest').checked?1:0;
  var btn=$('#btnPublicar');btn.disabled=true;btn.textContent='Publicando...';
  if(tipo==='video_yt'){var videoUrl=$('#adminVideoUrl').value.trim();if(!videoUrl){toast('Cole a URL do YouTube','err');btn.disabled=false;btn.textContent='📤 Publicar';return;}var videoId=ytId(videoUrl);if(!videoId){toast('URL do YouTube inválida','err');btn.disabled=false;btn.textContent='📤 Publicar';return;}sbPost(TAB_FOTOS,{titulo:titulo||'Vídeo',cat:cat,local:local,descricao:desc,tipo:'video_yt',url:ytThumb(videoUrl),url_thumb:ytThumb(videoUrl),video_url:videoUrl,destaque:dest,ordem:FOTOS.length+1}).then(function(){toast('Vídeo YouTube publicado!','ok');resetAdmin();loadAll();}).catch(function(err){toast('Erro ao salvar vídeo: '+err.message,'err');}).finally(function(){btn.disabled=false;btn.textContent='📤 Publicar';});return;}
  if(tipo==='video_up'){if(!adminVidFile){toast('Selecione um vídeo','err');btn.disabled=false;btn.textContent='📤 Publicar';return;}var ts=Date.now();var pathVid='videos/'+ts+'.'+adminVidFile.name.split('.').pop();var pathThumb='thumb/'+ts+'_vt.jpg';btn.textContent='Gerando thumb...';gerarThumbVideo(adminVidFile).then(function(thumbBlob){btn.textContent='Subindo vídeo...';return Promise.all([sbUpload(pathVid,adminVidFile),sbUpload(pathThumb,thumbBlob)]).then(function(){return sbPost(TAB_FOTOS,{titulo:titulo||adminVidFile.name,cat:cat,local:local,descricao:desc,tipo:'video_up',url:sbPublicUrl(pathVid),url_thumb:sbPublicUrl(pathThumb),video_url:'',destaque:dest,ordem:FOTOS.length+1});});}).then(function(){toast('Vídeo publicado!','ok');resetAdmin();loadAll();}).catch(function(err){toast('Erro: '+err.message,'err');}).finally(function(){btn.disabled=false;btn.textContent='📤 Publicar';});return;}
  if(!adminFiles.length){toast('Selecione pelo menos uma foto','err');btn.disabled=false;btn.textContent='📤 Publicar';return;}
  var promises=adminFiles.map(function(file,i){var ts2=Date.now()+'_'+i;var pathFull='full/'+ts2+'.jpg';var pathThumb2='thumb/'+ts2+'.jpg';return Promise.all([comprimirImagem(file,2000,0.80),comprimirImagem(file,600,0.70)]).then(function(blobs){return Promise.all([sbUpload(pathFull,blobs[0]),sbUpload(pathThumb2,blobs[1])]).then(function(){return sbPost(TAB_FOTOS,{titulo:titulo||(file.name.replace(/\.[^.]+$/,'')),cat:cat,local:local,descricao:desc,tipo:'foto',url:sbPublicUrl(pathFull),url_thumb:sbPublicUrl(pathThumb2),video_url:'',destaque:dest,ordem:FOTOS.length+1+i});});});});
  Promise.all(promises).then(function(){toast(adminFiles.length+' foto(s) publicada(s)!','ok');resetAdmin();loadAll();}).catch(function(err){toast('Erro no upload: '+err.message,'err');}).finally(function(){btn.disabled=false;btn.textContent='📤 Publicar';});
}
function resetAdmin(){adminFiles=[];adminVidFile=null;$('#adminTitulo').value='';$('#adminLocal').value='';$('#adminDesc').value='';$('#adminDest').checked=false;$('#adminVideoUrl').value='';$('#uploadZone').textContent='Arraste fotos aqui ou toque para selecionar';$('#uploadZoneVid').textContent='Arraste vídeo aqui ou toque para selecionar (máx 50MB)';document.querySelector('input[name=adminTipo][value=foto]').checked=true;toggleTipoAdmin();}
function renderAdminList(){
  var list=$('#adminList');if(!list)return;list.innerHTML='';
  if(!FOTOS.length){
    list.innerHTML='<p style="text-align:center;opacity:.5;padding:20px 0;font-size:.85rem">Nenhuma mídia cadastrada ainda.</p>';
    return;
  }
  FOTOS.forEach(function(f){
    var isVid=(f.tipo==='video'||f.tipo==='video_yt'||f.tipo==='video_up');
    var thumbSrc=isVid?(f.tipo==='video_up'?(f.url_thumb||f.url):ytThumb(f.video_url)):(f.url_thumb||f.url);
    var div=document.createElement('div');div.className='admin-item';
    div.innerHTML='<img src="'+thumbSrc+'" alt=""><div class="admin-item-info"><input value="'+(f.titulo||'')+'" placeholder="Título" onchange="editField(\''+f.id+'\',\'titulo\',this.value)"><div style="display:flex;gap:6px"><select onchange="editField(\''+f.id+'\',\'cat\',this.value)">'+buildCatOptions(f.cat)+'</select><input value="'+(f.local||'')+'" placeholder="Local" onchange="editField(\''+f.id+'\',\'local\',this.value)"></div><input value="'+(f.descricao||'')+'" placeholder="Descrição" onchange="editField(\''+f.id+'\',\'descricao\',this.value)"></div><div class="admin-item-actions"><button class="'+(f.destaque?'dest-on':'')+'" onclick="toggleDest(\''+f.id+'\','+f.destaque+')" title="Destaque">\u2B50</button><button onclick="moverItem(\''+f.id+'\',-1)" title="Subir">\u25B2</button><button onclick="moverItem(\''+f.id+'\',1)" title="Descer">\u25BC</button><button onclick="deletarItem(\''+f.id+'\')" title="Excluir">\uD83D\uDDD1</button></div>';
    list.appendChild(div);
  });
}
function buildCatOptions(selected){var html='';CATS_LIST.forEach(function(c){html+='<option value="'+c.slug+'"'+(c.slug===selected?' selected':'')+'>'+c.emoji+' '+c.nome+'</option>';});return html;}
function buildAdminCatSelect(){var sel=$('#adminCat');if(!sel)return;sel.innerHTML=buildCatOptions(CATS_LIST.length?CATS_LIST[0].slug:'');}
function editField(id,field,value){if(id.startsWith('d'))return;var body={};body[field]=value;sbPatch(TAB_FOTOS,id,body).then(function(){toast('Atualizado','ok');}).catch(function(){toast('Erro ao atualizar','err');});FOTOS.forEach(function(f){if(f.id===id)f[field]=value;});}
function toggleDest(id,atual){var novo=atual?0:1;if(!id.startsWith('d')){sbPatch(TAB_FOTOS,id,{destaque:novo}).then(function(){toast(novo?'Destaque ativado':'Destaque removido','ok');loadAll();}).catch(function(){toast('Erro','err');});}}
function moverItem(id,dir){var idx=FOTOS.findIndex(function(f){return f.id===id;});if(idx<0)return;var newIdx=idx+dir;if(newIdx<0||newIdx>=FOTOS.length)return;var temp=FOTOS[idx];FOTOS[idx]=FOTOS[newIdx];FOTOS[newIdx]=temp;var promises=[];FOTOS.forEach(function(f,i){f.ordem=i+1;if(!f.id.startsWith('d'))promises.push(sbPatch(TAB_FOTOS,f.id,{ordem:i+1}));});Promise.all(promises).then(function(){renderAdminList();renderMasonry(filtroAtual);buildMare();}).catch(function(){toast('Erro ao reordenar','err');});}
function deletarItem(id){if(!confirm('Excluir esta mídia?'))return;if(id.startsWith('d')){FOTOS=FOTOS.filter(function(f){return f.id!==id;});renderAdminList();renderMasonry(filtroAtual);return;}sbDelete(TAB_FOTOS,id).then(function(){toast('Excluído','ok');loadAll();}).catch(function(){toast('Erro ao excluir','err');});}
function renderCatManager(){var list=$('#catList');if(!list)return;list.innerHTML='';CATS_LIST.forEach(function(c){var tag=document.createElement('span');tag.className='cat-tag';tag.innerHTML=(c.emoji||'')+' '+c.nome+' <button class="cat-del" onclick="delCat(\''+c.id+'\')" title="Excluir">\u00D7</button>';list.appendChild(tag);});}
function addCat(){var nome=$('#catNovoNome').value.trim();var emoji=$('#catNovoEmoji').value.trim()||'📌';if(!nome){toast('Digite o nome da categoria','err');return;}var slug=nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');sbPost(TAB_CATS,{slug:slug,nome:nome,emoji:emoji,ordem:CATS_LIST.length+1}).then(function(){toast('Categoria adicionada','ok');$('#catNovoNome').value='';$('#catNovoEmoji').value='';loadAll();}).catch(function(err){toast('Erro: '+err.message,'err');});}
function delCat(id){if(!id||id.startsWith('d'))return;if(!confirm('Excluir esta categoria?'))return;sbDelete(TAB_CATS,id).then(function(){toast('Categoria excluída','ok');loadAll();}).catch(function(){toast('Erro','err');});}

/* ========== FOOTER triple tap ========== 
(function(){var taps=0;var timer=null;var footer=$('#siteFooter');if(!footer)return;footer.addEventListener('click',function(){taps++;if(taps===1)timer=setTimeout(function(){taps=0;},800);if(taps>=3){taps=0;clearTimeout(timer);abrirAdmin();}});})();  */

/* ========== FAB WHATSAPP ========== */
(function(){var fab=$('#fabWa');if(!fab)return;fab.addEventListener('click',function(e){e.preventDefault();var wa=(C&&C.contatos&&C.contatos.whatsapp)||(C&&C.fallback&&C.fallback.whatsapp)||'5511948564577';var msg=(CFG&&CFG.wa_msg_galeria)||'Olá! Vi a galeria da 432UP e quero saber mais.';window.open('https://wa.me/'+wa+'?text='+encodeURIComponent(msg),'_blank');});})();

/* ========== GLOBALS ========== */
window.filtrar=filtrar;
window.fecharLb=fecharLb;window.navegarLb=navegarLb;
window.abrirAdmin=abrirAdmin;window.fecharAdmin=fecharAdmin;
window.toggleTipoAdmin=toggleTipoAdmin;
window.handleFiles=handleFiles;window.handleVidFile=handleVidFile;
window.publicar=publicar;
window.editField=editField;window.toggleDest=toggleDest;
window.moverItem=moverItem;window.deletarItem=deletarItem;
window.addCat=addCat;window.delCat=delCat;

/* ========== INIT — v1.7.0 ========== */
(async function init(){
  try{

    /* 0) Tema imediato */
    if(!document.documentElement.getAttribute('data-theme')){
      document.documentElement.setAttribute('data-theme','dark');
    }

    /* 1) Busca config do banco em paralelo */
    var cfgPromise=(CORE&&CORE.loadVisualConfig)
      ?CORE.loadVisualConfig()
      :Promise.resolve(null);

    /* 2) Setup síncrono */
    applyGalleryConfig();
    setupMareDrag();
    loadAll();
    window.addEventListener('resize',function(){applyMasonryColumns();});
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&$('#adminOverlay')&&
         $('#adminOverlay').classList.contains('open'))fecharAdmin();
    });

    /* 3) Aguarda config */
    var cfg=await cfgPromise;

    /* 4) Mescla no CFG local */
    if(cfg&&typeof cfg==='object'){
      Object.keys(cfg).forEach(function(k){CFG[k]=cfg[k];});
    }

    /* 5) Reaplica tema */
    if(cfg&&cfg.tema_ativo&&!document.documentElement.getAttribute('data-theme-locked')){
      if(cfg.tema_ativo!=='auto'&&cfg.tema_ativo!=='gloomvale'){
        document.documentElement.setAttribute('data-theme',cfg.tema_ativo);
      }
    }

    /* 6) Reaplica layout/BPM */
    applyGalleryConfig();

    /* 7) Gera as camadas visuais */
    gerarCamadas();

  }catch(e){
    console.error('[432UP Galeria init]',e);
    DB_LOADING=false;
    gerarCamadas();
    renderMasonry(filtroAtual);
    toast('Erro ao iniciar a galeria','err');
  }
})();

})();
