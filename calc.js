/* ========== v2.9.2.4  2026-03-07 calculadora.js ========== */
/* ALTERAÇÕES v2.9.1 → v2.9.2:
   - FIX: buildMsg() — mensagem WhatsApp humanizada, completa e sem
     separadores ━━━. Padrão idêntico ao pdf432up.js v3.5.1.
   - NENHUMA outra alteração. */

/* ===== GUARD — depende de config.js e core.js ===== */
var C    = window.CONFIG_432UP || window.C;
var CORE = window.CORE_432UP;
if(!C)    console.error('[432UP Calc] config.js não carregou');
if(!CORE) console.error('[432UP Calc] core.js não carregou');

/* ===== CONFIG ===== */
var SB_URL = (C && C.supabase && C.supabase.url)  || 'https://paetkspbfejtjjkngqej.supabase.co';
var SB_KEY = (C && C.supabase && C.supabase.key)  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
var sb     = supabase.createClient(SB_URL, SB_KEY);
var WA     = '5511948564577';

/* CFG — defaults; sobrescritos pelo CORE.loadVisualConfig() no init */
var CFG = {
  aurora_opacity:      0.6,
  fog_opacity:         0.4,
  calc_herdar_camadas: true,
  calc_layer_motion:   true,
  calc_layer_aurora:   true,
  calc_layer_algae:    true,
  calc_layer_particles:true,
  calc_layer_cta:      true,
  calc_tema:           'auto',
  tema_ativo:          'auto',
  motion_enabled:      true,
  layer_aurora:        true,
  layer_algae:         true,
  layer_particles:     true,
  cta_pulse_enabled:   true,
  bpm_global:          74,
  orbs_intensity:      50,
  particles_density:   50,
  glass_opacity:       0.82,
  glass_blur:          16,
  whatsapp:            '5511948564577',
  wa_msg_fab:          'Olá! Vi o site da 432UP e quero saber mais.',
  wa_msg_orcamento:    'Olá! Gostaria de receber um orçamento da 432UP.'
};

/* ===== EMBED MODE ===== */
var isEmbed   = new URLSearchParams(window.location.search).get('embed') === '1';
var presetPkg = new URLSearchParams(window.location.search).get('pacote');
var presetDone = false;

var isMob = /iPad|iPhone|Android/i.test(navigator.userAgent);
var ALG_N = isMob ? 50  : 90;
var ORB_N = isMob ? 12  : 22;
var PRT_N = isMob ? 60  : 120;

var PKG = [], SVC = [];
var activePkg = null;
var svcState  = {};
var evTipo = '', evGuests = 80, evGuestChipSelected = false;
var DEFAULT_HOURS = 4;

var FB_PKG = [
  {pacote_id:'bronze',nome:'Bronze',preco:2490,desconto_percentual:27,horas_inclusas:4,destaque:false,ideal_para:'Eventos íntimos até 80 pessoas',itens:['DJ','Som','Luz'],servicos_ids:['dj','som','luz']},
  {pacote_id:'prata', nome:'Prata', preco:3690,desconto_percentual:23,horas_inclusas:5,destaque:false,ideal_para:'Festas e celebrações até 150 pessoas',itens:['DJ','Som','Luz','Palco'],servicos_ids:['dj','som','luz','palco']},
  {pacote_id:'ouro',  nome:'Ouro',  preco:6490,desconto_percentual:37,horas_inclusas:6,destaque:true, ideal_para:'Grandes eventos e produções completas',itens:['DJ','Som','Luz','Palco','Filmagem'],servicos_ids:['dj','som','luz','palco','filmagem']}
];
var FB_SVC = [
  {servico_id:'dj',       nome:'DJ',          icone:'🎧',valor_base:1900,valor_por_hora:250,descricao:'DJ profissional com repertório personalizado'},
  {servico_id:'som',      nome:'Sonorização',  icone:'🔊',valor_base:1500,valor_por_hora:180,descricao:'Sistema de som dimensionado por convidados',faixas:[{min:0,max:80,adicional:0,label:'até 80'},{min:81,max:150,adicional:900,label:'81–150'},{min:151,max:250,adicional:1800,label:'151–250'},{min:251,max:500,adicional:3000,label:'251–500'},{min:501,max:9999,adicional:4500,label:'500+'}]},
  {servico_id:'luz',      nome:'Iluminação',   icone:'💡',valor_base:1400,valor_por_hora:280,descricao:'Projeto de luz cênica e ambiente'},
  {servico_id:'palco',    nome:'Palco',        icone:'🏗️',valor_base:3500,valor_por_hora:0,  descricao:'Estrutura de palco profissional'},
  {servico_id:'banda',    nome:'Banda',        icone:'🎸',valor_base:5800,valor_por_hora:0,  descricao:'Banda ao vivo com repertório sob medida'},
  {servico_id:'filmagem', nome:'Filmagem',     icone:'🎬',valor_base:2000,valor_por_hora:400,descricao:'Captação cinematográfica do evento'},
  {servico_id:'backdrop', nome:'Backdrop',     icone:'🎨',valor_base:2200,valor_por_hora:0,  descricao:'Painel decorativo personalizado'}
];

var HOUR_SNAPS = [2,3,4,5,6,7,8,9,10,11,12];

/* ===== NAV ===== */
function toggleNav(){document.getElementById('mainNav').classList.toggle('open');document.getElementById('navOverlay').classList.toggle('open')}
function closeNav(){document.getElementById('mainNav').classList.remove('open');document.getElementById('navOverlay').classList.remove('open')}

/* ===== BPM — sincronizado com index e galeria ===== */
var BPM_BASE   = 74;
var BPM_FACTOR = 1;

function setBpmFactor(bpm){
  var b = parseInt(bpm) || BPM_BASE;
  BPM_FACTOR = Math.max(0.2, Math.min(4, b / BPM_BASE));
}

