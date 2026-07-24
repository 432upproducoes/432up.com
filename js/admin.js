/* ========== admin.js · 432UP · v2.6 · 2026-03-03 ========== */
/* MUDANÇAS v2.5 → v2.6:
   - dbg(): barra oculta por padrão; Ctrl+Shift+D alterna visibilidade
   - sbGet/sbPatch/sbPost/sbDel: console.error → dbg()
   - renderAnimacoes catch: adicionado dbg() com status HTTP e mensagem
   - saveAnimacoes catch: adicionado dbg() com mensagem
*/
/* ========== admin.js · 432UP · v2.5 · 2026-03-03 ========== */
/* MUDANÇAS v2.4 → v2.5:
   - renderAnimacoes: adicionados 19 novos campos ao SELECT e ao populate
   - saveAnimacoes: adicionados 19 novos campos ao payload
   - saveVisual: após salvar JSONB, dispara PATCH das colunas diretas (aurora_opacity,
     fog_opacity, masonry_*, calc_*, home_*, gal_*, galeria_carrossel_ativo)
*/
/* ========== admin.js · 432UP · v2.4 · 2026-03-03 ========== */
/* MUDANÇAS v2.3 → v2.4:
   - NOVO: renderAnimacoes — lê colunas diretas de co_configuracoes (fora do JSONB valor)
   - NOVO: saveAnimacoes — escreve colunas diretas de co_configuracoes (fora do JSONB valor)
   - NOVO: renderAnimacoes chamado dentro de loadAll
   - NOVO: window.saveAnimacoes exposto
   - NOTA TÉCNICA: DATA.config contém apenas o JSONB 'valor'. As colunas aurora_opacity,
     fog_opacity, carousel_*, masonry_*, calc_* são colunas diretas e requerem fetch próprio.
*/
/* ========== admin.js · 432UP · v2.3 · 2026-03-03 ========== */
/* MUDANÇAS v2.2 → v2.3:
   - PATCH TEMA: renderVisual e VISUAL_DEFAULTS atualizado — 'auto' como padrão do tema
*/
/* ========== admin.js · 432UP · v2.2 · 2026-02-28 ========== */
/* MUDANÇAS v2.1 → v2.2:
   - FIX 4: addItem pacotes — nivel com valor legível em vez de slug
   - FIX 5: saveTable — garante nome não-vazio no POST e PATCH de pacotes
*/
(function(){'use strict';

var SB='https://paetkspbfejtjjkngqej.supabase.co';
var SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
var BUCKET='432up_galeria';

var DATA={secoes:[],servicos:[],pacotes:[],depoimentos:[],faq:[],config:{},leads:[],galFotos:[],galCats:[]};
var _confirmCb=null;
var galFiles=[];
var galVidFile=null;
var selectedLeads={};

/* ===== DEBUG BAR ===== */
/* v2.6: barra oculta por padrão; Ctrl+Shift+D alterna visibilidade */
function dbg(msg, extra){
  var el = document.getElementById('dbgBar');
  if(!el) return;
  var t = new Date().toLocaleTimeString();
  var x = '';
  if (extra !== undefined) {
    if (typeof extra === 'string') x = extra;
    else { try { x = JSON.stringify(extra, null, 2); } catch(e){ x = String(extra); } }
  }
  el.textContent = '['+t+'] '+msg+(x?'\n'+x:'')+'\n\n'+el.textContent;
}

/* v2.6: oculta barra no boot; Ctrl+Shift+D alterna */
(function(){
  var el=document.getElementById('dbgBar');
  if(el)el.style.display='none';
  document.addEventListener('keydown',function(e){
    if(e.ctrlKey&&e.shiftKey&&(e.key==='D'||e.key==='d')){
      var bar=document.getElementById('dbgBar');
      if(!bar)return;
      bar.style.display=bar.style.display==='none'?'block':'none';
      e.preventDefault();
    }
  });
})();

window.onerror = function(message, source, lineno, colno, err){
  dbg('JS ERROR: '+message, {source:source, lineno:lineno, colno:colno, stack:err&&err.stack});
};

window.onunhandledrejection = function(ev){
  dbg('PROMISE ERROR', String(ev&&ev.reason?ev.reason:ev));
};

/* ===== HELPERS ===== */
function $(s){return document.querySelector(s)}
function $$(s){return document.querySelectorAll(s)}
function esc(s){return(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;')}

/* ===== THEME ===== */
/* FIX 3: tema auto/manual — segue sistema por padrão, botão alterna manual, duplo-clique reseta pro auto */
function applyTheme(t){document.documentElement.setAttribute('data-theme',t);var b=$('#btnTheme');if(b){var isAuto=!localStorage.getItem('432up_admin_theme');b.textContent=t==='dark'?(isAuto?'🌗':'☀️'):(isAuto?'🌗':'🌙')}}
function initTheme(){var s=localStorage.getItem('432up_admin_theme');if(s){applyTheme(s)}else{applyTheme(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(e){if(!localStorage.getItem('432up_admin_theme'))applyTheme(e.matches?'dark':'light')})}}
function toggleTheme(){var s=localStorage.getItem('432up_admin_theme');if(!s){var cur=document.documentElement.getAttribute('data-theme')||'dark';localStorage.setItem('432up_admin_theme',cur==='dark'?'light':'dark');applyTheme(cur==='dark'?'light':'dark');toast('Tema manual','info')}else{var c=document.documentElement.getAttribute('data-theme')||'dark';var n=c==='dark'?'light':'dark';localStorage.setItem('432up_admin_theme',n);applyTheme(n)}}
function resetThemeAuto(){localStorage.removeItem('432up_admin_theme');applyTheme(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');toast('Tema automático (sistema)','info')}

/* ===== TOAST ===== */
function toast(msg,type){var t=document.createElement('div');t.className='toast '+(type||'info');t.textContent=msg;$('#toastBox').appendChild(t);setTimeout(function(){t.remove()},3200)}

/* ===== BTN STATE ===== */
function btnState(btn,state){if(!btn)return;if(state==='saving'){btn.disabled=true;btn.classList.add('saving');btn.classList.remove('saved');btn.textContent='Salvando...'}else if(state==='saved'){btn.disabled=false;btn.classList.remove('saving');btn.classList.add('saved');btn.textContent='Salvo ✓';setTimeout(function(){btn.classList.remove('saved');btn.textContent=btn.dataset.label||'Salvar'},2000)}else if(state==='error'){btn.disabled=false;btn.classList.remove('saving','saved');btn.textContent='Erro ✗';setTimeout(function(){btn.textContent=btn.dataset.label||'Salvar'},2500)}else{btn.disabled=false;btn.classList.remove('saving','saved');btn.textContent=btn.dataset.label||'Salvar'}}

/* ===== CONFIRM ===== */
function confirmShow(msg,cb){$('#confirmMsg').textContent=msg;_confirmCb=cb;$('#confirmDlg').style.display='flex'}
function confirmClose(yes){$('#confirmDlg').style.display='none';if(_confirmCb)_confirmCb(yes);_confirmCb=null}

/* ===== SUPABASE ===== */
function sbH(m){var h={'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':'application/json'};if(m==='PATCH'||m==='POST')h['Prefer']='return=representation';return h}
/*function sbH(m){var h={'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':'application/json'};if(m==='PATCH'||m==='POST')h['Prefer']='return=representation';return h}
/* function sbH(m){var h={'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':'application/json'};if(m==='PATCH')h['Prefer']='return=minimal';else if(m==='POST')h['Prefer']='return=representation';return h}*/

/* v2.6: console.error → dbg() em todos os helpers Supabase */
async function sbGet(table,qs){try{var r=await fetch(SB+'/rest/v1/'+table+'?'+qs,{headers:{'apikey':SK,'Authorization':'Bearer '+SK}});if(!r.ok)throw r;return await r.json()}catch(e){dbg('sbGet ERRO ['+table+']',{status:e.status,msg:e.message});return null}}
async function sbPatch(table,id,body){try{var r=await fetch(SB+'/rest/v1/'+table+'?id=eq.'+id,{method:'PATCH',headers:sbH('PATCH'),body:JSON.stringify(body)});if(!r.ok){var txt=await r.text();dbg('sbPatch FAIL ['+table+' id='+id+']',{status:r.status,body:txt});return false}return true}catch(e){dbg('sbPatch ERRO ['+table+']',{msg:e.message});return false}}
async function sbPost(table,body){try{var r=await fetch(SB+'/rest/v1/'+table,{method:'POST',headers:sbH('POST'),body:JSON.stringify(body)});if(!r.ok){var txt=await r.text();dbg('sbPost FAIL ['+table+']',{status:r.status,body:txt});return null}return await r.json()}catch(e){dbg('sbPost ERRO ['+table+']',{msg:e.message});return null}}
async function sbDel(table,id){try{var r=await fetch(SB+'/rest/v1/'+table+'?id=eq.'+id,{method:'DELETE',headers:{'apikey':SK,'Authorization':'Bearer '+SK}});return r.ok}catch(e){dbg('sbDel ERRO ['+table+']',{msg:e.message});return false}}
async function sbUpload(path,file){try{var r=await fetch(SB+'/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers:{'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':file.type,'x-upsert':'true'},body:file});return r.ok}catch(e){return false}}
function sbPublicUrl(path){return SB+'/storage/v1/object/public/'+BUCKET+'/'+path}

/* ===== TABS ===== */

$$('.nav button').forEach(function(b){b.addEventListener('click',function(){$$('.nav button').forEach(function(x){x.classList.remove('active')});b.classList.add('active');$$('.panel').forEach(function(p){p.classList.remove('active')});$('#p-'+b.dataset.tab).classList.add('active')})});


$$('.btn-save').forEach(function(b){b.dataset.label=b.textContent});

/* ===== YOUTUBE HELPERS ===== */
function ytId(url){if(!url)return'';var m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);return m?m[1]:''}
function ytThumb(url){var id=ytId(url);return id?'https://img.youtube.com/vi/'+id+'/hqdefault.jpg':''}

/* ===== SECTION NAMES ===== */
var SEC_NAMES={urgencia:'🔔 Urgência',hero:'🏠 Hero',strip:'📜 Strip',dor:'😰 Dor',como:'🔢 Como Funciona',servicos:'🎧 Serviços',numeros:'📊 Números',galeria:'📷 Galeria',pacotes:'📦 Pacotes',depoimentos:'💬 Depoimentos',faq:'❓ FAQ',contato:'📱 Contato'};

/* LINHA ANTIGA: var VISUAL_DEFAULTS={...,tema_ativo:'gloomvale',...}; */
/* PATCH TEMA — padrão alterado de 'gloomvale' para 'auto' (segue sistema do visitante) */
var VISUAL_DEFAULTS={glass_opacity:0.82,glass_blur:16,bpm_global:74,orbs_intensity:50,particles_density:50,tide_speed:1.0,tide_amplitude:50,motion_enabled:true,layer_aurora:true,layer_algae:true,layer_particles:true,cta_pulse_enabled:true,tema_ativo:'auto',hero_text_anim:'breathe',motion_level:'normal'};

/* =============================================== */
/* ===== RENDER FUNCTIONS ===== */
/* =============================================== */

function renderVisual(){
  var v=DATA.config;if(!v)return;
  $('#vGlass').value=Math.round((v.glass_opacity||.82)*100);$('#vGlassVal').textContent=Math.round((v.glass_opacity||.82)*100)+'%';
  $('#vBlur').value=v.glass_blur||16;$('#vBlurVal').textContent=(v.glass_blur||16)+'px';
  $('#vBpm').value=v.bpm_global||74;$('#vBpmVal').textContent=v.bpm_global||74;
  $('#vOrbs').value=v.orbs_intensity||50;$('#vOrbsVal').textContent=(v.orbs_intensity||50)+'%';
  $('#vPart').value=v.particles_density||50;$('#vPartVal').textContent=(v.particles_density||50)+'%';
  $('#vTide').value=Math.round((v.tide_speed||1)*10);$('#vTideVal').textContent=(v.tide_speed||1).toFixed(1);
  $('#vAmp').value=v.tide_amplitude||50;$('#vAmpVal').textContent=(v.tide_amplitude||50)+'%';
  $('#vMotion').checked=v.motion_enabled!==false;
  $('#vAurora').checked=v.layer_aurora!==false;
  $('#vAlgae').checked=v.layer_algae!==false;
  $('#vParticlesOn').checked=v.layer_particles!==false;
  $('#vCta').checked=v.cta_pulse_enabled!==false;
  /* LINHA ANTIGA: $('#vTema').value=v.tema_ativo||'gloomvale'; */
  /* PATCH TEMA — fallback alterado de 'gloomvale' para 'auto' */
  $('#vTema').value=v.tema_ativo||'auto';
  $('#vHeroAnim').value=v.hero_text_anim||'breathe';
  $('#vMotionLevel').value=v.motion_level||'normal';
  if(v.depoimentos_max_home)$('#depMaxHome').value=v.depoimentos_max_home;
  if(v.faq_max_home)$('#faqMaxHome').value=v.faq_max_home;
}

/* =============================================== */
/* ===== ANIMAÇÕES — v2.4 NOVO ===== */
/* NOTA TÉCNICA: renderAnimacoes e saveAnimacoes usam fetch direto nas colunas diretas
   de co_configuracoes. Não usam DATA.config (que só contém o JSONB 'valor'). */
/* =============================================== */

async function renderAnimacoes(){
  /* LINHA NOVA: fetch nas colunas diretas — separado de DATA.config */
  /* v2.5: SELECT expandido com 19 novos campos de camadas por página */
  try{
    var r=await fetch(SB+'/rest/v1/co_configuracoes?id=eq.1&select=aurora_opacity,fog_opacity,carousel_home_speed,carousel_home_autoplay,carousel_home_pause_hover,carousel_home_transition,carousel_home_max_items,carousel_home_fx,carousel_gallery_speed,carousel_gallery_autoplay,carousel_gallery_pause_hover,carousel_gallery_transition,carousel_gallery_max_items,carousel_gallery_fx,masonry_columns_mobile,masonry_columns_tablet,masonry_columns_desktop,masonry_gap,masonry_entry_animation,calc_tema,calc_motion,home_herdar_camadas,home_layer_motion,home_layer_aurora,home_layer_algae,home_layer_particles,home_layer_cta,gal_herdar_camadas,gal_layer_motion,gal_layer_aurora,gal_layer_algae,gal_layer_particles,gal_layer_cta,galeria_carrossel_ativo,calc_herdar_camadas,calc_layer_motion,calc_layer_aurora,calc_layer_algae,calc_layer_particles,calc_layer_cta',{headers:{'apikey':SK,'Authorization':'Bearer '+SK}});
    /* v2.6: dbg() no erro de fetch */
    if(!r.ok){dbg('renderAnimacoes fetch FAIL',{status:r.status,statusText:r.statusText});throw r;}
    var rows=await r.json();
    var c=rows&&rows[0]?rows[0]:{};
    dbg('renderAnimacoes OK',{rows:rows.length,keys:Object.keys(c).length});
    if($('#vAuroraOpacity')){$('#vAuroraOpacity').value=c.aurora_opacity!=null?c.aurora_opacity:0.6;$('#vAuroraOpacityVal').textContent=c.aurora_opacity!=null?c.aurora_opacity:0.6}
    if($('#vFogOpacity')){$('#vFogOpacity').value=c.fog_opacity!=null?c.fog_opacity:0.4;$('#vFogOpacityVal').textContent=c.fog_opacity!=null?c.fog_opacity:0.4}
    if($('#vChSpeed')){$('#vChSpeed').value=c.carousel_home_speed||4000;$('#vChSpeedVal').textContent=c.carousel_home_speed||4000}
    if($('#vChMax')){$('#vChMax').value=c.carousel_home_max_items||10;$('#vChMaxVal').textContent=c.carousel_home_max_items||10}
    if($('#vChTransition'))$('#vChTransition').value=c.carousel_home_transition||'slide';
    if($('#vChFx'))$('#vChFx').value=c.carousel_home_fx||'fx-zoom';
    if($('#vChAutoplay'))$('#vChAutoplay').checked=c.carousel_home_autoplay!==false;
    if($('#vChPauseHover'))$('#vChPauseHover').checked=c.carousel_home_pause_hover!==false;
    if($('#vCgSpeed')){$('#vCgSpeed').value=c.carousel_gallery_speed||4000;$('#vCgSpeedVal').textContent=c.carousel_gallery_speed||4000}
    if($('#vCgMax')){$('#vCgMax').value=c.carousel_gallery_max_items||12;$('#vCgMaxVal').textContent=c.carousel_gallery_max_items||12}
    if($('#vCgTransition'))$('#vCgTransition').value=c.carousel_gallery_transition||'slide';
    if($('#vCgFx'))$('#vCgFx').value=c.carousel_gallery_fx||'fx-slide-up';
    if($('#vCgAutoplay'))$('#vCgAutoplay').checked=c.carousel_gallery_autoplay!==false;
    if($('#vCgPauseHover'))$('#vCgPauseHover').checked=c.carousel_gallery_pause_hover!==false;
    if($('#vMasonMob')){$('#vMasonMob').value=c.masonry_columns_mobile||1;$('#vMasonMobVal').textContent=c.masonry_columns_mobile||1}
    if($('#vMasonTab')){$('#vMasonTab').value=c.masonry_columns_tablet||2;$('#vMasonTabVal').textContent=c.masonry_columns_tablet||2}
    if($('#vMasonDesk')){$('#vMasonDesk').value=c.masonry_columns_desktop||3;$('#vMasonDeskVal').textContent=c.masonry_columns_desktop||3}
    if($('#vMasonGap')){$('#vMasonGap').value=c.masonry_gap!=null?c.masonry_gap:16;$('#vMasonGapVal').textContent=c.masonry_gap!=null?c.masonry_gap:16}
    if($('#vMasonFx'))$('#vMasonFx').value=c.masonry_entry_animation||'fx-fade';
    if($('#vCalcTema'))$('#vCalcTema').value=c.calc_tema||'auto';
    if($('#vCalcMotion'))$('#vCalcMotion').checked=c.calc_motion!==false;
    /* v2.5: populate 19 novos campos */
    var homeHerdar=c.home_herdar_camadas!==false;
    if($('#vHomeHerdar')){$('#vHomeHerdar').checked=homeHerdar;var hc=$('#vHomeCamadas');if(hc)hc.style.display=homeHerdar?'none':''}
    if($('#vHomeMotion'))$('#vHomeMotion').checked=c.home_layer_motion!==false;
    if($('#vHomeAurora'))$('#vHomeAurora').checked=c.home_layer_aurora!==false;
    if($('#vHomeAlgae'))$('#vHomeAlgae').checked=c.home_layer_algae!==false;
    if($('#vHomeParticles'))$('#vHomeParticles').checked=c.home_layer_particles!==false;
    if($('#vHomeCta'))$('#vHomeCta').checked=c.home_layer_cta!==false;
    var galHerdar=c.gal_herdar_camadas!==false;
    if($('#vGalHerdar')){$('#vGalHerdar').checked=galHerdar;var gc=$('#vGalCamadas');if(gc)gc.style.display=galHerdar?'none':''}
    if($('#vGalMotion'))$('#vGalMotion').checked=c.gal_layer_motion!==false;
    if($('#vGalAurora'))$('#vGalAurora').checked=c.gal_layer_aurora!==false;
    if($('#vGalAlgae'))$('#vGalAlgae').checked=c.gal_layer_algae!==false;
    if($('#vGalParticles'))$('#vGalParticles').checked=c.gal_layer_particles!==false;
    if($('#vGalCta'))$('#vGalCta').checked=c.gal_layer_cta!==false;
    if($('#vGalCarrossel'))$('#vGalCarrossel').checked=c.galeria_carrossel_ativo!==false;
    var calcHerdar=c.calc_herdar_camadas!==false;
    if($('#vCalcHerdar')){$('#vCalcHerdar').checked=calcHerdar;var cc=$('#vCalcCamadas');if(cc)cc.style.display=calcHerdar?'none':''}
    if($('#vCalcMotion2'))$('#vCalcMotion2').checked=c.calc_layer_motion!==false;
    if($('#vCalcAurora'))$('#vCalcAurora').checked=c.calc_layer_aurora!==false;
    if($('#vCalcAlgae'))$('#vCalcAlgae').checked=c.calc_layer_algae!==false;
    if($('#vCalcParticles'))$('#vCalcParticles').checked=c.calc_layer_particles!==false;
    if($('#vCalcCta'))$('#vCalcCta').checked=c.calc_layer_cta!==false;
  /* v2.6: catch com dbg() detalhado */
  }catch(e){dbg('renderAnimacoes ERRO',{msg:e.message,status:e.status,statusText:e.statusText});toast('Erro ao carregar animações','err')}
}

async function saveAnimacoes(btn){
  /* LINHA NOVA: salva colunas diretas — separado do JSONB 'valor' */
  /* v2.5: payload expandido com 19 novos campos de camadas por página */
  btnState(btn,'saving');
  var payload={
    aurora_opacity:              parseFloat($('#vAuroraOpacity')&&$('#vAuroraOpacity').value||0.6),
    fog_opacity:                 parseFloat($('#vFogOpacity')&&$('#vFogOpacity').value||0.4),
    carousel_home_speed:         parseInt($('#vChSpeed')&&$('#vChSpeed').value||4000),
    carousel_home_max_items:     parseInt($('#vChMax')&&$('#vChMax').value||10),
    carousel_home_transition:    $('#vChTransition')&&$('#vChTransition').value||'slide',
    carousel_home_fx:            $('#vChFx')&&$('#vChFx').value||'fx-zoom',
    carousel_home_autoplay:      !!($('#vChAutoplay')&&$('#vChAutoplay').checked),
    carousel_home_pause_hover:   !!($('#vChPauseHover')&&$('#vChPauseHover').checked),
    carousel_gallery_speed:      parseInt($('#vCgSpeed')&&$('#vCgSpeed').value||4000),
    carousel_gallery_max_items:  parseInt($('#vCgMax')&&$('#vCgMax').value||12),
    carousel_gallery_transition: $('#vCgTransition')&&$('#vCgTransition').value||'slide',
    carousel_gallery_fx:         $('#vCgFx')&&$('#vCgFx').value||'fx-slide-up',
    carousel_gallery_autoplay:   !!($('#vCgAutoplay')&&$('#vCgAutoplay').checked),
    carousel_gallery_pause_hover:!!($('#vCgPauseHover')&&$('#vCgPauseHover').checked),
    masonry_columns_mobile:      parseInt($('#vMasonMob')&&$('#vMasonMob').value||1),
    masonry_columns_tablet:      parseInt($('#vMasonTab')&&$('#vMasonTab').value||2),
    masonry_columns_desktop:     parseInt($('#vMasonDesk')&&$('#vMasonDesk').value||3),
    masonry_gap:                 parseInt($('#vMasonGap')&&$('#vMasonGap').value||16),
    masonry_entry_animation:     $('#vMasonFx')&&$('#vMasonFx').value||'fx-fade',
    calc_tema:                   $('#vCalcTema')&&$('#vCalcTema').value||'auto',
    calc_motion:                 !!($('#vCalcMotion')&&$('#vCalcMotion').checked),
    home_herdar_camadas:         !!($('#vHomeHerdar')&&$('#vHomeHerdar').checked),
    home_layer_motion:           !!($('#vHomeMotion')&&$('#vHomeMotion').checked),
    home_layer_aurora:           !!($('#vHomeAurora')&&$('#vHomeAurora').checked),
    home_layer_algae:            !!($('#vHomeAlgae')&&$('#vHomeAlgae').checked),
    home_layer_particles:        !!($('#vHomeParticles')&&$('#vHomeParticles').checked),
    home_layer_cta:              !!($('#vHomeCta')&&$('#vHomeCta').checked),
    gal_herdar_camadas:          !!($('#vGalHerdar')&&$('#vGalHerdar').checked),
    gal_layer_motion:            !!($('#vGalMotion')&&$('#vGalMotion').checked),
    gal_layer_aurora:            !!($('#vGalAurora')&&$('#vGalAurora').checked),
    gal_layer_algae:             !!($('#vGalAlgae')&&$('#vGalAlgae').checked),
    gal_layer_particles:         !!($('#vGalParticles')&&$('#vGalParticles').checked),
    gal_layer_cta:               !!($('#vGalCta')&&$('#vGalCta').checked),
    galeria_carrossel_ativo:     !!($('#vGalCarrossel')&&$('#vGalCarrossel').checked),
    calc_herdar_camadas:         !!($('#vCalcHerdar')&&$('#vCalcHerdar').checked),
    calc_layer_motion:           !!($('#vCalcMotion2')&&$('#vCalcMotion2').checked),
    calc_layer_aurora:           !!($('#vCalcAurora')&&$('#vCalcAurora').checked),
    calc_layer_algae:            !!($('#vCalcAlgae')&&$('#vCalcAlgae').checked),
    calc_layer_particles:        !!($('#vCalcParticles')&&$('#vCalcParticles').checked),
    calc_layer_cta:              !!($('#vCalcCta')&&$('#vCalcCta').checked)
  };
  try{
    var r=await fetch(SB+'/rest/v1/co_configuracoes?id=eq.1',{method:'PATCH',headers:{'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
    if(r.ok){toast('Animações salvas!','ok');btnState(btn,'saved');markSaved()}
    else{
      /* v2.6: dbg() no erro de PATCH */
      var txt=await r.text();
      dbg('saveAnimacoes PATCH FAIL',{status:r.status,body:txt});
      toast('Erro ao salvar animações','err');btnState(btn,'error')
    }
  /* v2.6: catch com dbg() */
  }catch(e){dbg('saveAnimacoes ERRO',{msg:e.message});toast('Erro ao salvar animações','err');btnState(btn,'error')}
}

/* =============================================== */
/* ===== FIM ANIMAÇÕES ===== */
/* =============================================== */

/* CHANGED — Alteração 1: renderSecoes com card simplificado para strip */
function renderSecoes(){
  var c=$('#secoesContainer');c.innerHTML='';
  DATA.secoes.forEach(function(s){
    var name=SEC_NAMES[s.tipo]||s.tipo;var vis=s.visivel!==false;
    if(s.tipo==='strip'){
      c.innerHTML+='<div class="sec-block" data-id="'+s.id+'" data-table="co_secoes"><div class="sec-tag"><span class="dot'+(vis?'':' off')+'"></span> '+name+'</div><div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(vis?'checked':'')+' data-field="visivel"><span class="track"></span><span class="thumb"></span></label><span>Visível</span></div><div class="field"><label>Texto da faixa</label><input data-field="titulo" value="'+esc(s.titulo)+'" placeholder="Item 1 + Item 2 + Item 3"></div><div class="field-row"><div class="field"><label>Ordem</label><input type="number" data-field="ordem" value="'+(s.ordem||0)+'"></div><div class="field"><label>Tipo (sistema)</label><input value="'+s.tipo+'" disabled style="opacity:.5"></div></div></div>';
    }else{
      c.innerHTML+='<div class="sec-block" data-id="'+s.id+'" data-table="co_secoes"><div class="sec-tag"><span class="dot'+(vis?'':' off')+'"></span> '+name+'</div><div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(vis?'checked':'')+' data-field="visivel"><span class="track"></span><span class="thumb"></span></label><span>Visível</span></div><div class="field"><label>Título</label><input data-field="titulo" value="'+esc(s.titulo)+'"></div><div class="field"><label>Subtítulo</label><textarea data-field="subtitulo">'+(s.subtitulo||'')+'</textarea></div><div class="field-row"><div class="field"><label>Ordem</label><input type="number" data-field="ordem" value="'+(s.ordem||0)+'"></div><div class="field"><label>Tipo (sistema)</label><input value="'+s.tipo+'" disabled style="opacity:.5"></div></div></div>';
    }
  });
}

/* CHANGED — Alteração 3: renderServicos com editor visual de faixas */
function renderServicos(){
  var c=$('#servicosContainer');c.innerHTML='';
  DATA.servicos.forEach(function(s,i){
    var faixas=[];
    if(s.faixas){var fa=typeof s.faixas==='string'?JSON.parse(s.faixas):s.faixas;if(Array.isArray(fa))faixas=fa}
    var faixasHtml='<div class="faixas-editor" data-srv-id="'+s.id+'">';
    faixas.forEach(function(fx,fi){
      faixasHtml+='<div class="faixa-row" data-faixa-idx="'+fi+'"><label>Até</label><input type="number" class="faixa-ate" value="'+(fx.ate||fx.max||0)+'" placeholder="pessoas"> <label>pessoas → R$</label><input type="number" step="0.01" class="faixa-valor" value="'+(fx.valor||0)+'" placeholder="valor"><button type="button" class="btn-danger btn-sm" onclick="removeFaixa(this)">✕</button></div>';
    });
    faixasHtml+='<button type="button" class="btn-sm" onclick="addFaixa(this)">+ Faixa</button></div>';

    c.innerHTML+='<div class="item-card" data-id="'+s.id+'" data-table="co_calculadora_valores"><div class="item-header"><h3>'+esc(s.icone||'')+' '+esc(s.nome_exibicao||s.nome)+'</h3><div class="item-actions"><span class="item-num">#'+(i+1)+'</span><button class="btn-danger" onclick="removeItem(\'co_calculadora_valores\','+s.id+',this)">Remover</button></div></div>'
    +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(s.ativo!==false?'checked':'')+' data-field="ativo"><span class="track"></span><span class="thumb"></span></label><span>Ativo</span></div>'
    +'<div class="srv-section"><div class="srv-section-title">📱 Visual (Home)</div>'
    +'<div class="field-row"><div class="field"><label>Ícone</label><input data-field="icone" value="'+esc(s.icone)+'"></div><div class="field"><label>Nome exibição</label><input data-field="nome_exibicao" value="'+esc(s.nome_exibicao)+'"></div></div>'
    +'<div class="field"><label>Descrição (site)</label><textarea data-field="descricao">'+(s.descricao||'')+'</textarea></div></div>'
    +'<div class="srv-section"><div class="srv-section-title">💰 Financeiro (Calculadora)</div>'
    +'<div class="field-row"><div class="field"><label>ID interno</label><input data-field="servico_id" value="'+esc(s.servico_id)+'" style="opacity:.7"></div><div class="field"><label>Nome interno</label><input data-field="nome" value="'+esc(s.nome)+'"></div></div>'
    +'<div class="field-row"><div class="field"><label>Preço base (R$)</label><input type="number" step="0.01" data-field="valor_base" value="'+(s.valor_base||0)+'"></div><div class="field"><label>Hora extra (R$)</label><input type="number" step="0.01" data-field="valor_por_hora" value="'+(s.valor_por_hora||0)+'"></div></div>'
    +'<div class="field-row"><div class="field"><label>Valor por pessoa (R$)</label><input type="number" step="0.01" data-field="valor_por_pessoa" value="'+(s.valor_por_pessoa||0)+'"></div><div class="field"><label>Ordem</label><input type="number" data-field="ordem" value="'+(s.ordem||0)+'"></div></div>'
    +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(s.calc_por_hora?'checked':'')+' data-field="calc_por_hora"><span class="track"></span><span class="thumb"></span></label><span>Calcular por hora</span></div>'
    +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(s.calc_por_pessoa?'checked':'')+' data-field="calc_por_pessoa"><span class="track"></span><span class="thumb"></span></label><span>Calcular por pessoa (faixas)</span></div>'
    +'<div class="field"><label>Faixas por pessoa</label>'+faixasHtml+'</div></div></div>';
  });
}

/* ====== SERVIÇOS DO PACOTE (UI bonita) ====== */
function pkgSyncServicesFromCard(card){
  try{
    if(!card)return;
    var hidden=card.querySelector('input[type="hidden"][data-field="servicos_ids"]');
    if(!hidden)return;
    var arr=[];
    card.querySelectorAll('input[type="checkbox"][data-srv-pick="1"]:checked').forEach(function(chk){
      var v=(chk.value||'').trim().toLowerCase();
      if(v)arr.push(v);
    });
    hidden.value=JSON.stringify(arr);

    var countEl=card.querySelector('[data-srv-count]');
    if(countEl)countEl.textContent=String(arr.length);
  }catch(e){}
}
function pkgSrvChanged(el){
  try{
    var card=el.closest('.item-card');
    pkgSyncServicesFromCard(card);
  }catch(e){}
}

function renderPacotes(){
  var c=$('#pacotesContainer');c.innerHTML='';

  var srvList=(DATA.servicos||[]).slice().filter(function(s){return s && s.ativo!==false});
  srvList.sort(function(a,b){return (a.ordem||0)-(b.ordem||0)});

  function parseJsonArray(v){
    if(Array.isArray(v))return v;
    if(typeof v==='string'){
      try{
        var p=JSON.parse(v);
        return Array.isArray(p)?p:[];
      }catch(e){return []}
    }
    return [];
  }

  DATA.pacotes.forEach(function(p,i){
    var itensArr=parseJsonArray(p.itens||[]);
    var itensStr=itensArr.join('\n');

    var servArr=parseJsonArray(p.servicos_ids||[]);
    servArr=servArr.map(function(x){return String(x).toLowerCase().trim()}).filter(function(x){return x});

    var servSet={};
    servArr.forEach(function(x){servSet[x]=1});

    var saving=p.preco_original?Math.round((1-p.preco_pacote/p.preco_original)*100):0;

    var srvChips='';
    if(!srvList.length){
      srvChips='<div style="color:var(--fg2);font-size:.82rem;padding:10px;border:1px dashed var(--glass-border);border-radius:10px">Nenhum serviço ativo encontrado. Vá na aba Serviços e verifique <b>ativo</b> e <b>servico_id</b>.</div>';
    }else{
      srvChips+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:8px">';
      srvList.forEach(function(s){
        var sid=String(s.servico_id||'').toLowerCase().trim();
        if(!sid)return;
        var label=(s.icone||'')+' '+(s.nome_exibicao||s.nome||sid);
        var checked=!!servSet[sid];
        srvChips+=''
          +'<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid '+(checked?'var(--accent)':'var(--glass-border)')+';background:'+(checked?'rgba(139,92,246,.10)':'rgba(255,255,255,.02)')+';border-radius:12px;cursor:pointer;user-select:none;transition:.15s">'
            +'<input type="checkbox" data-srv-pick="1" value="'+esc(sid)+'" '+(checked?'checked':'')+' onchange="pkgSrvChanged(this)" style="width:18px;height:18px;accent-color:var(--accent)">'
            +'<span style="font-weight:600;font-size:.88rem">'+esc(label)+'</span>'
          +'</label>';
      });
      srvChips+='</div>';
    }

    c.innerHTML+=''
      +'<div class="item-card" data-id="'+p.id+'" data-table="co_calc_pacotes" style="border-color:'+(p.destaque?'var(--accent)':'var(--glass-border)')+'">'
        +'<div class="item-header">'
          +'<h3>'+esc(p.nome)+(p.destaque?' ⭐':'')+(saving>0?' <span style="color:var(--green);font-size:.75rem">-'+saving+'%</span>':'')+'</h3>'
          +'<div class="item-actions"><span class="item-num">#'+(i+1)+'</span><button class="btn-danger" onclick="removeItem(\'co_calc_pacotes\','+p.id+',this)">Remover</button></div>'
        +'</div>'
        +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(p.ativo!==false?'checked':'')+' data-field="ativo"><span class="track"></span><span class="thumb"></span></label><span>Ativo</span></div>'
        +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(p.destaque?'checked':'')+' data-field="destaque"><span class="track"></span><span class="thumb"></span></label><span>Destaque — "Mais popular"</span></div>'
        +'<div class="field"><label>Nome</label><input data-field="nome" value="'+esc(p.nome)+'"></div>'
        +'<div class="field-row"><div class="field"><label>Preço pacote (R$)</label><input type="number" step="0.01" data-field="preco_pacote" value="'+(p.preco_pacote||0)+'"></div><div class="field"><label>Preço original (R$)</label><input type="number" step="0.01" data-field="preco_original" value="'+(p.preco_original||0)+'"></div></div>'
        +'<div class="field-row"><div class="field"><label>Horas inclusas</label><input type="number" data-field="horas_inclusas" value="'+(p.horas_inclusas||0)+'"></div><div class="field"><label>Ideal para</label><input data-field="ideal_para" value="'+esc(p.ideal_para)+'"></div></div>'
        +'<div class="field"><label>Itens (um por linha)</label><textarea data-field="itens" rows="4">'+itensStr+'</textarea></div>'
        +'<div class="field">'
          +'<label>Serviços incluídos (calculadora)</label>'
          +'<input type="hidden" data-field="servicos_ids" value="'+esc(JSON.stringify(servArr))+'">'
          +srvChips
          +'<div style="color:var(--fg2);font-size:.78rem;margin-top:8px">Selecionados: <b data-srv-count>'+servArr.length+'</b></div>'
        +'</div>'
        +'<div class="field"><label>Ordem</label><input type="number" data-field="ordem" value="'+(p.ordem||0)+'"></div>'
      +'</div>';
  });


  $$('#pacotesContainer .item-card').forEach(function(card){
    pkgSyncServicesFromCard(card);
  });
}

function renderDepoimentos(){
  var c=$('#depoimentosContainer');c.innerHTML='';
  DATA.depoimentos.forEach(function(d,i){
    c.innerHTML+='<div class="item-card" data-id="'+d.id+'" data-table="co_depoimentos"><div class="item-header"><h3>"'+esc((d.texto||'').substring(0,40))+'…"</h3><div class="item-actions"><span class="item-num">#'+(i+1)+'</span><button class="btn-danger" onclick="removeItem(\'co_depoimentos\','+d.id+',this)">Remover</button></div></div>'
    +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(d.ativo!==false?'checked':'')+' data-field="ativo"><span class="track"></span><span class="thumb"></span></label><span>Ativo</span></div>'
    +'<div class="field-row"><div class="field"><label>Nome</label><input data-field="nome" value="'+esc(d.nome)+'"></div><div class="field"><label>Cargo / Evento</label><input data-field="cargo" value="'+esc(d.cargo)+'"></div></div>'
    +'<div class="field"><label>Texto</label><textarea data-field="texto" rows="3">'+(d.texto||'')+'</textarea></div>'
    +'<div class="field-row"><div class="field"><label>Nota (1-5)</label><input type="number" min="1" max="5" data-field="nota" value="'+(d.nota||5)+'"></div><div class="field"><label>Ordem</label><input type="number" data-field="ordem" value="'+(d.ordem||0)+'"></div></div></div>';
  });
}

function renderFaq(){
  var c=$('#faqContainer');c.innerHTML='';
  DATA.faq.forEach(function(f,i){
    c.innerHTML+='<div class="item-card" data-id="'+f.id+'" data-table="co_faq"><div class="item-header"><h3>'+esc((f.pergunta||'').substring(0,50))+'</h3><div class="item-actions"><span class="item-num">#'+(i+1)+'</span><button class="btn-danger" onclick="removeItem(\'co_faq\','+f.id+',this)">Remover</button></div></div>'
    +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(f.ativo!==false?'checked':'')+' data-field="ativo"><span class="track"></span><span class="thumb"></span></label><span>Ativo</span></div>'
    +'<div class="field"><label>Pergunta</label><input data-field="pergunta" value="'+esc(f.pergunta)+'"></div>'
    +'<div class="field"><label>Resposta</label><textarea data-field="resposta" rows="3">'+(f.resposta||'')+'</textarea></div>'
    +'<div class="field"><label>Ordem</label><input type="number" data-field="ordem" value="'+(f.ordem||0)+'"></div></div>';
  });
}

/* ===== GALERIA RENDER ===== */
function renderGaleria(){
  buildGalCatSelect();
  renderGalCatManager();
  renderGalList();
  $('#galCount').textContent=DATA.galFotos.length;
}

function buildGalCatSelect(){
  var sel=$('#galCat');if(!sel)return;sel.innerHTML='';
  DATA.galCats.forEach(function(c){sel.innerHTML+='<option value="'+c.slug+'">'+c.emoji+' '+c.nome+'</option>'});
}

function buildGalCatOptions(selected){
  var h='';DATA.galCats.forEach(function(c){h+='<option value="'+c.slug+'"'+(c.slug===selected?' selected':'')+'>'+c.emoji+' '+c.nome+'</option>'});return h;
}

function renderGalCatManager(){
  var list=$('#galCatList');list.innerHTML='';
  DATA.galCats.forEach(function(c){
    var tag=document.createElement('span');tag.className='cat-tag';
    tag.innerHTML=(c.emoji||'')+' '+c.nome+' <button class="cat-del" onclick="galDelCat(\''+c.id+'\')">\u00D7</button>';
    list.appendChild(tag);
  });
}

function renderGalList(){
  var list=$('#galListContainer');list.innerHTML='';
  if(!DATA.galFotos.length){list.innerHTML='<p style="color:var(--fg2);text-align:center;padding:20px">Nenhuma mídia publicada.</p>';return}
  DATA.galFotos.forEach(function(f){
    var isVid=(f.tipo==='video'||f.tipo==='video_yt'||f.tipo==='video_up');
    var thumbSrc=isVid?(f.tipo==='video_up'?(f.url_thumb||f.url):ytThumb(f.video_url)):(f.url_thumb||f.url);
    var div=document.createElement('div');div.className='gal-item';
    div.innerHTML='<img src="'+(thumbSrc||'')+'" alt="" onerror="this.style.background=\'var(--bg3)\'">'
      +'<div class="gal-item-info">'
        +'<input value="'+esc(f.titulo)+'" placeholder="Título" onchange="galEditField(\''+f.id+'\',\'titulo\',this.value)">'
        +'<div style="display:flex;gap:6px"><select onchange="galEditField(\''+f.id+'\',\'cat\',this.value)">'+buildGalCatOptions(f.cat)+'</select>'
        +'<input value="'+esc(f.local||'')+'" placeholder="Local" onchange="galEditField(\''+f.id+'\',\'local\',this.value)"></div>'
      +'</div>'
      +'<div class="gal-item-actions">'
        +'<button class="'+(f.destaque?'dest-on':'')+'" onclick="galToggleDest(\''+f.id+'\','+f.destaque+')" title="Destaque">⭐</button>'
        +'<button onclick="galMover(\''+f.id+'\',-1)" title="Subir">▲</button>'
        +'<button onclick="galMover(\''+f.id+'\',1)" title="Descer">▼</button>'
        +'<button onclick="galDeletar(\''+f.id+'\')" title="Excluir">🗑</button>'
      +'</div>';
    list.appendChild(div);
  });
}

/* ===== LEADS RENDER ===== */
function renderLeads(){
  var c=$('#leadsContainer');
  var leads=getFilteredLeads();
  $('#leadsTotal').textContent=DATA.leads.length;
  if(!leads.length){c.innerHTML='<p style="color:var(--fg2);text-align:center;padding:40px 0">Nenhum lead encontrado.</p>';return}
  var h='';
  leads.forEach(function(l){
    var sel=selectedLeads[l.id]?'selected':'';
    var status=l.status||'novo';
    var waLink=l.whatsapp?'https://wa.me/'+l.whatsapp.replace(/\D/g,''):'';
    h+='<div class="lead-card '+sel+'" data-lead-id="'+l.id+'">'
      +'<div class="lead-top"><div class="lead-select"><input type="checkbox" '+(selectedLeads[l.id]?'checked':'')+' onchange="toggleLeadSelect(\''+l.id+'\',this.checked)"><span class="lead-name">'+(l.nome||'Sem nome')+'</span></div><span class="lead-date">'+(l.criado_em?new Date(l.criado_em).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'—')+'</span></div>'
      +'<div class="lead-meta">';
    if(l.whatsapp)h+='<span class="lead-tag wa" onclick="window.open(\''+waLink+'\',\'_blank\')">📱 '+esc(l.whatsapp)+'</span>';
    if(l.email)h+='<span class="lead-tag email">✉ '+esc(l.email)+'</span>';
    if(l.tipo_evento)h+='<span class="lead-tag">'+esc(l.tipo_evento)+'</span>';
    if(l.total)h+='<span class="lead-tag">💰 '+esc(l.total)+'</span>';
    if(l.origem)h+='<span class="lead-tag">📍 '+esc(l.origem)+'</span>';
    h+='</div>'
      +'<div class="lead-status"><label>Status:</label><select onchange="updateLeadField(\''+l.id+'\',\'status\',this.value)"><option value="novo"'+(status==='novo'?' selected':'')+'>🟡 Novo</option><option value="em_contato"'+(status==='em_contato'?' selected':'')+'>🔵 Em contato</option><option value="fechado"'+(status==='fechado'?' selected':'')+'>🟢 Fechado</option><option value="perdido"'+(status==='perdido'?' selected':'')+'>🔴 Perdido</option></select></div>';
    if(l.mensagem)h+='<div class="lead-msg">'+esc(l.mensagem).substring(0,300)+'</div>';
    h+='<div class="lead-notas"><div class="field"><label>Notas internas</label><textarea data-field="notas" onchange="updateLeadField(\''+l.id+'\',\'observacoes\',this.value)" rows="2" placeholder="Anotações sobre este lead...">'+(l.observacoes||'')+'</textarea></div></div></div>';
  });
  c.innerHTML=h;
}

/* CHANGED — Alteração 4: getFilteredLeads inclui tipo_evento na busca */
function getFilteredLeads(){
  var search=($('#leadSearch').value||'').toLowerCase();
  var status=$('#leadStatusFilter').value;
  var origem=$('#leadOrigemFilter').value;
  return DATA.leads.filter(function(l){
    if(search){var nm=(l.nome||'').toLowerCase();var wa=(l.whatsapp||'').toLowerCase();var te=(l.tipo_evento||'').toLowerCase();if(nm.indexOf(search)<0&&wa.indexOf(search)<0&&te.indexOf(search)<0)return false}
    if(status&&(l.status||'novo')!==status)return false;
    if(origem&&(l.origem||'')!==origem)return false;
    return true;
  });
}

/* ===== RENDER CONFIG ===== */
function renderConfig(){
  var v=DATA.config;
  $('#cfgNome').value=v.nome_site||'432UP Produções';
  $('#cfgWa').value=v.whatsapp||'5511948564577';
  $('#cfgInsta').value=v.instagram||'@432up.producoes';
  $('#cfgEmail').value=v.email||'contato@432up.com';
  $('#cfgDesc').value=v.descricao||'';
  $('#cfgWaMsg').value=v.wa_msg_fab||'Olá! Vi o site da 432UP e quero saber mais.';
  $('#cfgWaOrcamento').value=v.wa_msg_orcamento||'';
  $('#cfgWaGaleria').value=v.wa_msg_galeria||'Olá! Vi a galeria da 432UP e quero saber mais.';
  $('#cfgTxtPosEmail').value=v.txt_pos_email||'Deseja também falar no WhatsApp?';
  $('#cfgTxtBtnForm').value=v.txt_btn_form||'Garantir minha data';
  $('#cfgTxtUrgencia').value=v.txt_urgencia||'🎵 Sua data ainda está disponível — por enquanto.';
}

/* =============================================== */
/* ===== COLLECT & SAVE ===== */
/* =============================================== */

/* CHANGED — collectCard agora coleta faixas do editor visual */
function collectCard(card){
  var obj={};
  card.querySelectorAll('[data-field]').forEach(function(el){
    var f=el.dataset.field;
    if(f==='servicos_ids'){
      if(el.type==='hidden'){
        var raw=(el.value||'').trim();
        if(!raw){obj[f]=[]}
        else{
          try{
            var parsed=JSON.parse(raw);
            obj[f]=Array.isArray(parsed)?parsed:[];
          }catch(e){
            obj[f]=raw.split(',').map(function(x){return x.trim()}).filter(function(x){return x});
          }
        }
      }else{
        obj[f]=el.value;
      }
    }
    else if(el.type==='checkbox')obj[f]=el.checked;
    else if(el.type==='number')obj[f]=parseFloat(el.value)||0;
    else if(f==='itens')obj[f]=el.value.split('\n').filter(function(l){return l.trim()});
    else obj[f]=el.value;
  });

  var faixasEditor=card.querySelector('.faixas-editor');
  if(faixasEditor){
    var faixas=[];
    faixasEditor.querySelectorAll('.faixa-row').forEach(function(row){
      var ate=parseInt(row.querySelector('.faixa-ate').value)||0;
      var valor=parseFloat(row.querySelector('.faixa-valor').value)||0;
      if(ate>0)faixas.push({ate:ate,valor:valor});
    });
    obj.faixas=faixas;
  }
  return obj;
}

async function saveVisual(btn){
  btnState(btn,'saving');
  var v=Object.assign({},DATA.config);
  v.glass_opacity=parseInt($('#vGlass').value)/100;
  v.glass_blur=parseInt($('#vBlur').value);
  v.bpm_global=parseInt($('#vBpm').value);
  v.orbs_intensity=parseInt($('#vOrbs').value);
  v.particles_density=parseInt($('#vPart').value);
  v.tide_speed=parseInt($('#vTide').value)/10;
  v.tide_amplitude=parseInt($('#vAmp').value);
  v.motion_enabled=$('#vMotion').checked;
  v.layer_aurora=$('#vAurora').checked;
  v.layer_algae=$('#vAlgae').checked;
  v.layer_particles=$('#vParticlesOn').checked;
  v.cta_pulse_enabled=$('#vCta').checked;
  v.tema_ativo=$('#vTema').value;
  v.hero_text_anim=$('#vHeroAnim').value;
  v.motion_level=$('#vMotionLevel').value;
  /* v2.5: PATCH 1 — salva JSONB 'valor' (campos globais, igual antes) */
  var ok=await sbPatch('co_configuracoes',1,{valor:v,atualizado_em:new Date().toISOString()});
  if(!ok){toast('Erro ao salvar','err');btnState(btn,'error');return}
  DATA.config=v;
  /* v2.5: PATCH 2 — salva colunas diretas (aurora, fog, masonry, calc, home, gal, carrossel) */
  var directPayload={
    aurora_opacity:              parseFloat($('#vAuroraOpacity')&&$('#vAuroraOpacity').value||0.6),
    fog_opacity:                 parseFloat($('#vFogOpacity')&&$('#vFogOpacity').value||0.4),
    masonry_columns_mobile:      parseInt($('#vMasonMob')&&$('#vMasonMob').value||1),
    masonry_columns_tablet:      parseInt($('#vMasonTab')&&$('#vMasonTab').value||2),
    masonry_columns_desktop:     parseInt($('#vMasonDesk')&&$('#vMasonDesk').value||3),
    masonry_gap:                 parseInt($('#vMasonGap')&&$('#vMasonGap').value||16),
    masonry_entry_animation:     $('#vMasonFx')&&$('#vMasonFx').value||'fx-fade',
    calc_tema:                   $('#vCalcTema')&&$('#vCalcTema').value||'auto',
    calc_motion:                 !!($('#vCalcMotion')&&$('#vCalcMotion').checked),
    home_herdar_camadas:         !!($('#vHomeHerdar')&&$('#vHomeHerdar').checked),
    home_layer_motion:           !!($('#vHomeMotion')&&$('#vHomeMotion').checked),
    home_layer_aurora:           !!($('#vHomeAurora')&&$('#vHomeAurora').checked),
    home_layer_algae:            !!($('#vHomeAlgae')&&$('#vHomeAlgae').checked),
    home_layer_particles:        !!($('#vHomeParticles')&&$('#vHomeParticles').checked),
    home_layer_cta:              !!($('#vHomeCta')&&$('#vHomeCta').checked),
    gal_herdar_camadas:          !!($('#vGalHerdar')&&$('#vGalHerdar').checked),
    gal_layer_motion:            !!($('#vGalMotion')&&$('#vGalMotion').checked),
    gal_layer_aurora:            !!($('#vGalAurora')&&$('#vGalAurora').checked),
    gal_layer_algae:             !!($('#vGalAlgae')&&$('#vGalAlgae').checked),
    gal_layer_particles:         !!($('#vGalParticles')&&$('#vGalParticles').checked),
    gal_layer_cta:               !!($('#vGalCta')&&$('#vGalCta').checked),
    galeria_carrossel_ativo:     !!($('#vGalCarrossel')&&$('#vGalCarrossel').checked),
    calc_herdar_camadas:         !!($('#vCalcHerdar')&&$('#vCalcHerdar').checked),
    calc_layer_motion:           !!($('#vCalcMotion2')&&$('#vCalcMotion2').checked),
    calc_layer_aurora:           !!($('#vCalcAurora')&&$('#vCalcAurora').checked),
    calc_layer_algae:            !!($('#vCalcAlgae')&&$('#vCalcAlgae').checked),
    calc_layer_particles:        !!($('#vCalcParticles')&&$('#vCalcParticles').checked),
    calc_layer_cta:              !!($('#vCalcCta')&&$('#vCalcCta').checked)
  };
  var ok2=await sbPatch('co_configuracoes',1,directPayload);
  if(ok2){toast('Visual salvo!','ok');btnState(btn,'saved');markSaved()}
  else{toast('Erro ao salvar colunas diretas','err');btnState(btn,'error')}
}

function restaurarVisual(){
  confirmShow('Restaurar todos os valores visuais para o padrão original?',function(yes){
    if(!yes)return;
    Object.keys(VISUAL_DEFAULTS).forEach(function(k){DATA.config[k]=VISUAL_DEFAULTS[k]});
    renderVisual();
    toast('Valores restaurados — clique "Salvar visual" para aplicar','info');
  });
}

async function saveSecoes(btn){
  btnState(btn,'saving');var cards=$$('#secoesContainer .sec-block');var ok=true;
  for(var i=0;i<cards.length;i++){var card=cards[i];var id=card.dataset.id;var d=collectCard(card);
    var r=await sbPatch('co_secoes',id,{titulo:d.titulo||null,subtitulo:d.subtitulo||null,ordem:parseInt(d.ordem)||0,visivel:d.visivel!==false});if(!r)ok=false}
  if(ok){toast('Seções salvas!','ok');btnState(btn,'saved');markSaved()}
  else{toast('Erro em algumas seções','err');btnState(btn,'error')}
}

/* FIX 2+5: saveTable corrigido — serializa JSON, trata campos obrigatórios, garante nome não-vazio */
async function saveTable(table,containerId,btn){
  btnState(btn,'saving');var cards=$$('#'+containerId+' .item-card');var ok=true;var lastErr='';
  for(var i=0;i<cards.length;i++){
    var card=cards[i];var id=card.dataset.id;var d=collectCard(card);
    var isNew=String(id).indexOf('new_')===0;
    if(isNew){
      var body=Object.assign({},d);delete body.visivel;
      if(table==='co_calc_pacotes'){
        if(!body.pacote_id)body.pacote_id='pacote_'+Date.now();
        if(!body.nivel)body.nivel=body.nome||'Novo';
        if(!body.nome)body.nome='Novo pacote';
        body.itens=JSON.stringify(body.itens||[]);
        body.servicos_ids=JSON.stringify(body.servicos_ids||[]);
      }
      if(table==='co_calculadora_valores'){body.faixas=JSON.stringify(body.faixas||[])}
      var res=await sbPost(table,body);
      if(res&&res[0])card.dataset.id=res[0].id;else{ok=false;lastErr='POST item #'+(i+1)}
    }
    else{
      var patchBody=Object.assign({},d);
      if(table==='co_calc_pacotes'){
        if(!patchBody.nome)patchBody.nome='Pacote';
        patchBody.itens=JSON.stringify(patchBody.itens||[]);
        patchBody.servicos_ids=JSON.stringify(patchBody.servicos_ids||[]);
      }
      if(table==='co_calculadora_valores'){patchBody.faixas=JSON.stringify(patchBody.faixas||[])}
      var r=await sbPatch(table,id,patchBody);
      if(!r){ok=false;lastErr='PATCH id='+id+' item #'+(i+1)}
    }
  }
  if(ok){toast('Salvo!','ok');btnState(btn,'saved');markSaved();await loadAll()}
  else{toast('Erro: '+lastErr+' ('+table+')','err');btnState(btn,'error')}
}

async function saveConfig(btn){
  btnState(btn,'saving');
  var v=Object.assign({},DATA.config);
  v.nome_site=$('#cfgNome').value;v.whatsapp=$('#cfgWa').value;v.instagram=$('#cfgInsta').value;v.email=$('#cfgEmail').value;v.descricao=$('#cfgDesc').value;
  v.wa_msg_fab=$('#cfgWaMsg').value;v.wa_msg_orcamento=$('#cfgWaOrcamento').value;v.wa_msg_galeria=$('#cfgWaGaleria').value;
  v.txt_pos_email=$('#cfgTxtPosEmail').value;v.txt_btn_form=$('#cfgTxtBtnForm').value;v.txt_urgencia=$('#cfgTxtUrgencia').value;
  var ok=await sbPatch('co_configuracoes',1,{valor:v,atualizado_em:new Date().toISOString()});
  if(ok){DATA.config=v;toast('Configurações salvas!','ok');btnState(btn,'saved');markSaved()}
  else{toast('Erro ao salvar','err');btnState(btn,'error')}
}

async function saveConfigField(field,value){
  var v=Object.assign({},DATA.config);v[field]=parseInt(value)||0;
  var ok=await sbPatch('co_configuracoes',1,{valor:v,atualizado_em:new Date().toISOString()});
  if(ok){DATA.config=v;toast(field+' atualizado','ok')}
}

function markSaved(){$('#lastSave').textContent='Salvo '+new Date().toLocaleTimeString('pt-BR');$('#dSave').textContent=new Date().toLocaleTimeString('pt-BR');$('#dSave').className='g'}

/* ===== ADD / REMOVE ITEM ===== */
/* FIX 1+4: addItem pacotes — pacote_id, nivel legível, nome garantido */
function addItem(type){
  var id='new_'+Date.now();
  if(type==='servicos'){DATA.servicos.push({id:id,servico_id:'novo',nome:'novo',nome_exibicao:'Novo Serviço',descricao:'',icone:'🎵',valor_base:0,valor_por_hora:0,valor_por_pessoa:0,calc_por_hora:false,calc_por_pessoa:false,faixas:[],ordem:DATA.servicos.length+1,ativo:true});renderServicos()}
  else if(type==='pacotes'){
    var slug='pacote_'+Date.now();
    DATA.pacotes.push({id:id,pacote_id:slug,nivel:'Novo',nome:'Novo pacote',preco_pacote:0,preco_original:0,horas_inclusas:0,ideal_para:'',itens:[],servicos_ids:[],destaque:false,ordem:DATA.pacotes.length+1,ativo:true});
    renderPacotes()
  }
  else if(type==='depoimentos'){DATA.depoimentos.push({id:id,nome:'Nome',cargo:'Evento',texto:'',nota:5,ordem:DATA.depoimentos.length+1,ativo:true});renderDepoimentos()}
  else if(type==='faq'){DATA.faq.push({id:id,pergunta:'Nova pergunta?',resposta:'',ordem:DATA.faq.length+1,ativo:true});renderFaq()}
  toast('Item adicionado — preencha e salve','info');
}

function removeItem(table,id,btnEl){
  confirmShow('Excluir este item? Não pode ser desfeito.',async function(yes){
    if(!yes)return;var ok=await sbDel(table,id);
    if(ok){toast('Excluído','ok');await loadAll()}else{toast('Erro ao excluir','err')}
  });
}

/* ===== FAIXAS EDITOR HELPERS ===== */
/* CHANGED — funções auxiliares para o editor visual de faixas */
function addFaixa(btn){
  var editor=btn.parentElement;
  var rows=editor.querySelectorAll('.faixa-row');
  var idx=rows.length;
  var div=document.createElement('div');div.className='faixa-row';div.dataset.faixaIdx=idx;
  div.innerHTML='<label>Até</label><input type="number" class="faixa-ate" value="" placeholder="pessoas"> <label>pessoas → R$</label><input type="number" step="0.01" class="faixa-valor" value="" placeholder="valor"><button type="button" class="btn-danger btn-sm" onclick="removeFaixa(this)">✕</button>';
  editor.insertBefore(div,btn);
}
function removeFaixa(btn){btn.parentElement.remove()}

/* =============================================== */
/* ===== GALERIA FUNCTIONS ===== */
/* =============================================== */

function toggleGalTipo(){
  var tipo=document.querySelector('input[name=galTipo]:checked').value;
  $('#galUploadFoto').style.display=tipo==='foto'?'':'none';
  $('#galUploadYt').style.display=tipo==='video_yt'?'':'none';
  $('#galUploadVid').style.display=tipo==='video_up'?'':'none';
}

function handleGalFiles(files){galFiles=Array.from(files).filter(function(f){return f.type.startsWith('image/')});if(galFiles.length){$('#galUploadZone').textContent=galFiles.length+' foto(s) selecionada(s)';toast(galFiles.length+' foto(s)','info')}}
function handleGalVidFile(files){var f=Array.from(files).filter(function(f){return f.type.startsWith('video/')})[0];if(!f)return;if(f.size>52428800){toast('Máx 50MB','err');return}galVidFile=f;$('#galUploadZoneVid').textContent=f.name;toast('Vídeo pronto','info')}

function comprimirImg(file,maxW,quality){return new Promise(function(resolve){var reader=new FileReader();reader.onload=function(e){var img=new Image();img.onload=function(){var w=img.width,h=img.height;if(w>maxW){h=Math.round(h*(maxW/w));w=maxW}var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);canvas.toBlob(function(blob){resolve(blob)},'image/jpeg',quality)};img.src=e.target.result};reader.readAsDataURL(file)})}

function gerarThumbVid(file){return new Promise(function(resolve){var timeout=setTimeout(function(){var c=document.createElement('canvas');c.width=600;c.height=338;var ctx=c.getContext('2d');ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,600,338);ctx.beginPath();ctx.arc(300,169,50,0,Math.PI*2);ctx.fillStyle='#8b5cf6';ctx.fill();ctx.beginPath();ctx.moveTo(285,145);ctx.lineTo(285,193);ctx.lineTo(325,169);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();c.toBlob(function(blob){resolve(blob)},'image/jpeg',0.8)},3000);try{var video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;video.onseeked=function(){clearTimeout(timeout);try{var c=document.createElement('canvas');c.width=Math.min(video.videoWidth||600,600);c.height=Math.round(c.width*((video.videoHeight||338)/(video.videoWidth||600)));c.getContext('2d').drawImage(video,0,0,c.width,c.height);c.toBlob(function(blob){URL.revokeObjectURL(video.src);resolve(blob)},'image/jpeg',0.7)}catch(e){URL.revokeObjectURL(video.src);resolve(null)}};video.onloadeddata=function(){video.currentTime=0.5};video.onerror=function(){clearTimeout(timeout);resolve(null)};video.src=URL.createObjectURL(file);video.load()}catch(e){clearTimeout(timeout);resolve(null)}})}

async function galPublicar(){
  var tipo=document.querySelector('input[name=galTipo]:checked').value;
  var titulo=$('#galTitulo').value.trim();
  var cat=$('#galCat').value;
  var local=$('#galLocal').value.trim();
  var desc=$('#galDesc').value.trim();
  var dest=$('#galDest').checked?1:0;
  var btn=$('#btnGalPublicar');btn.disabled=true;btn.textContent='Publicando...';

  try{
    if(tipo==='video_yt'){
      var videoUrl=$('#galVideoUrl').value.trim();
      if(!videoUrl||!ytId(videoUrl)){toast('URL YouTube inválida','err');btn.disabled=false;btn.textContent='📤 Publicar';return}
      await sbPost('co_galeria_fotos',{titulo:titulo||'Vídeo',cat:cat,local:local,descricao:desc,tipo:'video_yt',url:ytThumb(videoUrl),url_thumb:ytThumb(videoUrl),video_url:videoUrl,destaque:dest,ordem:DATA.galFotos.length+1});
      toast('YouTube publicado!','ok');
    }else if(tipo==='video_up'){
      if(!galVidFile){toast('Selecione vídeo','err');btn.disabled=false;btn.textContent='📤 Publicar';return}
      var ts=Date.now();var pathV='videos/'+ts+'.'+galVidFile.name.split('.').pop();var pathT='thumb/'+ts+'_vt.jpg';
      btn.textContent='Gerando thumb...';
      var thumbBlob=await gerarThumbVid(galVidFile);
      btn.textContent='Subindo...';
      await sbUpload(pathV,galVidFile);
      if(thumbBlob)await sbUpload(pathT,thumbBlob);
      await sbPost('co_galeria_fotos',{titulo:titulo||galVidFile.name,cat:cat,local:local,descricao:desc,tipo:'video_up',url:sbPublicUrl(pathV),url_thumb:thumbBlob?sbPublicUrl(pathT):'',video_url:'',destaque:dest,ordem:DATA.galFotos.length+1});
      toast('Vídeo publicado!','ok');
    }else{
      if(!galFiles.length){toast('Selecione fotos','err');btn.disabled=false;btn.textContent='📤 Publicar';return}
      for(var i=0;i<galFiles.length;i++){
        var ts2=Date.now()+'_'+i;var pF='full/'+ts2+'.jpg';var pT='thumb/'+ts2+'.jpg';
        var blobs=await Promise.all([comprimirImg(galFiles[i],2000,0.80),comprimirImg(galFiles[i],600,0.70)]);
        await sbUpload(pF,blobs[0]);await sbUpload(pT,blobs[1]);
        await sbPost('co_galeria_fotos',{titulo:titulo||(galFiles[i].name.replace(/\.[^.]+$/,'')),cat:cat,local:local,descricao:desc,tipo:'foto',url:sbPublicUrl(pF),url_thumb:sbPublicUrl(pT),video_url:'',destaque:dest,ordem:DATA.galFotos.length+1+i});
      }
      toast(galFiles.length+' foto(s) publicada(s)!','ok');
    }
    galResetForm();await loadAll();
  }catch(e){toast('Erro: '+e.message,'err')}
  btn.disabled=false;btn.textContent='📤 Publicar';
}

function galResetForm(){galFiles=[];galVidFile=null;$('#galTitulo').value='';$('#galLocal').value='';$('#galDesc').value='';$('#galDest').checked=false;$('#galVideoUrl').value='';$('#galUploadZone').textContent='Arraste fotos aqui ou toque para selecionar';$('#galUploadZoneVid').textContent='Arraste vídeo aqui ou toque para selecionar (máx 50MB)';document.querySelector('input[name=galTipo][value=foto]').checked=true;toggleGalTipo()}

function galEditField(id,field,value){var body={};body[field]=value;sbPatch('co_galeria_fotos',id,body).then(function(){toast('Atualizado','ok')}).catch(function(){toast('Erro','err')});DATA.galFotos.forEach(function(f){if(String(f.id)===String(id))f[field]=value})}
function galToggleDest(id,atual){var novo=atual?0:1;sbPatch('co_galeria_fotos',id,{destaque:novo}).then(function(){toast(novo?'Destaque ativado':'Removido','ok');loadAll()}).catch(function(){toast('Erro','err')})}
function galMover(id,dir){var idx=DATA.galFotos.findIndex(function(f){return String(f.id)===String(id)});if(idx<0)return;var n=idx+dir;if(n<0||n>=DATA.galFotos.length)return;var a=DATA.galFotos[idx],b=DATA.galFotos[n];var tmp=a.ordem;a.ordem=b.ordem;b.ordem=tmp;DATA.galFotos.splice(idx,1);DATA.galFotos.splice(n,0,a);sbPatch('co_galeria_fotos',a.id,{ordem:a.ordem});sbPatch('co_galeria_fotos',b.id,{ordem:b.ordem});renderGalList()}
function galDeletar(id){confirmShow('Excluir esta mídia?',function(yes){if(!yes)return;sbDel('co_galeria_fotos',id).then(function(){toast('Excluído','ok');loadAll()}).catch(function(){toast('Erro','err')})})}
function galAddCat(){var nome=$('#galCatNome').value.trim();var emoji=$('#galCatEmoji').value.trim()||'📌';if(!nome){toast('Nome da categoria','err');return}var slug=nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');sbPost('co_galeria_categorias',{slug:slug,nome:nome,emoji:emoji,ordem:DATA.galCats.length+1}).then(function(){toast('Categoria criada','ok');$('#galCatNome').value='';$('#galCatEmoji').value='';loadAll()}).catch(function(e){toast('Erro: '+e.message,'err')})}
function galDelCat(id){if(!id)return;confirmShow('Excluir categoria?',function(yes){if(!yes)return;sbDel('co_galeria_categorias',id).then(function(){toast('Excluída','ok');loadAll()}).catch(function(){toast('Erro','err')})})}

/* Drag & drop zones */
(function(){
  var z1=$('#galUploadZone');if(z1){z1.addEventListener('dragover',function(e){e.preventDefault();z1.classList.add('dragover')});z1.addEventListener('dragleave',function(){z1.classList.remove('dragover')});z1.addEventListener('drop',function(e){e.preventDefault();z1.classList.remove('dragover');handleGalFiles(e.dataTransfer.files)})}
  var z2=$('#galUploadZoneVid');if(z2){z2.addEventListener('dragover',function(e){e.preventDefault();z2.classList.add('dragover')});z2.addEventListener('dragleave',function(){z2.classList.remove('dragover')});z2.addEventListener('drop',function(e){e.preventDefault();z2.classList.remove('dragover');handleGalVidFile(e.dataTransfer.files)})}
})();

/* =============================================== */
/* ===== LEADS FUNCTIONS ===== */
/* =============================================== */

function filterLeads(){renderLeads();updateLeadSelectUI()}
function toggleLeadSelect(id,checked){if(checked)selectedLeads[id]=true;else delete selectedLeads[id];updateLeadSelectUI()}
function toggleSelectAll(){var leads=getFilteredLeads();var allSelected=leads.every(function(l){return selectedLeads[l.id]});if(allSelected){leads.forEach(function(l){delete selectedLeads[l.id]})}else{leads.forEach(function(l){selectedLeads[l.id]=true})}renderLeads();updateLeadSelectUI()}
function updateLeadSelectUI(){var count=Object.keys(selectedLeads).length;$('#btnDeleteLeads').style.display=count>0?'':'none';$('#leadsSelectedCount').style.display=count>0?'':'none';$('#leadsSelCount').textContent=count}

async function updateLeadField(id,field,value){var body={};body[field]=value;var ok=await sbPatch('co_leads',id,body);if(ok){DATA.leads.forEach(function(l){if(String(l.id)===String(id))l[field]=value});toast('Lead atualizado','ok')}else{toast('Erro','err')}}

function deleteSelectedLeads(){var ids=Object.keys(selectedLeads);if(!ids.length)return;confirmShow('Excluir '+ids.length+' lead(s)? Não pode ser desfeito.',async function(yes){if(!yes)return;var ok=true;for(var i=0;i<ids.length;i++){var r=await sbDel('co_leads',ids[i]);if(!r)ok=false}selectedLeads={};if(ok){toast(ids.length+' lead(s) excluído(s)','ok');await loadAll()}else{toast('Erro em alguns','err');await loadAll()}})}

function exportCSV(){
  var leads=getFilteredLeads();if(!leads.length){toast('Nenhum lead para exportar','err');return}
  var headers=['Nome','WhatsApp','Email','Tipo Evento','Data Evento','Local','Convidados','Horas','Total','Pacote','Origem','Status','Notas','Data Criação','Mensagem'];
  var rows=[headers.join(';')];
  leads.forEach(function(l){
    rows.push([l.nome||'',l.whatsapp||'',l.email||'',l.tipo_evento||'',l.data_evento||'',l.local||'',l.convidados||'',l.horas||'',l.total||'',l.pacote||'',l.origem||'',l.status||'novo',l.observacoes||'',l.criado_em||'','"'+(l.mensagem||'').replace(/"/g,'""').substring(0,200)+'"'].join(';'));
  });
  var blob=new Blob(['\uFEFF'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='432up_leads_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
  URL.revokeObjectURL(url);toast('CSV exportado!','ok');
}

/* =============================================== */
/* ===== DEBUG & LOAD ===== */
/* =============================================== */

function updateDebug(){
  $('#dSec').textContent=DATA.secoes.length;
  $('#dSrv').textContent=DATA.servicos.length;
  $('#dPkg').textContent=DATA.pacotes.length;
  $('#dDep').textContent=DATA.depoimentos.length;
  $('#dFaq').textContent=DATA.faq.length;
  $('#dGal').textContent=DATA.galFotos.length;
  $('#dLeads').textContent=DATA.leads.length;
}

async function loadAll(){
  if($('#dbSt')){$('#dbSt').textContent='...';$('#dbSt').style.color='var(--amber)'}if($('#dDb')){$('#dDb').textContent='...';$('#dDb').className='y'}

  var results=await Promise.all([
    sbGet('co_secoes','select=*&order=ordem'),
    sbGet('co_calculadora_valores','select=*&order=ordem'),
    sbGet('co_calc_pacotes','select=*&order=ordem'),
    sbGet('co_depoimentos','select=*&order=ordem'),
    sbGet('co_faq','select=*&order=ordem'),
    sbGet('co_configuracoes','select=*'),
    sbGet('co_leads','select=*&order=criado_em.desc&limit=100'),
    sbGet('co_galeria_fotos','select=*&order=ordem'),
    sbGet('co_galeria_categorias','select=*&order=ordem')
  ]);
  var ok=results.every(function(r){return r!==null});
  if($('#dbSt')){$('#dbSt').textContent=ok?'OK':'ERRO';$('#dbSt').style.color=ok?'var(--green)':'var(--red)';}if($('#dDb')){$('#dDb').textContent=ok?'OK':'FAIL';$('#dDb').className=ok?'g':'r';}


  DATA.secoes=results[0]||[];
  DATA.servicos=results[1]||[];
  DATA.pacotes=results[2]||[];
  DATA.depoimentos=results[3]||[];
  DATA.faq=results[4]||[];
  DATA.config=(results[5]&&results[5][0])?results[5][0].valor:{};
  DATA.leads=results[6]||[];
  DATA.galFotos=results[7]||[];
  DATA.galCats=results[8]||[];

  /* LINHA ANTIGA: renderVisual();renderSecoes();renderServicos();renderPacotes();renderDepoimentos();renderFaq();renderGaleria();renderLeads();renderConfig();updateDebug(); */
  /* LINHA NOVA: renderAnimacoes() adicionado ao ciclo — lê colunas diretas separado de DATA.config */
  renderVisual();renderAnimacoes();renderSecoes();renderServicos();renderPacotes();renderDepoimentos();renderFaq();renderGaleria();renderLeads();renderConfig();updateDebug();

  if(ok)toast('Dados carregados','ok');else toast('Erro ao carregar','err');
}

/* ===== EXPOSE ===== */
window.$=window.$||$;
window.saveVisual=saveVisual;window.restaurarVisual=restaurarVisual;window.saveSecoes=saveSecoes;window.saveTable=saveTable;window.saveConfig=saveConfig;window.saveConfigField=saveConfigField;
window.addItem=addItem;window.removeItem=removeItem;window.loadAll=loadAll;
window.confirmShow=confirmShow;window.confirmClose=confirmClose;window.toggleTheme=toggleTheme;window.resetThemeAuto=resetThemeAuto;
window.toggleGalTipo=toggleGalTipo;window.handleGalFiles=handleGalFiles;window.handleGalVidFile=handleGalVidFile;window.galPublicar=galPublicar;
window.galEditField=galEditField;window.galToggleDest=galToggleDest;window.galMover=galMover;window.galDeletar=galDeletar;window.galAddCat=galAddCat;window.galDelCat=galDelCat;
window.filterLeads=filterLeads;window.toggleLeadSelect=toggleLeadSelect;window.toggleSelectAll=toggleSelectAll;window.deleteSelectedLeads=deleteSelectedLeads;window.exportCSV=exportCSV;
window.updateLeadField=updateLeadField;
window.addFaixa=addFaixa;window.removeFaixa=removeFaixa;
window.pkgSrvChanged=pkgSrvChanged;
/* LINHA NOVA: saveAnimacoes exposto para o botão no HTML */
window.saveAnimacoes=saveAnimacoes;

/* ===== INIT ===== */
initTheme();
loadAll();

})();

/* ===== FIM admin.js v2.6 ===== */
