/* ========== v3.10.0 BUILD 2026-03-05 — CORE VISUAL ENGINE (HOME) ========== */
/* Base: js/index.js v3.9.9-2
   Patch: visual config centralizado no CORE (core.js v2.6)
   - loadAll não busca mais co_configuracoes via sbGet local
   - loadAll chama CORE.applyVisualForPage('home') em paralelo
   - applyVisualConfig local vira wrapper (delegando ao CORE) + side-effects do HOME
*/

(function(){'use strict';

var C = window.CONFIG_432UP || window.C;
var CORE = window.CORE_432UP;
if (!C || !CORE) {
  console.error('[432UP] Config/Core não carregados!');
  return;
}

var isMob = C.isMobile;
var ALG_N = C.particles.algae();
var ORB_N = C.particles.orbs();
var PRT_N = C.particles.particles();

/* PATCH BPM 1 — fator global para acelerar/desacelerar durações */
var BPM_BASE = 74;
var BPM_FACTOR = 1;         // >1 = mais rápido (duração menor)
var _lastBpmApplied = null;
var _lastThemeApplied = null;

function setBpmFactor(bpm){
  var b = parseInt(bpm) || BPM_BASE;
  BPM_FACTOR = Math.max(0.2, Math.min(4, b / BPM_BASE));
}

function applyBpmToBands(bpm){
  var speed = Math.max(0.2, Math.min(4, (parseInt(bpm)||BPM_BASE) / BPM_BASE));

  // Aurora: durações base do CSS (11s,14s,9s,17s)
  var aurBase = [11,14,9,17];
  document.querySelectorAll('.aurora-band').forEach(function(el,i){
    var base = aurBase[i] || 12;
    el.style.animationDuration = (base / speed).toFixed(3) + 's';
  });

  // Fog: durações base do CSS (22s,32s)
  var fogBase = [22,32];
  document.querySelectorAll('.fog-band').forEach(function(el,i){
    var base = fogBase[i] || 30;
    el.style.animationDuration = (base / speed).toFixed(3) + 's';
  });
}

function $(s){return C.$(s)}
function $$(s){return C.$$(s)}

async function sbGet(t,q){
  try{
    var r=await fetch(C.supabase.url+'/rest/v1/'+t+'?'+q,{
      headers:{'apikey':C.supabase.key,'Authorization':'Bearer '+C.supabase.key}
    });
    if(!r.ok)throw r;
    return await r.json();
  }catch(e){
    return null;
  }
}

async function sbPost(t,b){
  try{
    var r=await fetch(C.supabase.url+'/rest/v1/'+t,{
      method:'POST',
      headers:{
        'apikey':C.supabase.key,
        'Authorization':'Bearer '+C.supabase.key,
        'Content-Type':'application/json',
        'Prefer':'return=representation'
      },
      body:JSON.stringify(b)
    });
    return r.ok;
  }catch(e){
    return false;
  }
}

var CACHE_SECOES='432_secoes';
var CACHE_SERVICOS='432_servicos';
var CACHE_PACOTES='432_pacotes';
var CACHE_DEPOIMENTOS='432_depoimentos';
var CACHE_FAQ='432_faq';
var CACHE_GALERIA='432_galeria_home';

function cacheGet(key){
  try{
    var d=localStorage.getItem(key);
    return d?JSON.parse(d):null;
  }catch(e){
    return null;
  }
}

function cacheSet(key,data){
  try{
    localStorage.setItem(key,JSON.stringify(data));
  }catch(e){}
}

/* ====== CONFETTI + SPARKLES (substitui genAlgae) — v3.9.6 ====== */
function genConfetti(){
  var c=$('#algaeLayer');c.innerHTML='';
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

  var total=ALG_N;
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

  // Debug camadas
  var aur = document.querySelectorAll('.aurora-band');
  var fog = document.querySelectorAll('.fog-band');
  var info = 'AUR:' + aur.length + ' op:' + (aur[0]?getComputedStyle(aur[0]).opacity:'0');
  info += ' | FOG:' + fog.length + ' op:' + (fog[0]?getComputedStyle(fog[0]).opacity:'0');
  info += ' | CNF:' + document.querySelectorAll('.confetti').length;
  info += ' | SPK:' + document.querySelectorAll('.sparkle').length;
  var db = document.getElementById('dAlg');
  if(db) db.textContent = info;
}

function genOrbs(){
  var c=$('#orbsLayer');c.innerHTML='';
  for(var i=0;i<ORB_N;i++){
    var d=document.createElement('div');d.className='orb';
    var s=5+Math.random()*17;
    var odur=(6+Math.random()*12)/BPM_FACTOR;
    d.style.cssText='width:'+s+'px;height:'+s+'px;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;--ox:'+(3+Math.random()*10)+'px;--oy:'+(-3-Math.random()*10)+'px;--oy2:'+(2+Math.random()*8)+'px;animation:orbFloat '+odur+'s ease-in-out infinite '+(Math.random()*-8)+'s;opacity:'+(0.3+Math.random()*0.4);
    c.appendChild(d);
  }
  $('#dOrb').textContent=ORB_N;
}

function genParticles(){
  var c=$('#particlesLayer');c.innerHTML='';
  for(var i=0;i<PRT_N;i++){
    var d=document.createElement('div');d.className='ptc';
    var pdur=(4+Math.random()*10)/BPM_FACTOR;
    d.style.cssText='left:'+Math.random()*100+'%;top:'+(60+Math.random()*40)+'%;--po:'+(0.15+Math.random()*0.35)+';--py:'+(-30-Math.random()*80)+'px;animation:ptcFloat '+pdur+'s linear infinite '+(Math.random()*-8)+'s';
    c.appendChild(d);
  }
  $('#dPrt').textContent=PRT_N;
}

/* ====== side-effects específicos do HOME ao aplicar config visual ====== */
function applyIndexVisualSideEffects(v){
  if(!v) return;

// ← ADICIONAR ESTAS DUAS LINHAS:
  var overlay = document.getElementById('calcOverlay');
  if(overlay && overlay.classList.contains('open')) return;

  // ... resto da função continua igual

  // tema atual (para regenerar paleta do confetti)
  var curTheme = document.documentElement.getAttribute('data-theme') || document.documentElement.dataset.theme;
  var themeChanged = curTheme && curTheme !== _lastThemeApplied;
  if(themeChanged) _lastThemeApplied = curTheme;

  // bpm
  var bpmChanged = false;
  if(v.bpm_global!=null){
    var bpm=parseInt(v.bpm_global)||74;
    setBpmFactor(bpm);
    applyBpmToBands(bpm);
    if(_lastBpmApplied!==bpm){ bpmChanged=true; _lastBpmApplied=bpm; }
  }

  // densidades (home)
  var regen=false;
  if(v.orbs_intensity!=null){
    var newOrb=Math.max(0,Math.round((C.isMobile?12:22)*(v.orbs_intensity/50)));
    if(newOrb!==ORB_N){ ORB_N=newOrb; regen=true; }
  }
  if(v.particles_density!=null){
    var newPrt=Math.max(0,Math.round((C.isMobile?60:120)*(v.particles_density/50)));
    if(newPrt!==PRT_N){ PRT_N=newPrt; regen=true; }
  }

  // maré (home)
  if(v.tide_speed!=null) mareSpeed=parseFloat(v.tide_speed)||0.5;

  // motion level (css var)
  if(v.motion_level){
    var ml={'subtle':'0.4','normal':'1','intense':'1.8'};
    document.documentElement.style.setProperty('--motion',ml[v.motion_level]||'1');
  }

  if(themeChanged || bpmChanged) regen=true;

  if(regen){
    genConfetti();
    genOrbs();
    genParticles();
  }
}

function updateDebugMetrics(){
  var bonds=$$('section,header,footer,.glass,.card,.pkg,.test,.badge,.num-card,.faq-item,.form-wrap,.fab').length;
  var elg=ALG_N+ORB_N+PRT_N+bonds;
  $('#dBond').textContent=bonds;
  $('#dElg').textContent=elg;
}

function rCards(){

  $$('.card,.pkg,.test,.faq-item,.form-wrap,.badge,.num-card,.mare-item').forEach(function(el){
    el.style.setProperty('--cd',(2.5+Math.random()*3)+'s');
    el.style.setProperty('--cddl',(-Math.random()*4)+'s');
    el.style.setProperty('--cty',(-1-Math.random()*4)+'px');
    el.style.setProperty('--cty2',(-1-Math.random()*3)+'px');
    el.style.setProperty('--csc',(0.002+Math.random()*0.01));
    el.style.setProperty('--csc2',(0.003+Math.random()*0.008));
    el.style.setProperty('--bd',(2.5+Math.random()*2.5)+'s');
    el.style.setProperty('--bddl',(-Math.random()*3)+'s');
    el.style.setProperty('--nd',(3+Math.random()*3)+'s');
    el.style.setProperty('--nddl',(-Math.random()*3)+'s');
  });
  updateDebugMetrics();
}

function waMask(el){
  el.addEventListener('input',function(){
    var v=el.value.replace(/\D/g,'');
    if(v.length>11)v=v.substring(0,11);
    if(v.length>7)el.value='('+v.substring(0,2)+') '+v.substring(2,7)+'-'+v.substring(7);
    else if(v.length>2)el.value='('+v.substring(0,2)+') '+v.substring(2);
    else if(v.length>0)el.value='('+v;
  });
}

function animateNumbers(){

  $$('.num-card .num-val').forEach(function(el){
    var target=parseInt(el.dataset.target)||0;
    var suffix=el.dataset.suffix||'';
    var rect=el.getBoundingClientRect();
    if(rect.top<window.innerHeight&&!el.dataset.done){
      el.dataset.done='1';
      var t0=null;
      function step(ts){
        if(!t0)t0=ts;
        var p=Math.min((ts-t0)/1500,1);
        el.textContent=Math.floor(p*target)+suffix;
        if(p<1)requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
  });
}

var fadeObs=new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){e.target.classList.add('visible');fadeObs.unobserve(e.target);}
  });
},{threshold:0.1,rootMargin:'0px 0px -40px 0px'});