function applyBpmToBands(bpm){
  var speed = Math.max(0.2, Math.min(4, (parseInt(bpm) || BPM_BASE) / BPM_BASE));
  var aurBase = [11,14,9,17];
  document.querySelectorAll('.aurora-band').forEach(function(el,i){
    el.style.animationDuration = ((aurBase[i]||12) / speed).toFixed(3) + 's';
  });
  var fogBase = [22,32];
  document.querySelectorAll('.fog-band').forEach(function(el,i){
    el.style.animationDuration = ((fogBase[i]||30) / speed).toFixed(3) + 's';
  });
}

/* ===== VISUAL LAYERS — motor idêntico ao index.js v3.10.0 ===== */

function genConfetti(){
  var c = document.getElementById('algaeLayer');
  if(!c) return;
  c.innerHTML = '';
  var isLight = document.documentElement.dataset.theme === 'light';

  var palette = isLight ? [
    {color:'rgba(217,160,40,.45)', weight:20},
    {color:'rgba(196,140,30,.40)', weight:10},
    {color:'rgba(180,120,25,.35)', weight:10},
    {color:'rgba(139,92,246,.30)', weight:18},
    {color:'rgba(167,139,250,.25)',weight:17},
    {color:'rgba(132,204,22,.30)', weight:13},
    {color:'rgba(163,230,53,.25)', weight:12}
  ] : [
    {color:'rgba(139,92,246,.35)', weight:20},
    {color:'rgba(167,139,250,.30)',weight:20},
    {color:'rgba(236,72,153,.28)', weight:15},
    {color:'rgba(244,114,182,.25)',weight:15},
    {color:'rgba(132,204,22,.30)', weight:15},
    {color:'rgba(163,230,53,.25)', weight:15}
  ];

  var pool = [];
  palette.forEach(function(p){ for(var i=0;i<p.weight;i++) pool.push(p.color); });
  function pickColor(){ return pool[Math.floor(Math.random() * pool.length)]; }

  var factor = (CFG.particles_density || 50) / 50;
  var total  = Math.max(0, Math.round(ALG_N * factor));
  var sparkleCount  = Math.floor(total * 0.2);
  var confettiCount = total - sparkleCount;

  for(var i = 0; i < confettiCount; i++){
    var d = document.createElement('div');
    var shape = Math.random();
    var w, h, cls;
    if(shape < 0.4)       { w=4+Math.random()*10; h=8+Math.random()*18; cls='confetti confetti-rect'; }
    else if(shape < 0.75) { w=5+Math.random()*12; h=w;                  cls='confetti confetti-circle'; }
    else                  { w=6+Math.random()*10; h=w;                   cls='confetti confetti-diamond'; }
    var co    = isLight ? (0.15+Math.random()*0.25) : (0.12+Math.random()*0.22);
    var dur   = (6  + Math.random()*12) / BPM_FACTOR;
    var delay = Math.random() * -15;
    var cr    = Math.random() * 360;
    var cy1   = -8  - Math.random()*20;
    var cy2   = -4  - Math.random()*12;
    var cy3   = -10 - Math.random()*25;
    d.className = cls;
    d.style.cssText = 'width:'+w+'px;height:'+h+'px;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;background:'+pickColor()+';--co:'+co+';--cr:'+cr+'deg;--cy1:'+cy1+'px;--cy2:'+cy2+'px;--cy3:'+cy3+'px;animation:confettiFall '+dur+'s ease-in-out infinite '+delay+'s;opacity:'+co;
    c.appendChild(d);
  }

  for(var j = 0; j < sparkleCount; j++){
    var s    = document.createElement('div');
    s.className = 'sparkle';
    var so    = isLight ? (0.15+Math.random()*0.25) : (0.10+Math.random()*0.20);
    var sdur  = (3 + Math.random()*6) / BPM_FACTOR;
    var sdly  = Math.random() * -8;
    var ssz   = 8 + Math.random()*14;
    var scol  = pickColor();
    s.textContent = Math.random() > 0.5 ? '✦' : '✧';
    s.style.cssText = 'left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;font-size:'+ssz+'px;color:'+scol+';--so:'+so+';animation:sparklePulse '+sdur+'s ease-in-out infinite '+sdly+'s;opacity:'+so;
    c.appendChild(s);
  }
}

function genOrbs(){
  var factor = (CFG.orbs_intensity || 50) / 50;
  var n = Math.round(ORB_N * factor);
  var c = document.getElementById('orbsLayer');
  if(!c) return;
  c.innerHTML = '';
  for(var i = 0; i < n; i++){
    var d = document.createElement('div'); d.className = 'orb';
    var sz   = 5 + Math.random()*17;
    var odur = (6 + Math.random()*12) / BPM_FACTOR;
    d.style.cssText = 'width:'+sz+'px;height:'+sz+'px;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;--ox:'+(3+Math.random()*10)+'px;--oy:'+(-3-Math.random()*10)+'px;--oy2:'+(2+Math.random()*8)+'px;animation:orbFloat '+odur+'s ease-in-out infinite '+(Math.random()*-8)+'s;opacity:'+(0.3+Math.random()*0.4);
    c.appendChild(d);
  }
}

function genParticles(){
  var factor = (CFG.particles_density || 50) / 50;
  var n = Math.round(PRT_N * factor);
  var c = document.getElementById('particlesLayer');
  if(!c) return;
  c.innerHTML = '';
  for(var i = 0; i < n; i++){
    var d = document.createElement('div'); d.className = 'ptc';
    var pdur = (4 + Math.random()*10) / BPM_FACTOR;
    d.style.cssText = 'left:'+Math.random()*100+'%;top:'+(60+Math.random()*40)+'%;--po:'+(0.15+Math.random()*0.35)+';--py:'+(-30-Math.random()*80)+'px;animation:ptcFloat '+pdur+'s linear infinite '+(Math.random()*-8)+'s';
    c.appendChild(d);
  }
}

/* ===== RESOLVE LAYERS — v2.9.1 ===== */
function resolveCalcLayers(cfg){
  cfg = cfg || {};
  var herdar = cfg.calc_herdar_camadas !== false;
  var L = {
    motion:    cfg.motion_enabled    !== false,
    aurora:    cfg.layer_aurora      !== false,
    algae:     cfg.layer_algae       !== false,
    particles: cfg.layer_particles   !== false,
    cta:       cfg.cta_pulse_enabled !== false
  };
  if(herdar) return L;
  if(cfg.calc_layer_motion    != null) L.motion    = cfg.calc_layer_motion    !== false;
  if(cfg.calc_layer_aurora    != null) L.aurora    = cfg.calc_layer_aurora    !== false;
  if(cfg.calc_layer_algae     != null) L.algae     = cfg.calc_layer_algae     !== false;
  if(cfg.calc_layer_particles != null) L.particles = cfg.calc_layer_particles !== false;
  if(cfg.calc_layer_cta       != null) L.cta       = cfg.calc_layer_cta       !== false;
  return L;
}

/* ===== gerarCamadas ===== */
function gerarCamadas(){
  var bpm = CFG.bpm_global || 74;
  setBpmFactor(bpm);
  applyBpmToBands(bpm);
  if(CORE && CORE.applyVisualConfig) CORE.applyVisualConfig(CFG, {page:'calc'});
  var L = resolveCalcLayers(CFG);
  if(L.motion && L.algae)      genConfetti();
  if(L.motion)                 genOrbs();
  if(L.motion && L.particles)  genParticles();
}

/* ===== TEMA ===== */
function applyTheme(){
  var t = CFG.tema_ativo || CFG.calc_tema || 'auto';
  var dark;
  if(t === 'dark')       dark = true;
  else if(t === 'light') dark = false;
  else dark = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  setTimeout(function(){ paintTrack('hourSlider'); }, 100);
}
function initAutoTheme(){
  applyTheme();
  if(window.matchMedia){
    window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', function(){
      if((CFG.tema_ativo || CFG.calc_tema || 'auto') === 'auto') applyTheme();
    });
  }
}

/* ===== postMessage para o index ===== */
function sendTotalToParent(total, eco){
  if(!isEmbed) return;
  try{ window.parent.postMessage({type:'432up-calc-total',total:total,eco:eco},'*'); }catch(e){}
}

window.addEventListener('message', function(e){
  var d = e.data;
  if(!d || !d.type) return;
  if(d.type === '432up-select-pkg' && d.pkg){
    var target = PKG.find(function(p){ return p.nome.toLowerCase() === d.pkg.toLowerCase(); });
    if(target){ clickPkg(target.pacote_id); window.scrollTo(0,0); dbg('Pacote via postMessage: '+target.nome,'on'); }
  }
});

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', function(){
  dbg('v2.9.2 Iniciando...','on');

  var configPromise = (CORE && CORE.loadVisualConfig)
    ? CORE.loadVisualConfig()
    : Promise.resolve(null);

  configPromise.then(function(cfg){
    if(cfg && typeof cfg === 'object'){
      Object.keys(cfg).forEach(function(k){ CFG[k] = cfg[k]; });
    }
    applyTheme();
    if(!isEmbed) gerarCamadas();
    initAutoTheme();
    initHourSlider();
    initChips();
    initPhoneMask('mPhone');
    if(!isEmbed) initAdminTap();
    initButtons();
    initModal();
    initFabObserver();

    if(isEmbed){
  document.querySelectorAll('header,.nav-overlay,.debug,.fab-wa,.fab-total,.footer').forEach(function(el){ el.style.display='none'; });
  document.body.classList.add('embed-mode');
  document.documentElement.style.overflowX = 'hidden';
  document.body.style.overflowX = 'hidden';
  document.documentElement.style.background = 'transparent';
  document.body.style.background =
    document.documentElement.getAttribute('data-theme') === 'light'
      ? 'rgba(245,240,232,0.45)'
      : 'rgba(10,10,18,0.45)';
  document.documentElement.style.setProperty('--glass-bg', 'transparent');
  document.documentElement.style.setProperty('--glass-opacity', '0');
}


    var dateInput = document.getElementById('evDate');
    if(dateInput){
      dateInput.addEventListener('change', function(){
        var parts = dateInput.value.split('-');
        if(parts.length === 3){
          var selected = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
          var now = new Date(); now.setHours(0,0,0,0);
          if(selected < now){ dateInput.value=''; toast('Selecione uma data futura.'); }
        }
      });
    }

    if(!isEmbed){
      PKG = FB_PKG; SVC = FB_SVC;
      SVC.forEach(function(s){ svcState[s.servico_id]='off'; });
      renderPkgs(); renderSvcs(); recalc();
    } else {
      var pg = document.getElementById('pkgGrid'); if(pg) pg.innerHTML='<div class="resumo-empty">Carregando pacotes...</div>';
      var sg = document.getElementById('svcGrid'); if(sg) sg.innerHTML='<div class="resumo-empty">Carregando serviços...</div>';
    }

    loadData();
  });
});

/* ===== CHIPS ===== */
function initChips(){
  document.querySelectorAll('#tipoChips .chip').forEach(function(c){
    c.addEventListener('click',function(){
      var wasActive=c.classList.contains('active');
      document.querySelectorAll('#tipoChips .chip').forEach(function(x){x.classList.remove('active')});
      if(!wasActive){
        c.classList.add('active');evTipo=c.dataset.val||'';
        if(c.classList.contains('outro')){
          var v=prompt('Qual tipo de evento?');
          if(v){evTipo=v;c.textContent=v;c.classList.add('active')}
          else{c.classList.remove('active');evTipo='';c.textContent='Outro'}
        }
      }else{evTipo='';}
      recalc();
    });
  });
  document.querySelectorAll('#localChips .chip').forEach(function(c){
    c.addEventListener('click',function(){
      var wasActive=c.classList.contains('active');
      document.querySelectorAll('#localChips .chip').forEach(function(x){x.classList.remove('active')});
      if(!wasActive){c.classList.add('active');document.getElementById('evLocal').value=c.dataset.val;}
      else{document.getElementById('evLocal').value='';}
      recalc();
    });
  });
  document.getElementById('evLocal').addEventListener('input',function(){
    document.querySelectorAll('#localChips .chip').forEach(function(x){x.classList.remove('active')});
    recalc();
  });
  document.querySelectorAll('#guestChips .chip').forEach(function(c){
    c.addEventListener('click',function(){
      var wasActive=c.classList.contains('active');
      document.querySelectorAll('#guestChips .chip').forEach(function(x){x.classList.remove('active')});
      document.getElementById('guestCustom').style.display='none';
      if(!wasActive){
        c.classList.add('active');evGuestChipSelected=true;
        if(c.dataset.val==='outro'){
          document.getElementById('guestCustom').style.display='block';
          document.getElementById('guestCustom').focus();
          evGuests=parseInt(document.getElementById('guestCustom').value)||80;
        }else{evGuests=parseInt(c.dataset.val)||80;}
      }else{evGuestChipSelected=false;evGuests=80;}
      recalc();
    });
  });
  document.getElementById('guestCustom').addEventListener('input',function(){evGuests=parseInt(this.value)||80;recalc();});
  document.getElementById('evDate').addEventListener('change',function(){recalc();});
  document.getElementById('evObs').addEventListener('input',function(){recalc();});
}