$$('.fade-in').forEach(function(el){fadeObs.observe(el);});

/* FIX 3: buildStrip agora recebe dados do banco */
function buildStrip(stripData){
  var words;
  if(stripData&&stripData.titulo){
    words=stripData.titulo.split('+').map(function(w){return w.trim()}).filter(function(w){return w});
  }
  if(!words||!words.length){
    words=['✦ +500 EVENTOS REALIZADOS','MORUMBI','98% SATISFAÇÃO','VILA OLÍMPIA','GUARULHOS','10+ ANOS','MOEMA','CAMPINAS','SANTO ANDRÉ','ALPHAVILLE','BROOKLIN'];
  }
  var t='';
  for(var i=0;i<4;i++)words.forEach(function(w){t+='<span style="padding:0 20px">'+w+' ✦</span>';});
  $('#stripTrack').innerHTML=t;
}

var FB_DOR=[
  {t:'🔇 O grave some na hora do brinde',p:'O momento mais esperado da noite — e ninguém ouve. O silêncio constrangedor fica na memória de todos.'},
  {t:'💡 A luz não muda o estado de ninguém',p:'Iluminação genérica que faz o salão parecer refeitório. Sem atmosfera, sem emoção, sem identidade.'},
  {t:'⏰ A equipe chega depois dos convidados',p:'Seus convidados já estão lá. A mesa de som ainda está sendo montada. A ansiedade toma conta.'},
  {t:'🎧 O DJ não lê a pista',p:'Ele toca o repertório dele, não o do seu público. A pista esvazia. Os convidados vão pro bar.'}
];

var FB_COMO=[
  {n:1,t:'Você conta o que sonhou'},
  {n:2,t:'Desenhamos cada detalhe'},
  {n:3,t:'Você aprova sem surpresas'},
  {n:4,t:'Montamos tudo antes de você chegar'},
  {n:5,t:'Você só aproveita'}
];

var FB_NUM=[
  {v:12000,s:'+',l:'Horas de pista iluminada'},
  {v:3200,s:'+',l:'Músicas que fizeram alguém chorar de alegria'},
  {v:850,s:'+',l:'Noivas que dançaram a valsa perfeita'},
  {v:999,s:'∞',l:'Memórias que ninguém esquece'}
];

var FB_SRV=[
  {icone:'🎧',nome:'DJ Profissional',descricao:'Sets curados para cada momento: recepção, jantar, pista. Leitura de público em tempo real.'},
  {icone:'🔊',nome:'Sonorização Premium',descricao:'Aquele grave que faz o peito vibrar e os olhos brilhar — sem estourar, sem falhar, a noite inteira.'},
  {icone:'💡',nome:'Iluminação Cênica',descricao:'A luz que transforma o salão em cenário de cinema e faz cada momento ter a cor certa.'},
  {icone:'🎤',nome:'Banda ao Vivo',descricao:'Músicos que sentem a pista e transformam repertório em trilha sonora sob medida.'},
  {icone:'🎬',nome:'Filmagem & Foto',descricao:'Captação cinematográfica que congela a emoção — para você reviver quando quiser.'},
  {icone:'🏗️',nome:'Palco & Estruturas',descricao:'Do chão ao grid de luz: a base que sustenta o espetáculo com segurança e impacto visual.'}
];

var FB_PKG=[
  {nome:'Bronze',preco_pacote:2490,preco_original:3400,horas_inclusas:4,ideal_para:'Eventos de até 100 pessoas',itens:['DJ Profissional (4h)','Sonorização básica'],destaque:false},
  {nome:'Prata',preco_pacote:3690,preco_original:4800,horas_inclusas:5,ideal_para:'Festas e formaturas até 250 pessoas',itens:['DJ Profissional (5h)','Sonorização completa','Iluminação Cênica'],destaque:true},
  {nome:'Ouro',preco_pacote:6490,preco_original:10300,horas_inclusas:6,ideal_para:'Experiências completas e inesquecíveis',itens:['DJ Profissional (6h)','Sonorização completa','Iluminação Cênica','Palco Estrutural','Filmagem & Foto'],destaque:false}
];

var FB_GALERIA=[
  {id:'d1',titulo:'Casamento Premium',tipo:'foto',url:'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',url_thumb:'https://images.unsplash.com/photo-1519741497674-611481863552?w=400'},
  {id:'d2',titulo:'Formatura Medicina',tipo:'foto',url:'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=600',url_thumb:'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=400'},
  {id:'d3',titulo:'Evento Corporativo',tipo:'foto',url:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',url_thumb:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400'},
  {id:'d4',titulo:'Aniversário 15 anos',tipo:'foto',url:'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600',url_thumb:'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400'},
  {id:'d5',titulo:'Festival 432Hz',tipo:'foto',url:'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600',url_thumb:'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400'},
  {id:'d6',titulo:'Casamento na Praia',tipo:'foto',url:'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600',url_thumb:'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400'}
];

function ytId(url){
  if(!url)return'';
  var m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  return m?m[1]:'';
}