function initButtons(){
  document.getElementById('fabWA').addEventListener('click',function(e){e.preventDefault();sendWA('fab_calculadora');});
  document.getElementById('contactWA').addEventListener('click',function(e){e.preventDefault();sendWA('contato_calculadora');});
  document.getElementById('contactEmail').addEventListener('click',function(e){e.preventDefault();openEmailModal();});
  document.getElementById('btnResumoWA').addEventListener('click',function(e){e.preventDefault();sendWA('resumo_calculadora');});
  document.getElementById('btnResumoEmail').addEventListener('click',function(e){e.preventDefault();openEmailModal();});
}

function initModal(){
  document.getElementById('modalClose').addEventListener('click',closeEmailModal);
  document.getElementById('modalCancel').addEventListener('click',closeEmailModal);
  document.getElementById('modalSend').addEventListener('click',submitEmail);
  document.getElementById('emailModal').addEventListener('click',function(e){if(e.target===this)closeEmailModal();});
  document.getElementById('postModalClose').addEventListener('click',closePostModal);
  document.getElementById('postModalNo').addEventListener('click',closePostModal);
  document.getElementById('postModalWA').addEventListener('click',function(){closePostModal();sendWA('pos_email_calculadora');});
  document.getElementById('postEmailModal').addEventListener('click',function(e){if(e.target===this)closePostModal();});
}

function openEmailModal(){
  if(isEmbed){
    var data=buildMsg('email_calculadora');
    try{
      window.parent.postMessage({type:'432up-open-email-modal',data:{
        msg:data.msg,tipo:data.tipo,guests:data.guests,hours:data.hours,
        total:data.total,dt:data.dt,local:data.local,obs:data.obs,
        hasSelection:data.hasSelection,activePkg:activePkg
      }},'*');
    }catch(e){}
    return;
  }
  document.getElementById('emailModal').classList.add('active');
  document.querySelectorAll('#emailModal input').forEach(function(i){i.classList.remove('field-error');});
  dbg('Modal e-mail aberto','on');
}
function closeEmailModal(){document.getElementById('emailModal').classList.remove('active');}
function closePostModal(){document.getElementById('postEmailModal').classList.remove('active');}

function submitEmail(){
  var nome=document.getElementById('mName').value.trim();
  var phone=document.getElementById('mPhone').value.trim();
  var email=document.getElementById('mEmail').value.trim();
  var ok=true;
  document.querySelectorAll('#emailModal input').forEach(function(i){i.classList.remove('field-error');});
  if(!nome){document.getElementById('mName').classList.add('field-error');ok=false;}
  if(!phone||phone.replace(/\D/g,'').length<10){document.getElementById('mPhone').classList.add('field-error');ok=false;}
  if(!email||email.indexOf('@')<1){document.getElementById('mEmail').classList.add('field-error');ok=false;}
  if(!ok){toast('Preencha nome, WhatsApp e e-mail.');return;}
  var data=buildMsg('email_calculadora');
  data.nome=nome;data.phone=phone;data.email=email;
  var subject='Orçamento 432UP';if(evTipo)subject+=' - '+evTipo;
  var body=data.msg.replace(/\*/g,'').replace(/━/g,'-');
  body+='\n\nNome: '+nome+'\nWhatsApp: '+phone+'\nE-mail: '+email;
  saveLeadBeacon(data,'email_calculadora');
  closeEmailModal();
  var mailto='mailto:contato@432up.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  if(isEmbed){
    try{
      window.parent.postMessage({type:'432up-open-mailto',url:mailto},'*');
      window.parent.postMessage({type:'432up-toast',msg:'Orçamento enviado com sucesso!'},'*');
      window.parent.postMessage({type:'432up-post-email-wa',waUrl:'https://wa.me/'+CFG.whatsapp+'?text='+encodeURIComponent(data.msg)},'*');
    }catch(e){}
    return;
  }
  window.location.href=mailto;
  setTimeout(function(){document.getElementById('postEmailModal').classList.add('active');},1000);
}

function initAdminTap(){
  var el=document.getElementById('footerAdmin');if(!el)return;
  var taps=0,timer=null,lastTap=0;
  function handler(e){
    var now=Date.now();if(now-lastTap<300)return;lastTap=now;
    e.preventDefault();e.stopPropagation();
    taps++;dbg('Admin tap: '+taps+'/3','on');
    if(taps>=3){taps=0;clearTimeout(timer);dbg('Abrindo admin...','on');window.location.href='admin.html';}
    else{clearTimeout(timer);timer=setTimeout(function(){taps=0;},1500);}
  }
  el.addEventListener('touchstart',handler,{passive:false});
  el.addEventListener('click',handler);
}

function initFabObserver(){
  var resumo=document.getElementById('resumoBox');
  var fab=document.getElementById('fabTotal');
  if(!resumo||!fab||!window.IntersectionObserver)return;
  if(isEmbed)return;
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      var total=parseInt((document.getElementById('fabVal').textContent||'0').replace(/\D/g,''))||0;
      if(total>0){fab.classList.toggle('hidden',e.isIntersecting);}
    });
  },{threshold:0.3});
  obs.observe(resumo);
}

/* ===== LOAD DATA ===== */
async function loadData(){
  var savedPkg=activePkg;
  var savedSvcState={};
  Object.keys(svcState).forEach(function(k){savedSvcState[k]=svcState[k];});
  var savedHours=document.getElementById('hourSlider').value;
  try{
    var rp=await sb.from('co_calc_pacotes').select('*').eq('ativo',true).order('ordem',{ascending:true});
    var rs=await sb.from('co_calculadora_valores').select('*').eq('ativo',true);
    PKG=(rp.data&&rp.data.length)?rp.data.map(normPkg):FB_PKG;
    SVC=(rs.data&&rs.data.length)?rs.data.map(normSvc):FB_SVC;
    var somCheck=SVC.find(function(s){return s.servico_id==='som';});
    if(somCheck&&somCheck.faixas&&somCheck.faixas.length) dbg('DB OK: '+PKG.length+'pkg, '+SVC.length+'svc | Som: '+somCheck.faixas.length+' faixas','on');
    else{dbg('DB OK mas Som sem faixas - fallback','off');if(somCheck)somCheck.faixas=FB_SVC[1].faixas;}
  }catch(e){PKG=FB_PKG;SVC=FB_SVC;dbg('Fallback: '+e.message,'off');}
  SVC.forEach(function(s){svcState[s.servico_id]='off';});
  renderPkgs(true);
  renderSvcs();
  if(savedPkg){
    activePkg=savedPkg;
    var pkg=findPkg(savedPkg);
    if(pkg) pkg.servicos_ids.forEach(function(sid){if(svcState.hasOwnProperty(sid))svcState[sid]='included';});
    Object.keys(savedSvcState).forEach(function(k){
      if(savedSvcState[k]==='manual'&&svcState.hasOwnProperty(k))svcState[k]='manual';
    });
    document.getElementById('hourSlider').value=savedHours;
    updateHourDisplay();
  }
  updateUI();
  recalc();
  if(presetPkg&&!presetDone){
    presetDone=true;
    var target=PKG.find(function(p){return p.nome.toLowerCase()===presetPkg.toLowerCase();});
    if(target) setTimeout(function(){clickPkg(target.pacote_id);dbg('Preset: '+target.nome+' selecionado','on');},200);
  }
  if(isEmbed){try{window.parent.postMessage({type:'432up-calc-ready'},'*');}catch(e){}}
}

function normPkg(p){
  p.servicos_ids=toArr(p.servicos_ids).map(function(s){return String(s).toLowerCase().trim();});
  p.itens=toArr(p.itens);p.horas_inclusas=Number(p.horas_inclusas)||4;
  p.desconto_percentual=Number(p.desconto_percentual)||0;
  p.preco=Number(p.preco_pacote||p.preco)||0;
  p.destaque=!!p.destaque;
  return p;
}
function normSvc(s){
  s.faixas=toArr(s.faixas);s.valor_base=Number(s.valor_base)||0;
  s.valor_por_hora=Number(s.valor_por_hora)||0;
  s.servico_id=String(s.servico_id).toLowerCase().trim();
  return s;
}
function toArr(v){if(Array.isArray(v))return v;if(typeof v==='string'){try{var p=JSON.parse(v);return Array.isArray(p)?p:[];}catch(e){return[];}}return[];}

/* ===== RENDER ===== */
function render(){renderPkgs();renderSvcs();}

function renderPkgs(skipPreset){
  var g=document.getElementById('pkgGrid');g.innerHTML='';
  PKG.forEach(function(p){
    var names=p.itens.length?p.itens.join(' · '):p.servicos_ids.join(' · ');
    var avulso=0;p.servicos_ids.forEach(function(sid){var s=findSvc(sid);if(s)avulso+=s.valor_base;});
    var eco=avulso-p.preco;var c=document.createElement('div');c.className='card';c.dataset.pid=p.pacote_id;
    var h='';if(p.destaque)h+='<div class="badge pop">Mais popular</div>';
    h+='<div class="card-icon">📦</div><div class="card-name">Pacote '+esc(p.nome)+'</div>';
    h+='<div class="card-desc">'+esc(p.ideal_para||'')+'</div>';
    h+='<div class="card-price">R$ '+fmt(p.preco)+'<small> / '+p.horas_inclusas+'h inclusas</small>';
    if(eco>0)h+='<span class="old">R$ '+fmt(avulso)+'</span>';
    h+='</div>';if(eco>0)h+='<div class="card-economy">Economia de R$ '+fmt(eco)+' ('+p.desconto_percentual+'%)</div>';
    h+='<div class="card-items">'+esc(names)+'</div>';
    c.innerHTML=h;c.addEventListener('click',function(){clickPkg(p.pacote_id);});g.appendChild(c);
  });
}

function renderSvcs(){
  var g=document.getElementById('svcGrid');g.innerHTML='';
  SVC.forEach(function(s){
    var c=document.createElement('div');c.className='card';c.id='svc-'+s.servico_id;c.dataset.sid=s.servico_id;
    var h='<div class="badge inc" id="badge-'+s.servico_id+'" style="display:none">Incluído no pacote</div>';
    h+='<div class="card-icon">'+(s.icone||'🎵')+'</div><div class="card-name">'+esc(s.nome)+'</div>';
    h+='<div class="card-desc">'+esc(s.descricao||'')+'</div><div class="card-price">R$ '+fmt(s.valor_base)+'</div>';
    c.innerHTML=h;c.addEventListener('click',function(){clickSvc(s.servico_id);});g.appendChild(c);
  });
}