function ytThumb(url){
  var id=ytId(url);
  return id?'https://img.youtube.com/vi/'+id+'/hqdefault.jpg':'';
}

var GALERIA_FOTOS=[];
var mareOffset=0;
var mareSpeed=0.5;
var mareAnimId=null;
var mareDragging=false;
var mareStartX=0;

function buildMare(){
  var track=$('#mareTrack');
  if(!track)return;
  track.innerHTML='';

  if(!GALERIA_FOTOS.length){
    track.innerHTML='<div style="text-align:center;padding:40px 20px;color:var(--fg-secondary);font-size:.9rem">Nenhuma foto marcada para o carrossel ainda.</div>';
    return;
  }

  var lista=GALERIA_FOTOS.concat(GALERIA_FOTOS).concat(GALERIA_FOTOS);

  lista.forEach(function(foto,i){
    var item=document.createElement('div');
    item.className='mare-item glass';
    item.dataset.idx=i%GALERIA_FOTOS.length;

    var isVid=(foto.tipo==='video'||foto.tipo==='video_yt'||foto.tipo==='video_up');
    var thumbUrl=isVid?(foto.tipo==='video_up'?(foto.url_thumb||foto.url):ytThumb(foto.video_url)):(foto.url_thumb||foto.url);

    var html='<img src="'+thumbUrl+'" alt="'+(foto.titulo||'')+'" loading="lazy">';
    if(isVid)html+='<div class="mare-play">▶</div>';
    html+='<div class="mare-overlay"><span class="mare-label">'+(foto.titulo||'')+'</span></div>';

    item.innerHTML=html;
    item.addEventListener('click',function(){
      abrirLightbox(parseInt(this.dataset.idx));
    });

    track.appendChild(item);
  });

  if(mareAnimId)cancelAnimationFrame(mareAnimId);

  function loop(){
    if(!mareDragging){
      mareOffset-=mareSpeed;
      var firstItem=track.children[0];
      if(firstItem){
        var itemW=firstItem.offsetWidth+14;
        var totalW=itemW*GALERIA_FOTOS.length;
        if(Math.abs(mareOffset)>=totalW)mareOffset+=totalW;
      }
      track.style.transform='translateX('+mareOffset+'px)';
    }
    mareAnimId=requestAnimationFrame(loop);
  }

  loop();
}

function setupMareDrag(){
  var wrap=$('#mareWrap');
  var track=$('#mareTrack');
  if(!wrap||!track)return;

  function start(x){mareDragging=true;mareStartX=x;}
  function move(x){if(!mareDragging)return;var dx=x-mareStartX;mareOffset+=dx;mareStartX=x;track.style.transform='translateX('+mareOffset+'px)';}
  function end(){mareDragging=false;}

  wrap.addEventListener('mousedown',function(e){start(e.pageX)});
  wrap.addEventListener('mousemove',function(e){move(e.pageX)});
  wrap.addEventListener('mouseup',end);
  wrap.addEventListener('mouseleave',end);
  wrap.addEventListener('touchstart',function(e){start(e.touches[0].pageX)},{passive:true});
  wrap.addEventListener('touchmove',function(e){move(e.touches[0].pageX)},{passive:true});
  wrap.addEventListener('touchend',end);
}

var lbLista=[];
var lbIdx=0;

function abrirLightbox(idx){
  lbLista=GALERIA_FOTOS;
  lbIdx=idx;
  atualizarLightbox();
  $('#lightboxGal').classList.add('open');
  document.body.style.overflow='hidden';
}

function closeLightbox(){
  $('#lightboxGal').classList.remove('open');
  document.body.style.overflow='';
  limparLightboxMedia();
}

function navegarLightbox(dir){
  limparLightboxMedia();
  lbIdx=(lbIdx+dir+lbLista.length)%lbLista.length;
  atualizarLightbox();
}

function limparLightboxMedia(){
  var img=$('#lbImg');
  var videoWrap=$('#lbVideoWrap');
  img.style.display='none';
  img.src='';
  videoWrap.style.display='none';
  videoWrap.innerHTML='';
}

function atualizarLightbox(){
  var f=lbLista[lbIdx];
  var img=$('#lbImg');
  var videoWrap=$('#lbVideoWrap');
  var caption=$('#lbCaption');

  var isYt=(f.tipo==='video'||f.tipo==='video_yt')&&f.video_url;
  var isUp=(f.tipo==='video_up')&&f.url;

  if(isYt){
    img.style.display='none';
    videoWrap.style.display='flex';
    var videoId=ytId(f.video_url);
    if(videoId){
      var iframe=document.createElement('iframe');
      iframe.className='lb-video-yt';
      iframe.src='https://www.youtube-nocookie.com/embed/'+videoId+'?autoplay=0&rel=0';
      iframe.allow='accelerometer;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share';
      iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
      iframe.setAttribute('allowfullscreen','true');
      var fallbackTimer=setTimeout(function(){iframe.remove();showVideoFallback(videoWrap,f,videoId);},8000);
      iframe.addEventListener('load',function(){clearTimeout(fallbackTimer)});
      iframe.addEventListener('error',function(){clearTimeout(fallbackTimer);iframe.remove();showVideoFallback(videoWrap,f,videoId);});
      videoWrap.appendChild(iframe);
    }else{
      showVideoFallback(videoWrap,f,'');
    }
  }else if(isUp){
    img.style.display='none';
    videoWrap.style.display='flex';
    var video=document.createElement('video');
    video.controls=true;video.autoplay=false;video.playsInline=true;video.src=f.url;
    video.style.cssText='max-width:100%;max-height:80vh;border-radius:12px';
    videoWrap.appendChild(video);
  }else{
    videoWrap.style.display='none';
    img.style.display='block';
    img.src=f.url||f.url_thumb;
  }
  caption.textContent=(f.titulo||'');
}

function showVideoFallback(container,foto,videoId){
  var thumbSrc=videoId?'https://img.youtube.com/vi/'+videoId+'/hqdefault.jpg':'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600';
  var ytLink=videoId?'https://www.youtube.com/watch?v='+videoId:foto.video_url;
  container.innerHTML='<div class="lb-fallback"><img src="'+thumbSrc+'" alt="'+(foto.titulo||'')+'"><p>Este vídeo não permite reprodução incorporada</p><a href="'+ytLink+'" target="_blank" rel="noopener">▶ Assistir no YouTube</a></div>';
}

(function(){
  var startX=0;
  document.addEventListener('touchstart',function(e){
    if($('#lightboxGal').classList.contains('open'))startX=e.touches[0].clientX;
  },{passive:true});
  document.addEventListener('touchend',function(e){
    if(!$('#lightboxGal').classList.contains('open'))return;
    var dx=e.changedTouches[0].clientX-startX;
    if(Math.abs(dx)>50)navegarLightbox(dx<0?1:-1);
  });
})();

document.addEventListener('keydown',function(e){
  if(!$('#lightboxGal').classList.contains('open'))return;
  if(e.key==='Escape')closeLightbox();
  if(e.key==='ArrowLeft')navegarLightbox(-1);
  if(e.key==='ArrowRight')navegarLightbox(1);
});

$('#lightboxGal').addEventListener('click',function(e){
  if(e.target.id==='lightboxGal')closeLightbox();
});

var totalRows=0;

async function loadAll(){
  $('#dDb').textContent='...';$('#dDb').className='y';

  /* Visual central (CORE) em paralelo */
  var visualP = (CORE && CORE.applyVisualForPage)
    ? CORE.applyVisualForPage('home').then(function(cfg){
        applyIndexVisualSideEffects(cfg);

        /* compat: se vier contatos no JSONB, aplica (core.js já carrega, mas não custa) */
        if(cfg && cfg.contatos){
          var ct = cfg.contatos;
          C.contatos.whatsapp = ct.whatsapp || C.fallback.whatsapp;
          C.contatos.instagram = ct.instagram || C.fallback.instagram;
          C.contatos.email = ct.email || C.fallback.email;
          CORE.applyContatosToDom();
        }
        return cfg;
      }).catch(function(){
        return null;
      })
    : Promise.resolve(null);

  var cachedSec=cacheGet(CACHE_SECOES);
  var cachedSrv=cacheGet(CACHE_SERVICOS);
  var cachedPkg=cacheGet(CACHE_PACOTES);
  var cachedDep=cacheGet(CACHE_DEPOIMENTOS);
  var cachedFaq=cacheGet(CACHE_FAQ);
  var cachedGal=cacheGet(CACHE_GALERIA);

  renderSecoes(cachedSec||[]);
  renderServicos(cachedSrv||FB_SRV);
  renderPacotes(cachedPkg||FB_PKG);
  renderDepoimentos(cachedDep||[]);
  renderFaq(cachedFaq||[]);
  GALERIA_FOTOS=cachedGal||FB_GALERIA;
  buildMare();

  buildStrip(null);
  rCards();

  try{
    var res=await Promise.all([
      sbGet('co_secoes','select=*&order=ordem'),
      sbGet('co_calculadora_valores','select=*&order=ordem'),
      sbGet('co_calc_pacotes','select=*&order=ordem'),
      sbGet('co_depoimentos','select=*&order=ordem'),
      sbGet('co_faq','select=*&order=ordem'),
      sbGet('co_galeria_fotos','select=*&destaque=eq.1&order=ordem&limit=12'),
      visualP
    ]);

    var ok=res.slice(0,6).every(function(r){return r!==null});
    $('#dDb').textContent=ok?'OK':'CACHE';
    $('#dDb').className=ok?'g':'y';

    if(ok){
      if(res[0])cacheSet(CACHE_SECOES,res[0]);
      if(res[1])cacheSet(CACHE_SERVICOS,res[1]);
      if(res[2])cacheSet(CACHE_PACOTES,res[2]);
      if(res[3])cacheSet(CACHE_DEPOIMENTOS,res[3]);
      if(res[4])cacheSet(CACHE_FAQ,res[4]);
      if(res[5])cacheSet(CACHE_GALERIA,res[5]);

      renderSecoes(res[0]||[]);
      renderServicos(res[1]||FB_SRV);
      renderPacotes(res[2]||FB_PKG);
      renderDepoimentos(res[3]||[]);
      renderFaq(res[4]||[]);
      GALERIA_FOTOS=res[5]||FB_GALERIA;
      buildMare();

      /* FIX 3: passa dados da strip para buildStrip */
      var stripSec=null;
      if(res[0]){res[0].forEach(function(s){if(s.tipo==='strip')stripSec=s;});}
      buildStrip(stripSec);

      totalRows=(res[0]||[]).length+(res[1]||[]).length+(res[2]||[]).length+(res[3]||[]).length+(res[4]||[]).length;
      $('#dBond').textContent=totalRows;
    }

    rCards();

    $$('.fade-in:not(.visible)').forEach(function(el){fadeObs.observe(el);});

  }catch(e){
    console.error('[loadAll]',e);
    $('#dDb').textContent='ERRO';
    $('#dDb').className='r';
  }
}

/* FIX 4, 5, 7, 10: renderSecoes agora lê itens/capsulas do banco com fallback */
function renderSecoes(secs){
  var secMap={};
  secs.forEach(function(s){secMap[s.tipo]=s;});

  if(secMap.hero){$('#heroTitle').textContent=secMap.hero.titulo||'';$('#heroSub').textContent=secMap.hero.subtitulo||'';}
  if(secMap.dor){$('#dorTitle').textContent=secMap.dor.titulo||'';$('#dorSub').textContent=secMap.dor.subtitulo||'';}
  if(secMap.como){$('#comoTitle').textContent=secMap.como.titulo||'';$('#comoSub').textContent=secMap.como.subtitulo||'';}
  if(secMap.servicos){$('#srvTitle').textContent=secMap.servicos.titulo||'';$('#srvSub').textContent=secMap.servicos.subtitulo||'';}
  if(secMap.numeros){$('#numTitle').textContent=secMap.numeros.titulo||'';$('#numSub').textContent=secMap.numeros.subtitulo||'';}
  if(secMap.galeria){$('#galTitle').textContent=secMap.galeria.titulo||'';$('#galSub').textContent=secMap.galeria.subtitulo||'';}
  if(secMap.pacotes){$('#pkgTitle').textContent=secMap.pacotes.titulo||'';$('#pkgSub').textContent=secMap.pacotes.subtitulo||'';}
  if(secMap.depoimentos){$('#depTitle').textContent=secMap.depoimentos.titulo||'';$('#depSub').textContent=secMap.depoimentos.subtitulo||'';}
  if(secMap.faq){$('#faqTitle').textContent=secMap.faq.titulo||'';$('#faqSub').textContent=secMap.faq.subtitulo||'';}
  if(secMap.contato){$('#ctTitle').textContent=secMap.contato.titulo||'';$('#ctSub').textContent=secMap.contato.subtitulo||'';}

  /* FIX 4: Dor — lê itens do banco, fallback FB_DOR */
  var dorItens=FB_DOR;
  if(secMap.dor&&secMap.dor.itens){
    try{
      var parsed=typeof secMap.dor.itens==='string'?JSON.parse(secMap.dor.itens):secMap.dor.itens;
      if(Array.isArray(parsed)&&parsed.length>0)dorItens=parsed;
    }catch(e){}
  }
  var dorH='';
  dorItens.forEach(function(d){dorH+='<div class="card glass fade-in"><h3>'+(d.t||d.titulo||'')+'</h3><p>'+(d.p||d.texto||'')+'</p></div>';});
  $('#dorGrid').innerHTML=dorH;

  /* FIX 5: Como Funciona — lê itens do banco, fallback FB_COMO */
  var comoItens=FB_COMO;
  if(secMap.como&&secMap.como.itens){
    try{
      var parsedC=typeof secMap.como.itens==='string'?JSON.parse(secMap.como.itens):secMap.como.itens;
      if(Array.isArray(parsedC)&&parsedC.length>0)comoItens=parsedC;
    }catch(e){}
  }
  var comoH='';
  comoItens.forEach(function(c,i){comoH+='<div class="badge glass fade-in"><span class="num">'+(c.n||(i+1))+'</span><span>'+(c.t||c.titulo||'')+'</span></div>';});
  $('#comoGrid').innerHTML=comoH;

  /* FIX 7: Números — lê itens do banco, fallback FB_NUM */
  var numItens=FB_NUM;
  if(secMap.numeros&&secMap.numeros.itens){
    try{
      var parsedN=typeof secMap.numeros.itens==='string'?JSON.parse(secMap.numeros.itens):secMap.numeros.itens;
      if(Array.isArray(parsedN)&&parsedN.length>0)numItens=parsedN;
    }catch(e){}
  }
  var numH='';
  numItens.forEach(function(n){
    var valor=n.v||n.valor||0;
    var sufixo=n.s||n.sufixo||'';
    var label=n.l||n.label||'';
    if(sufixo==='∞'){numH+='<div class="num-card glass fade-in"><div class="num-val" style="font-size:2.4rem">∞</div><div class="num-label">'+label+'</div></div>';}
    else{numH+='<div class="num-card glass fade-in"><div class="num-val" data-target="'+valor+'" data-suffix="'+(sufixo||'')+'">0</div><div class="num-label">'+label+'</div></div>';}
  });
  $('#numGrid').innerHTML=numH;

  /* FIX 10: Contato cápsulas — lê do banco, mantém HTML original se não houver */
  if(secMap.contato&&secMap.contato.capsulas){
    try{
      var parsedCaps=typeof secMap.contato.capsulas==='string'?JSON.parse(secMap.contato.capsulas):secMap.contato.capsulas;
      if(Array.isArray(parsedCaps)&&parsedCaps.length>0){
        var benefitsEl=document.querySelector('#secContato .benefits');
        if(benefitsEl){
          var capsH='';
          parsedCaps.forEach(function(cap){capsH+='<span class="benefit-tag">'+(cap.texto||cap)+'</span>';});
          benefitsEl.innerHTML=capsH;
        }
      }
    }catch(e){}
  }
}