/* ===== CLICK HANDLERS ===== */
function clickPkg(pid){
  if(activePkg===pid){
    activePkg=null;resetAll();
    document.getElementById('hourSlider').value=DEFAULT_HOURS;
    updateHourDisplay();toast('Pacote removido.');
  }else{
    var had=activePkg;activePkg=pid;resetAll();
    var pkg=findPkg(pid);
    if(pkg){
      pkg.servicos_ids.forEach(function(sid){if(svcState.hasOwnProperty(sid))svcState[sid]='included';});
      document.getElementById('hourSlider').value=pkg.horas_inclusas;
      updateHourDisplay();
    }
    if(had)toast('Pacote trocado!');
  }
  updateUI();recalc();
}

function clickSvc(sid){
  var st=svcState[sid];
  if(st==='included')breakPkg(sid);
  else if(st==='manual')svcState[sid]='off';
  else svcState[sid]='manual';
  updateUI();recalc();
}

function breakPkg(removedSid){
  var pkg=findPkg(activePkg);if(!pkg)return;
  pkg.servicos_ids.forEach(function(sid){
    if(sid===removedSid)svcState[sid]='off';
    else if(svcState[sid]==='included')svcState[sid]='manual';
  });
  activePkg=null;
  document.getElementById('hourSlider').value=DEFAULT_HOURS;
  updateHourDisplay();
  toast('Pacote removido — horas voltaram para '+DEFAULT_HOURS+'h.');
}

function resetAll(){Object.keys(svcState).forEach(function(sid){svcState[sid]='off';});}

function updateUI(){
  document.querySelectorAll('#pkgGrid .card').forEach(function(c){c.classList.toggle('selected',c.dataset.pid===activePkg);});
  SVC.forEach(function(s){
    var card=document.getElementById('svc-'+s.servico_id),badge=document.getElementById('badge-'+s.servico_id);
    if(!card)return;var st=svcState[s.servico_id]||'off';
    card.classList.remove('selected','included');if(badge)badge.style.display='none';
    if(st==='included'){card.classList.add('included');if(badge)badge.style.display='';}
    else if(st==='manual')card.classList.add('selected');
  });
}

/* ===== HOUR SLIDER ===== */
function initHourSlider(){
  var hs=document.getElementById('hourSlider');
  var hsnaps=document.getElementById('hourSnaps');
  HOUR_SNAPS.forEach(function(n){
    var sp=document.createElement('span');sp.textContent=n+'h';
    sp.addEventListener('click',function(){hs.value=n;updateHourDisplay();recalc();});
    hsnaps.appendChild(sp);
  });
  hs.addEventListener('input',function(){updateHourDisplay();recalc();});
  updateHourDisplay();
}

function updateHourDisplay(){
  var v=parseInt(document.getElementById('hourSlider').value)||4;
  document.getElementById('hourVal').textContent=v+'h';
  paintTrack('hourSlider');
  document.querySelectorAll('#hourSnaps span').forEach(function(sp,i){sp.classList.toggle('active',HOUR_SNAPS[i]===v);});
}

function paintTrack(id){
  var el=document.getElementById(id);if(!el)return;
  var pct=((el.value-el.min)/(el.max-el.min))*100;
  var ac=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  var bd=getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
  el.style.background='linear-gradient(to right,'+ac+' '+pct+'%,'+bd+' '+pct+'%)';
}

/* ===== GETTERS ===== */
function getGuests(){return evGuests||80;}
function getHours(){return parseInt(document.getElementById('hourSlider').value)||4;}
function getLocal(){return(document.getElementById('evLocal').value||'').trim();}
function getDate(){return(document.getElementById('evDate').value||'').trim();}
function getObs(){return(document.getElementById('evObs').value||'').trim();}

function hasAnyInteraction(){
  if(activePkg)return true;
  if(Object.keys(svcState).some(function(k){return svcState[k]==='manual';}))return true;
  if(evTipo)return true;
  if(evGuestChipSelected)return true;
  if(getDate())return true;
  if(getLocal())return true;
  if(getObs())return true;
  if(getHours()!==DEFAULT_HOURS)return true;
  return false;
}

/* ===== RECALC ===== */
function recalc(){
  var guests=getGuests(),hours=getHours();
  var total=0,totalAvulso=0,lines=[];
  var pkg=activePkg?findPkg(activePkg):null;
  if(pkg){
    var inclH=pkg.horas_inclusas,extraH=Math.max(0,hours-inclH),disc=pkg.desconto_percentual/100;
    lines.push({type:'pkg',name:'📦 Pacote '+pkg.nome,detail:(pkg.itens.length?pkg.itens.join(', '):pkg.servicos_ids.join(', '))+' · '+inclH+'h inclusas',val:pkg.preco});
    total+=pkg.preco;
    var pkgAv=0;pkg.servicos_ids.forEach(function(sid){var s=findSvc(sid);if(s)pkgAv+=s.valor_base;});totalAvulso+=pkgAv;
    if(extraH>0){pkg.servicos_ids.forEach(function(sid){
      var svc=findSvc(sid);if(svc&&svc.valor_por_hora>0){
        var dv=Math.round(svc.valor_por_hora*(1-disc)*extraH),fv=svc.valor_por_hora*extraH;
        total+=dv;totalAvulso+=fv;lines.push({type:'extra',name:'+'+extraH+'h extra '+svc.nome+' (−'+pkg.desconto_percentual+'%)',val:dv});}
    });}
    if(pkg.servicos_ids.indexOf('som')>=0){var somS=findSvc('som');if(somS){var tier=getTier(somS.faixas,guests);
      if(tier&&tier.adicional>0){total+=tier.adicional;totalAvulso+=tier.adicional;lines.push({type:'extra',name:'Sonorização faixa '+tier.label+' ('+guests+' conv.)',val:tier.adicional});}}}
    SVC.forEach(function(svc){if(svcState[svc.servico_id]==='manual'){
      total+=svc.valor_base;totalAvulso+=svc.valor_base;lines.push({type:'svc',name:(svc.icone||'')+' '+svc.nome,val:svc.valor_base});
      if(extraH>0&&svc.valor_por_hora>0){var ev=svc.valor_por_hora*extraH;total+=ev;totalAvulso+=ev;lines.push({type:'extra',name:'+'+extraH+'h extra '+svc.nome,val:ev});}
      if(svc.servico_id==='som'){var t2=getTier(svc.faixas,guests);if(t2&&t2.adicional>0){total+=t2.adicional;totalAvulso+=t2.adicional;lines.push({type:'extra',name:'Sonorização faixa '+t2.label,val:t2.adicional});}}}});
  }else{
    var baseH=DEFAULT_HOURS,exH=Math.max(0,hours-baseH);
    SVC.forEach(function(svc){if(svcState[svc.servico_id]==='manual'){
      total+=svc.valor_base;totalAvulso+=svc.valor_base;lines.push({type:'svc',name:(svc.icone||'')+' '+svc.nome,val:svc.valor_base});
      if(exH>0&&svc.valor_por_hora>0){var ev=svc.valor_por_hora*exH;total+=ev;totalAvulso+=ev;lines.push({type:'extra',name:'+'+exH+'h extra '+svc.nome,val:ev});}
      if(svc.servico_id==='som'){var t3=getTier(svc.faixas,guests);if(t3&&t3.adicional>0){total+=t3.adicional;totalAvulso+=t3.adicional;lines.push({type:'extra',name:'Sonorização faixa '+t3.label,val:t3.adicional});}}}});
  }
  var eco=Math.max(0,totalAvulso-total);
  renderResumo(lines,total,eco,hasAnyInteraction());
  updateFab(total,eco);
  sendTotalToParent(total,eco);
}