/* FIX 6: renderServicos usa nome_exibicao com fallback pra nome */
function renderServicos(srvs){
  var srvH='';
  srvs.forEach(function(s){
    if(s.ativo===false)return;
    var nome=s.nome_exibicao||s.nome||'';
    var icone=s.icone||'';
    var desc=s.descricao||'';
    srvH+='<div class="card glass fade-in"><h3>'+icone+' '+nome+'</h3><p>'+desc+'</p></div>';
  });
  $('#servicosGrid').innerHTML=srvH;
}

/* FIX 9: renderPacotes filtra ativo e destaque só pelo campo destaque */
function renderPacotes(pkgs){
  var pkgH='';
  pkgs.forEach(function(p){
    if(p.ativo===false)return;
    var items='';
    var itensArr=p.itens||[];
    if(typeof itensArr==='string'){try{itensArr=JSON.parse(itensArr)}catch(e){itensArr=[]}}
    itensArr.forEach(function(it){items+='<li>'+it+'</li>'});
    var featured=!!p.destaque;
    var saving=p.preco_original?Math.round((1-p.preco_pacote/p.preco_original)*100):0;
    pkgH+='<div class="pkg glass fade-in'+(featured?' featured':'')+'">';
    if(featured)pkgH+='<span class="pkg-badge">Mais popular</span>';
    pkgH+='<h3>'+p.nome+'</h3>';
    if(p.preco_original)pkgH+='<div class="price-original">De R$ '+p.preco_original.toLocaleString('pt-BR')+'</div>';
    pkgH+='<div class="price">R$ '+p.preco_pacote.toLocaleString('pt-BR')+'</div>';
    if(saving>0)pkgH+='<div class="saving">Economia de '+saving+'%</div>';
    if(p.horas_inclusas)pkgH+='<div class="pkg-hours">'+p.horas_inclusas+'h inclusas</div>';
    if(p.ideal_para)pkgH+='<div class="pkg-ideal">'+p.ideal_para+'</div>';
    pkgH+='<ul>'+items+'</ul>';
    pkgH+='<button class="pkg-btn" onclick="openCalcPkg(\''+p.nome+'\')">Selecionar '+p.nome+'</button>';
    pkgH+='</div>';
  });
  $('#pkgGrid').innerHTML=pkgH;
}

function renderDepoimentos(deps){
  var depH='';
  deps.forEach(function(d){
    if(d.ativo===false)return;
    var stars='';for(var i=0;i<(d.nota||5);i++)stars+='★';
    depH+='<div class="test glass fade-in"><div class="stars">'+stars+'</div><p>"'+d.texto+'"</p><div class="author">'+d.nome+'</div><div class="role">'+d.cargo+'</div></div>';
  });
  $('#depGrid').innerHTML=depH;
}

function renderFaq(faqs){
  var faqH='';
  faqs.forEach(function(f){
    if(f.ativo===false)return;
    faqH+='<div class="faq-item glass fade-in"><button class="faq-q" onclick="this.parentElement.classList.toggle(\'open\')">'+f.pergunta+'</button><div class="faq-a">'+f.resposta+'</div></div>';
  });
  $('#faqList').innerHTML=faqH;
}

/* ========== FIM DA PARTE 1/2 ========== */
/* ====== PRÉ-CARREGAMENTO DO IFRAME ====== */
var calcPreloaded=false;

function preloadCalc(){
  var frame=$('#calcFrame');
  if(!frame||calcPreloaded)return;
  frame.src='calculadora.html?embed=1';
  calcPreloaded=true;
  console.log('[432UP] Calculadora pré-carregada');
}

setTimeout(preloadCalc,3000);

/* ====== CALC OVERLAY ====== */
function openCalc(){
  var frame=$('#calcFrame');
  $('#calcOverlay').classList.add('open');
  document.body.style.overflow='hidden';
  //showCalcFab(0,0);
  if(!calcPreloaded||frame.src.indexOf('calculadora.html')<0){
    frame.src='calculadora.html?embed=1';
    calcPreloaded=true;
  }
}

function openCalcPkg(pkg){
  var frame=$('#calcFrame');
  $('#calcOverlay').classList.add('open');
  document.body.style.overflow='hidden';
  //showCalcFab(0,0);
  if(calcPreloaded&&frame.src.indexOf('calculadora.html')>=0){
    frame.contentWindow.postMessage({type:'432up-select-pkg',pkg:pkg},'*');
  }else{
    frame.src='calculadora.html?embed=1&pacote='+encodeURIComponent(pkg);
    calcPreloaded=true;
  }
}

function closeCalc(){
  $('#calcOverlay').classList.remove('open');
  document.body.style.overflow='';
  //hideCalcFab();
  if(!calcPreloaded){$('#calcFrame').src='about:blank';}
}


/* ====== CÁPSULA FLUTUANTE DO OVERLAY ====== */
// function createCalcFab(){
//   if($('#calcFab'))return;
//   var fab=document.createElement('div');
//   fab.id='calcFab';
//   fab.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);z-index:10001;background:var(--bg-card,#12121e);border:1.5px solid var(--border-subtle,rgba(255,255,255,.08));border-radius:24px;padding:8px 20px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 4px 20px rgba(0,0,0,.3);display:flex;align-items:center;gap:10px;opacity:0;transition:all .4s cubic-bezier(.4,0,.2,1);pointer-events:none';
//   fab.innerHTML='<span style="font-size:.75rem;color:var(--fg-secondary,#9a9ab0);text-transform:uppercase;letter-spacing:.5px">TOTAL</span><span id="calcFabVal" style="font-size:1.1rem;font-weight:700;color:var(--accent,#8b5cf6)">R$ 0</span><span id="calcFabEco" style="font-size:.7rem;color:var(--green,#22c55e);font-weight:500"></span>';
//   document.body.appendChild(fab);
// }

// function showCalcFab(total,eco){
//   createCalcFab();
//   var fab=$('#calcFab');
//   if(!fab)return;
//   if(total>0){
//     $('#calcFabVal').textContent='R$ '+Number(total).toLocaleString('pt-BR');
//     $('#calcFabEco').textContent=eco>0?'-R$ '+Number(eco).toLocaleString('pt-BR'):'';
//     fab.style.opacity='1';fab.style.transform='translateX(-50%) translateY(0)';fab.style.pointerEvents='auto';
//   }else{
//     fab.style.opacity='0';fab.style.transform='translateX(-50%) translateY(20px)';fab.style.pointerEvents='none';
//   }
// }

// function hideCalcFab(){
//   var fab=$('#calcFab');
//   if(!fab)return;
//   fab.style.opacity='0';fab.style.transform='translateX(-50%) translateY(20px)';fab.style.pointerEvents='none';
// }



/* ====== MODAL DE E-MAIL CENTRALIZADO NO INDEX ====== */
var calcEmailData=null;

function showCalcEmailModal(data){
  calcEmailData=data;
  var old=$('#indexEmailOverlay');
  if(old)old.remove();
  var isLight=document.documentElement.dataset.theme==='light';
  var bg=isLight?'rgba(255,255,255,.92)':'rgba(18,18,30,.92)';
  var fg=isLight?'#1a1a1e':'#e8e8ed';
  var fg2=isLight?'#6b6b7b':'#9a9ab0';
  var border=isLight?'rgba(0,0,0,.08)':'rgba(255,255,255,.1)';
  var inputBg=isLight?'#fafaf9':'#0a0a12';
  var accent='#8b5cf6';
  var overlay=document.createElement('div');
  overlay.id='indexEmailOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:10005;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML='<div style="background:'+bg+';border:1.5px solid '+border+';border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.4);position:relative;color:'+fg+'">'
    +'<button id="iemClose" style="position:absolute;top:12px;right:14px;background:none;border:none;color:'+fg2+';font-size:1.3rem;cursor:pointer;padding:4px 8px;line-height:1">✕</button>'
    +'<h3 style="font-size:1.05rem;font-weight:600;margin-bottom:6px">Receber orçamento por e-mail</h3>'
    +'<p style="font-size:.82rem;color:'+fg2+';margin-bottom:18px">Preencha seus dados e enviaremos o resumo.</p>'
    +'<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:14px"><label style="font-size:.8rem;color:'+fg2+';font-weight:500">Nome *</label><input id="iemName" style="background:'+inputBg+';border:1.5px solid '+border+';border-radius:10px;padding:12px 14px;color:'+fg+';font-family:Inter,system-ui,sans-serif;font-size:.9rem;outline:none;width:100%" placeholder="Seu nome"></div>'
    +'<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:14px"><label style="font-size:.8rem;color:'+fg2+';font-weight:500">WhatsApp *</label><input id="iemPhone" style="background:'+inputBg+';border:1.5px solid '+border+';border-radius:10px;padding:12px 14px;color:'+fg+';font-family:Inter,system-ui,sans-serif;font-size:.9rem;outline:none;width:100%" placeholder="(11) 99999-9999"></div>'
    +'<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:14px"><label style="font-size:.8rem;color:'+fg2+';font-weight:500">E-mail *</label><input id="iemEmail" style="background:'+inputBg+';border:1.5px solid '+border+';border-radius:10px;padding:12px 14px;color:'+fg+';font-family:Inter,system-ui,sans-serif;font-size:.9rem;outline:none;width:100%" placeholder="seu@email.com" type="email"></div>'
    +'<div style="display:flex;gap:10px;margin-top:18px"><button id="iemCancel" style="flex:1;padding:12px;border-radius:10px;font-family:Inter,system-ui,sans-serif;font-size:.9rem;font-weight:600;cursor:pointer;background:transparent;color:'+fg2+';border:1.5px solid '+border+'">Cancelar</button><button id="iemSend" style="flex:1;padding:12px;border-radius:10px;font-family:Inter,system-ui,sans-serif;font-size:.9rem;font-weight:600;cursor:pointer;background:'+accent+';color:#fff;border:none">Enviar</button></div>'
    +'</div>';
  document.body.appendChild(overlay);
  var phoneEl=$('#iemPhone');
  if(phoneEl){phoneEl.addEventListener('input',function(){var v=phoneEl.value.replace(/\D/g,'').slice(0,11);if(v.length>6)v='('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);else if(v.length>2)v='('+v.slice(0,2)+') '+v.slice(2);phoneEl.value=v;});}
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeCalcEmailModal()});
  $('#iemClose').addEventListener('click',closeCalcEmailModal);
  $('#iemCancel').addEventListener('click',closeCalcEmailModal);
  $('#iemSend').addEventListener('click',submitCalcEmail);
}

function closeCalcEmailModal(){var o=$('#indexEmailOverlay');if(o)o.remove();}

function submitCalcEmail(){
  var nome=$('#iemName').value.trim();
  var phone=$('#iemPhone').value.trim();
  var email=$('#iemEmail').value.trim();
  var ok=true;
  ['iemName','iemPhone','iemEmail'].forEach(function(id){$('#'+id).style.borderColor='';});
  if(!nome){$('#iemName').style.borderColor='#ef4444';ok=false}
  if(!phone||phone.replace(/\D/g,'').length<10){$('#iemPhone').style.borderColor='#ef4444';ok=false}
  if(!email||email.indexOf('@')<1){$('#iemEmail').style.borderColor='#ef4444';ok=false}
  if(!ok){CORE.toast('Preencha nome, WhatsApp e e-mail.');return}
  var lead={nome:nome,whatsapp:phone,email:email,tipo_evento:(calcEmailData&&calcEmailData.tipo)||null,data_evento:(calcEmailData&&calcEmailData.dt)||null,local:(calcEmailData&&calcEmailData.local)||null,convidados:(calcEmailData&&calcEmailData.guests)||null,horas:(calcEmailData&&calcEmailData.hours)||null,total:(calcEmailData&&calcEmailData.total)||null,pacote:(calcEmailData&&calcEmailData.activePkg)||null,origem:'email_calculadora_overlay',mensagem:(calcEmailData&&calcEmailData.msg)||'Orçamento por e-mail',created_at:new Date().toISOString()};
  sbPost('co_leads',lead);
  var subject='Orçamento 432UP';
  if(calcEmailData&&calcEmailData.tipo)subject+=' - '+calcEmailData.tipo;
  var body=(calcEmailData&&calcEmailData.msg||'').replace(/\*/g,'').replace(/━/g,'-');
  body+='\n\nNome: '+nome+'\nWhatsApp: '+phone+'\nE-mail: '+email;
  var mailto='mailto:contato@432up.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  closeCalcEmailModal();
  window.location.href=mailto;
  var waUrl='https://wa.me/'+C.contatos.whatsapp+'?text='+encodeURIComponent((calcEmailData&&calcEmailData.msg)||'');
  setTimeout(function(){showCentralConfirm('Orçamento enviado com sucesso!','Deseja também falar no WhatsApp?','Sim, abrir WhatsApp','Não, obrigado',function(){window.open(waUrl,'_blank');});},800);
}

/* ====== CONFIRMAÇÃO CENTRALIZADA GLASS ====== */
function showCentralConfirm(title,subtitle,btnYes,btnNo,onYes){
  var old=$('#centralConfirm');if(old)old.remove();
  var isLight=document.documentElement.dataset.theme==='light';
  var bg=isLight?'rgba(255,255,255,.92)':'rgba(18,18,30,.92)';
  var fg=isLight?'#1a1a1e':'#e8e8ed';
  var fg2=isLight?'#6b6b7b':'#9a9ab0';
  var border=isLight?'rgba(0,0,0,.08)':'rgba(255,255,255,.1)';
  var wrap=document.createElement('div');
  wrap.id='centralConfirm';
  wrap.style.cssText='position:fixed;inset:0;z-index:10005;background:rgba(0,0,0,.4);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  wrap.innerHTML='<div style="background:'+bg+';border:1.5px solid '+border+';border-radius:16px;padding:24px 28px;max-width:380px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.3);text-align:center;color:'+fg+'">'
    +'<div style="font-size:1.05rem;font-weight:600;margin-bottom:8px">'+title+'</div>'
    +'<div style="font-size:.85rem;color:'+fg2+';margin-bottom:20px">'+subtitle+'</div>'
    +'<div style="display:flex;gap:10px;justify-content:center">'
    +'<button id="ccYes" style="padding:10px 20px;background:#8b5cf6;color:#fff;border:none;border-radius:10px;font-size:.9rem;font-weight:600;cursor:pointer;font-family:Inter,system-ui,sans-serif">'+btnYes+'</button>'
    +'<button id="ccNo" style="padding:10px 20px;background:transparent;color:'+fg2+';border:1px solid '+border+';border-radius:10px;font-size:.9rem;cursor:pointer;font-family:Inter,system-ui,sans-serif">'+btnNo+'</button>'
    +'</div></div>';
  document.body.appendChild(wrap);
  wrap.addEventListener('click',function(e){if(e.target===wrap){wrap.remove()}});
  $('#ccNo').addEventListener('click',function(){wrap.remove()});
  $('#ccYes').addEventListener('click',function(){wrap.remove();if(onYes)onYes()});
  setTimeout(function(){if(wrap.parentNode)wrap.remove()},15000);
}