function renderResumo(lines,total,eco,interaction){
  var body=document.getElementById('resumoBody');
  var infoDiv=document.getElementById('resumoInfo');
  var totalDiv=document.getElementById('resumoTotal');
  var actionsDiv=document.getElementById('resumoActions');
  if(!interaction){
    body.innerHTML='<div class="resumo-empty">Selecione um pacote ou serviço para ver o resumo.</div>';
    infoDiv.innerHTML='';totalDiv.innerHTML='';actionsDiv.style.display='none';return;
  }
  if(lines.length){
    var h='';
    lines.forEach(function(l){
      var cls='resumo-line'+(l.type==='pkg'?' pkg-line':'')+(l.type==='extra'?' extra-line':'');
      h+='<div class="'+cls+'"><div><span class="rl-name">'+l.name+'</span>';
      if(l.detail)h+='<br><span class="rl-detail">'+l.detail+'</span>';
      h+='</div><span class="rl-val">R$ '+fmt(l.val)+'</span></div>';
    });
    body.innerHTML=h;
  }else{
    body.innerHTML='<div class="resumo-empty" style="padding:12px 0;font-size:.82rem">Nenhum serviço selecionado — preencha os detalhes e fale conosco!</div>';
  }
  var tipo=evTipo,dt=getDate(),local=getLocal(),guests=getGuests(),hours=getHours(),obs=getObs();
  var ih='<div class="resumo-info"><div class="event-label" style="margin-bottom:8px;font-size:.8rem">INFORMAÇÕES DO EVENTO</div>';
  ih+='<div class="resumo-info-line"><span class="ri-label">Tipo</span><span class="ri-val">'+(tipo||'—')+'</span></div>';
  ih+='<div class="resumo-info-line"><span class="ri-label">Data</span><span class="ri-val">'+(dt||'—')+'</span></div>';
  ih+='<div class="resumo-info-line"><span class="ri-label">Cidade/Local</span><span class="ri-val">'+(local||'—')+'</span></div>';
  ih+='<div class="resumo-info-line"><span class="ri-label">Convidados</span><span class="ri-val">'+guests+'</span></div>';
  ih+='<div class="resumo-info-line"><span class="ri-label">Duração</span><span class="ri-val">'+hours+'h</span></div>';
  if(obs)ih+='<div class="resumo-info-line"><span class="ri-label">Observações</span><span class="ri-val">'+esc(obs)+'</span></div>';
  ih+='</div>';
  infoDiv.innerHTML=ih;
  var th='<div class="resumo-total"><span>Total estimado</span><span class="rt-val">R$ '+fmt(total)+'</span></div>';
  if(eco>0)th+='<div class="resumo-eco">Você economiza R$ '+fmt(eco)+'</div>';
  totalDiv.innerHTML=th;
  actionsDiv.style.display='flex';
}

/* ===== FAB ===== */
function updateFab(total,eco){
  var fab=document.getElementById('fabTotal');
  document.getElementById('fabVal').textContent='R$ '+fmt(total);
  document.getElementById('fabEco').textContent=eco>0?'-R$ '+fmt(eco):'';
  if(fab){ if(total>0)fab.classList.remove('hidden'); else fab.classList.add('hidden'); }
}