/* ====== postMessage listener ====== */

window.addEventListener('message',function(e){
  var d=e.data;
  if(!d||!d.type)return;
  //if(d.type==='432up-calc-total'){var overlay=$('#calcOverlay');if(overlay&&overlay.classList.contains('open')){showCalcFab(d.total,d.eco);}}
  if(d.type==='432up-save-lead'&&d.lead){sbPost('co_leads',d.lead).then(function(ok){if(ok)CORE.toast('Lead salvo!');else CORE.toast('Erro ao salvar lead');});}
  if(d.type==='432up-toast'&&d.msg){CORE.toast(d.msg);}
  if(d.type==='432up-open-wa'&&d.url){window.open(d.url,'_blank');}
  if(d.type==='432up-open-mailto'&&d.url){window.location.href=d.url;}
  if(d.type==='432up-open-email-modal'&&d.data){showCalcEmailModal(d.data);}
  if(d.type==='432up-post-email-wa'&&d.waUrl){setTimeout(function(){showCentralConfirm('Orçamento enviado!','Deseja também falar no WhatsApp?','Sim, abrir WhatsApp','Não, obrigado',function(){window.open(d.waUrl,'_blank');});},500);}

  /* ====== 432up-pdf-download — Safari/iOS base64 fix v3.10.2 ====== */
  if(d.type==='432up-pdf-download'&&(d.base64||d.url)&&d.filename){

    /* Guarda tudo antes de qualquer ação assíncrona */
    var _pdfBase64   = d.base64 || null;
    var _pdfURL      = d.url    || null;
    var _pdfFilename = d.filename;
    var _pdfWaURL    = d.waURL  || null;

    /* Garante CSS de animação uma única vez */
    if(!document.getElementById('_pdfModalCSS')){
      var _s=document.createElement('style');
      _s.id='_pdfModalCSS';
      _s.textContent=[
        '@keyframes _pmIn{',
          'from{opacity:0;transform:scale(.86) translateY(24px)}',
          'to{opacity:1;transform:scale(1) translateY(0)}}',
        '@keyframes _pmIcon{',
          'from{transform:scale(0)}',
          'to{transform:scale(1)}}',
        '#_pdfModal .pm-btn-save:hover,',
        '#_pdfModal .pm-btn-wa:hover{opacity:.88;transform:translateY(-1px);}',
        '#_pdfModal .pm-btn-no:hover{background:rgba(255,255,255,.12);}'
      ].join('');
      document.head.appendChild(_s);
    }

    /* Cria o modal se ainda não existir */
    if(!document.getElementById('_pdfModal')){
      var _m=document.createElement('div');
      _m.id='_pdfModal';
      _m.setAttribute('role','dialog');
      _m.setAttribute('aria-modal','true');
      _m.style.cssText=[
        'display:none;position:fixed;inset:0;z-index:999999;',
        'align-items:center;justify-content:center;',
        'background:rgba(0,0,0,.60);',
        'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
        'padding:20px;box-sizing:border-box;'
      ].join('');
      _m.innerHTML=
        '<div class="pm-box" style="'+
          'background:rgba(28,10,60,.82);'+
          'backdrop-filter:blur(36px) saturate(180%);'+
          '-webkit-backdrop-filter:blur(36px) saturate(180%);'+
          'border:1px solid rgba(170,255,0,.18);'+
          'border-radius:24px;'+
          'box-shadow:0 8px 48px rgba(0,0,0,.7),0 1px 0 rgba(170,255,0,.08) inset;'+
          'padding:44px 38px 36px;text-align:center;'+
          'max-width:420px;width:100%;position:relative;'+
          'animation:_pmIn .38s cubic-bezier(.34,1.56,.64,1) both;">'+
          '<button id="_pmClose" style="'+
            'position:absolute;top:14px;right:16px;'+
            'background:rgba(255,255,255,.08);border:none;border-radius:50%;'+
            'width:32px;height:32px;color:rgba(255,255,255,.5);'+
            'font-size:18px;cursor:pointer;display:flex;'+
            'align-items:center;justify-content:center;line-height:1;">×</button>'+
          '<div style="'+
            'font-size:54px;margin-bottom:14px;'+
            'filter:drop-shadow(0 4px 16px rgba(170,255,0,.35));'+
            'animation:_pmIcon .6s .25s cubic-bezier(.34,1.56,.64,1) both;">📄</div>'+
          '<h3 style="font-size:1.4rem;font-weight:800;color:#fff;'+
            'margin:0 0 10px;font-family:Inter,sans-serif;">Orçamento pronto!</h3>'+
          '<p style="color:rgba(255,255,255,.6);font-size:.9rem;'+
            'line-height:1.65;margin:0 0 28px;font-family:Inter,sans-serif;">'+
            'Salve o PDF ou envie direto<br>no WhatsApp com todos os detalhes.</p>'+
          '<button id="_pmSave" class="pm-btn-save" style="'+
            'display:flex;align-items:center;justify-content:center;gap:10px;'+
            'width:100%;padding:14px 20px;margin-bottom:12px;'+
            'background:linear-gradient(135deg,#AAFF00,#7ECB00);'+
            'border:none;border-radius:14px;'+
            'color:#0D0D1A;font-size:1rem;font-weight:800;'+
            'cursor:pointer;transition:opacity .2s,transform .15s;'+
            'font-family:Inter,sans-serif;">⬇️ Salvar PDF</button>'+
          '<button id="_pmWA" class="pm-btn-wa" style="'+
            'display:flex;align-items:center;justify-content:center;gap:10px;'+
            'width:100%;padding:14px 20px;margin-bottom:12px;'+
            'background:linear-gradient(135deg,#7B2FBE,#E91E8C);'+
            'border:none;border-radius:14px;'+
            'color:#fff;font-size:1rem;font-weight:700;'+
            'cursor:pointer;transition:opacity .2s,transform .15s;'+
            'font-family:Inter,sans-serif;">💬 Enviar no WhatsApp</button>'+
          '<button id="_pmNo" class="pm-btn-no" style="'+
            'display:block;width:100%;padding:11px;'+
            'background:rgba(255,255,255,.06);'+
            'border:1px solid rgba(255,255,255,.1);border-radius:12px;'+
            'color:rgba(255,255,255,.4);font-size:.88rem;'+
            'cursor:pointer;transition:background .2s;'+
            'font-family:Inter,sans-serif;">Agora não, obrigado</button>'+
          '<div style="margin-top:18px;font-size:.72rem;'+
            'color:rgba(255,255,255,.25);font-family:Inter,sans-serif;">'+
            'Resposta em até 2h · Sem compromisso</div>'+
        '</div>';
      _m.addEventListener('click',function(ev){
        if(ev.target===_m)_fecharPdfModal();
      });
      document.body.appendChild(_m);
    }

    /* Controle do modal */
    function _fecharPdfModal(){
      var m=document.getElementById('_pdfModal');
      if(!m)return;
      m.style.display='none';
      document.body.style.overflow='';
    }

    function _abrirPdfModal(){
      var m=document.getElementById('_pdfModal');
      if(!m)return;
      m.style.display='flex';
      document.body.style.overflow='hidden';
    }

    /* Recadastra listeners via cloneNode — evita duplicatas */
    function _rebind(id,fn){
      var el=document.getElementById(id);
      if(!el)return;
      var novo=el.cloneNode(true);
      el.parentNode.replaceChild(novo,el);
      novo.addEventListener('click',fn);
    }

    _rebind('_pmClose',_fecharPdfModal);
    _rebind('_pmNo',_fecharPdfModal);

    /* Salvar PDF — reconstrói blob no contexto pai (corrige WebKitBlobResource erro 1) */
    _rebind('_pmSave',function(){
      var source=_pdfBase64||_pdfURL;
      if(!source)return;
      try{
        if(source.indexOf('base64,')>-1){
          /* base64 → Blob no contexto do pai → download */
          var b64=source.split('base64,')[1];
          var binary=atob(b64);
          var bytes=new Uint8Array(binary.length);
          for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
          var blob=new Blob([bytes],{type:'application/pdf'});
          var blobURL=URL.createObjectURL(blob);
          var a=document.createElement('a');
          a.href=blobURL;
          a.download=_pdfFilename||'PreOrcamento_432UP.pdf';
          a.style.display='none';
          document.body.appendChild(a);
          a.click();
          setTimeout(function(){
            document.body.removeChild(a);
            URL.revokeObjectURL(blobURL);
          },2000);
        }else{
          /* fallback: blob URL legado */
          var a2=document.createElement('a');
          a2.href=source;
          a2.download=_pdfFilename||'PreOrcamento_432UP.pdf';
          a2.style.display='none';
          document.body.appendChild(a2);
          a2.click();
          setTimeout(function(){document.body.removeChild(a2);},1000);
        }
      }catch(err){
        console.error('[432UP PDF] Erro ao salvar:',err);
        window.open(source,'_blank');
      }
      /* NÃO fecha — usuário ainda pode clicar no WhatsApp */
    });

    _rebind('_pmWA',function(){
      if(_pdfWaURL)window.open(_pdfWaURL,'_blank');
      _fecharPdfModal();
    });

    /* ESC fecha — listener auto-removível */
    function _escHandler(ev){
      if(ev.key==='Escape'){_fecharPdfModal();document.removeEventListener('keydown',_escHandler);}
    }
    document.addEventListener('keydown',_escHandler);

    /* Fecha o overlay da calc DEPOIS de salvar os dados,
       abre o modal após a animação de saída terminar     */
    closeCalc();
    setTimeout(_abrirPdfModal,320);
  }
  /* ====== fim 432up-pdf-download ====== */

});