/* ===== BUILD MESSAGE — v2.9.2 ===== */
/* Mensagem humanizada, sem separadores ━━━, padrão idêntico       */
/* ao pdf432up.js v3.5.1. Retorno do objeto intacto.               */
function buildMsg(origem){
  var guests  = getGuests();
  var hours   = getHours();
  var tipo    = evTipo;
  var dt      = getDate();
  var local   = getLocal();
  var obs     = getObs();
  var pkg     = activePkg ? findPkg(activePkg) : null;
  var totalTxt= document.getElementById('fabVal').textContent || 'R$ 0';
  var hasSelection = !!activePkg || Object.keys(svcState).some(function(k){ return svcState[k]==='manual'; });

  /* formata data iso → dd/mm/aaaa para exibição */
  var dtFmt = '';
  if(dt){
    var parts = dt.split('-');
    if(parts.length === 3) dtFmt = parts[2]+'/'+parts[1]+'/'+parts[0];
    else dtFmt = dt;
  }

  var m = '';
  m += 'Olá, equipe 432UP! 👋\n\n';

  if(!hasAnyInteraction()){
    /* sem seleção — mensagem de primeiro contato */
    m += 'Estou explorando as possibilidades para o meu evento e gostaria de entender melhor as opções disponíveis.\n';
    m += 'Podem me ajudar a montar algo especial? ✨\n';
  } else {
    m += 'Acabei de montar meu orçamento pela calculadora e gostaria de dar o próximo passo. ✨\n\n';

    m += '🎯 *DETALHES DO MEU EVENTO*\n';
    if(tipo)  m += '🎉 Tipo: *' + tipo + '*\n';
    if(dtFmt) m += '📅 Data desejada: *' + dtFmt + '*\n';
    if(local) m += '📍 Local: *' + local + '*\n';
    m += '👥 Convidados: *' + guests + ' pessoas*\n';
    m += '⏱ Duração: *' + hours + ' horas*\n';

    if(pkg){
      m += '\n📦 *PACOTE SELECIONADO*\n';
      m += '• Pacote ' + pkg.nome + ' — R$ ' + fmt(pkg.preco) + '\n';
      m += '  (' + pkg.horas_inclusas + 'h inclusas · ' + pkg.desconto_percentual + '% de desconto)\n';
      m += '  Inclui: ' + (pkg.itens.length ? pkg.itens.join(', ') : pkg.servicos_ids.join(', ')) + '\n';
    }

    var extras = [];
    SVC.forEach(function(svc){
      if(svcState[svc.servico_id] === 'manual')
        extras.push('• ' + (svc.icone||'') + ' ' + svc.nome + ' — R$ ' + fmt(svc.valor_base));
    });
    if(extras.length){
      m += '\n🎛️ *SERVIÇOS / EXTRAS*\n';
      extras.forEach(function(e){ m += e + '\n'; });
    }

    if(obs) m += '\n📝 *Observações:* ' + obs + '\n';

    m += '\n💰 *ESTIMATIVA TOTAL: ' + totalTxt + '*\n';
    m += '_Valores estimados, sujeitos a confirmação pela equipe._\n';
  }

  m += '\nGostaria de confirmar a disponibilidade da data e receber a proposta oficial. 🙏\n';
  m += 'Podem me chamar por aqui mesmo!';

  return {
    msg:          m,
    nome:         null,
    phone:        null,
    email:        null,
    guests:       guests,
    hours:        hours,
    total:        totalTxt,
    tipo:         tipo,
    dt:           dt,
    local:        local,
    obs:          obs,
    hasSelection: hasSelection
  };
}

/* ===== SEND WA ===== */
function sendWA(origem){
  try{
    dbg('sendWA('+origem+')','on');
    var data=buildMsg(origem);
    var url='https://wa.me/'+CFG.whatsapp+'?text='+encodeURIComponent(data.msg);
    if(isEmbed){
      try{window.parent.postMessage({type:'432up-open-wa',url:url},'*');}catch(e){}
      dbg('WA delegado ao index (embed)','on');return;
    }
    dbg('Abrindo WhatsApp...','on');
    var win=window.open(url,'_blank');if(!win)window.location.href=url;
  }catch(e){dbg('Erro WA: '+e.message,'off');alert('Erro ao enviar: '+e.message);}
}

/* ===== SAVE LEAD ===== */
function saveLeadBeacon(data,origem){
  try{
    var obj={
      nome:data.nome||null,whatsapp:data.phone||null,email:data.email||null,
      tipo_evento:data.tipo||null,data_evento:data.dt||null,local:data.local||null,
      convidados:data.guests||null,horas:data.hours||null,total:data.total||null,
      pacote:activePkg||null,observacoes:data.obs||null,origem:origem||'calculadora',
      mensagem:(data.msg||'VAZIO - debug'),created_at:new Date().toISOString()
    };
    dbg('Lead enviando: '+JSON.stringify(obj).substring(0,80)+'...','on');
    console.log('[432] Lead obj:',JSON.stringify(obj));
    if(isEmbed){
      try{
        window.parent.postMessage({type:'432up-save-lead',lead:obj},'*');
        window.parent.postMessage({type:'432up-toast',msg:'Orçamento enviado!'},'*');
        dbg('Lead delegado ao index (embed)','on');
      }catch(e){dbg('Lead postMessage erro: '+e.message,'off');}
      return;
    }
    fetch(SB_URL+'/rest/v1/co_leads',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Prefer':'return=minimal'},
      body:JSON.stringify(obj),keepalive:true
    }).then(function(r){
      if(r.ok){dbg('Lead salvo! ('+origem+')','on');console.log('[432] Lead salvo OK');}
      else r.text().then(function(t){dbg('Lead erro: '+r.status+' '+t,'off');console.error('[432] Lead erro:',t);});
    }).catch(function(e){dbg('Lead erro: '+e.message,'off');console.error('[432] Lead catch:',e);});
  }catch(e){dbg('Lead erro: '+e.message,'off');console.error('[432] Lead catch outer:',e);}
}

/* ===== HELPERS ===== */
function findPkg(id){return PKG.find(function(p){return p.pacote_id===id;});}
function findSvc(id){return SVC.find(function(s){return s.servico_id===id;});}
function getTier(faixas,g){if(!faixas||!faixas.length)return null;for(var i=0;i<faixas.length;i++){if(g>=faixas[i].min&&g<=faixas[i].max)return faixas[i];}return faixas[faixas.length-1];}
function fmt(n){return Number(n).toLocaleString('pt-BR');}
function esc(s){return String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function toast(msg){
  if(isEmbed){try{window.parent.postMessage({type:'432up-toast',msg:msg},'*');}catch(e){}return;}
  var t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},3000);
}

function dbg(msg,s){
  var d=document.getElementById('dbgDot');
  var t=document.getElementById('dbgTxt');
  if(d)d.className='dot '+(s==='on'?'on':'off');
  if(t)t.textContent=msg;
  console.log('[432 DBG] '+msg);
}

function initPhoneMask(id){
  var el=document.getElementById(id);if(!el)return;
  el.addEventListener('input',function(){
    var v=el.value.replace(/\D/g,'').slice(0,11);
    if(v.length>6)v='('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
    else if(v.length>2)v='('+v.slice(0,2)+') '+v.slice(2);
    el.value=v;
  });
}

/* ===== EXPOSE GLOBALS ===== */
window.toggleNav = toggleNav;
window.closeNav  = closeNav;

/* ===== FIM DO ARQUIVO calc.js v2.9.2 ===== */