/* ====== LEAD FORM ====== */
function sendLead(){
  var nome=$('#fNome').value.trim();
  var wa=$('#fWa').value.trim();
  if(!nome){CORE.toast('Preencha seu nome');return;}
  if(!wa||wa.replace(/\D/g,'').length<10){CORE.toast('Preencha seu WhatsApp com DDD');return;}
  var tipo=$('#fTipo').value||'não informado';
  var msg=$('#fMsg').value||'';
  var lead={nome:nome,email:$('#fEmail').value||null,whatsapp:wa,tipo_evento:tipo,mensagem:msg||'Contato pelo site',origem:'landing_contato'};
  sbPost('co_leads',lead);
  CORE.toast('Mensagem enviada com sucesso!');
  var waNumber=C.contatos.whatsapp;
  var m='*🎵 432UP — Primeiro contato*\n';
  m+='📍 _Formulário do site_\n';
  m+='━━━━━━━━━━━━━━━━━━\n\n';
  m+='Olá! Preenchi o formulário no site e gostaria de conversar sobre meu evento.\n\n';
  m+='Nome: '+nome+'\n';
  if($('#fEmail').value)m+='Email: '+$('#fEmail').value+'\n';
  m+='Tipo: '+tipo+'\n';
  if(msg)m+='Mensagem: '+msg+'\n';
  var waUrl='https://wa.me/'+waNumber+'?text='+encodeURIComponent(m);
  showCentralConfirm('Mensagem enviada!','Deseja continuar no WhatsApp para agilizar?','Sim, abrir WhatsApp','Não, obrigado',function(){window.open(waUrl,'_blank');});
}

$('#calcOverlay').addEventListener('click',function(e){if(e.target===this)closeCalc();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('#calcOverlay').classList.contains('open'))closeCalc();});

waMask($('#fWa'));

window.openCalc=openCalc;
window.openCalcPkg=openCalcPkg;
window.closeCalc=closeCalc;
window.sendLead=sendLead;
window.closeLightbox=closeLightbox;
window.navegarLightbox=navegarLightbox;

/* ====== Wrapper compat: applyVisualConfig (delegando ao CORE) ====== */
function applyVisualConfig(v){
  try{
    if(CORE && CORE.applyVisualConfig){
      CORE.applyVisualConfig(v, { page: 'home' });
    }
  }catch(e){}
  /* side effects do HOME */
  applyIndexVisualSideEffects(v);
}
window.applyVisualConfig=applyVisualConfig;

/* ====== INIT ====== */
genConfetti();
genOrbs();
genParticles();
setupMareDrag();
loadAll();

window.addEventListener('scroll',animateNumbers);
animateNumbers();

var ftc=0,ftt=0;
$('#siteFooter').addEventListener('click',function(){
  var n=Date.now();
  if(n-ftt>1500){ftc=0;}
  ftc++;ftt=n;
  if(ftc>=3){
  window.location.href = 'https://ef11af05-97eb-46d5-9bcb-3d7f73598093.vip.gensparksite.com/admin.html';
}

});

})();

/* ===== DEBUG BAR (SITE) ===== */
/* PATCH DEBUG — oculto por padrão; Ctrl+Shift+D alterna (index) */
(function(){
  function bars(){
    var arr=[];
    var a=document.getElementById('dbgBar');
    if(a) arr.push(a);
    document.querySelectorAll('.debug-bar').forEach(function(x){
      if(arr.indexOf(x)<0) arr.push(x);
    });
    return arr;
  }

  function rememberDisplay(el){
    if(!el || !el.dataset) return;
    if(!el.dataset.dbgDisplay){
      var d = (window.getComputedStyle ? getComputedStyle(el).display : el.style.display) || 'block';
      if(d==='none') d='block';
      el.dataset.dbgDisplay = d;
    }
  }

  function setOn(on){
    var list=bars();
    list.forEach(function(el){
      rememberDisplay(el);
      if(on){
        el.classList.add('is-on');
        el.style.display = el.dataset.dbgDisplay || '';
      }else{
        el.classList.remove('is-on');
        el.style.display = 'none';
      }
    });
  }

  function boot(){
    setOn(false);

    document.addEventListener('keydown',function(e){
      if(!(e.ctrlKey && e.shiftKey && (e.key==='D' || e.key==='d'))) return;

      var list=bars();
      if(!list.length) return;

      var anyOn=list.some(function(el){ return el.style.display !== 'none'; });
      setOn(!anyOn);

      e.preventDefault();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, true);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* roll uppp ====== */

function toggleForm(){
  const form = document.getElementById("contactForm");
  form.classList.toggle("open");
}



/* ===== FIM js/index.js v3.10.2 ===== */







