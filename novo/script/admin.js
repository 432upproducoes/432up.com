/* ========== script/admin.js · 432UP · v2.6 · 2026-03-03 ========== */

(function(){'use strict';

var SB='https://paetkspbfejtjjkngqej.supabase.co';
var SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZXRrc3BiZmVqdGpqa25ncWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDU2OTgsImV4cCI6MjA4NjQ4MTY5OH0.IiYweZ2g3bP7b0o7VvBW5LLb6d1oHtSNFUZlVkIsdsA';
var BUCKET='432up_galeria';

var DATA={secoes:[],servicos:[],pacotes:[],depoimentos:[],faq:[],config:{},leads:[],galFotos:[],galCats:[]};
var _confirmCb=null;
var galFiles=[];
var galVidFile=null;
var selectedLeads={};

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

function $(s){return document.querySelector(s)}
function $$(s){return document.querySelectorAll(s)}
function esc(s){return(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;')}

function applyTheme(t){document.documentElement.setAttribute('data-theme',t);var b=$('#btnTheme');if(b){var isAuto=!localStorage.getItem('432up_admin_theme');b.textContent=t==='dark'?(isAuto?'🌗':'☀️'):(isAuto?'🌗':'🌙')}}
function initTheme(){var s=localStorage.getItem('432up_admin_theme');if(s){applyTheme(s)}else{applyTheme(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(e){if(!localStorage.getItem('432up_admin_theme'))applyTheme(e.matches?'dark':'light')})}}
function toggleTheme(){var s=localStorage.getItem('432up_admin_theme');if(!s){var cur=document.documentElement.getAttribute('data-theme')||'dark';localStorage.setItem('432up_admin_theme',cur==='dark'?'light':'dark');applyTheme(cur==='dark'?'light':'dark');toast('Tema manual','info')}else{var c=document.documentElement.getAttribute('data-theme')||'dark';var n=c==='dark'?'light':'dark';localStorage.setItem('432up_admin_theme',n);applyTheme(n)}}
function resetThemeAuto(){localStorage.removeItem('432up_admin_theme');applyTheme(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');toast('Tema automático (sistema)','info')}

function toast(msg,type){var t=document.createElement('div');t.className='toast '+(type||'info');t.textContent=msg;var box=$('#toastBox');if(box)box.appendChild(t);setTimeout(function(){t.remove()},3200)}

function btnState(btn,state){if(!btn)return;if(state==='saving'){btn.disabled=true;btn.classList.add('saving');btn.classList.remove('saved');btn.textContent='Salvando...'}else if(state==='saved'){btn.disabled=false;btn.classList.remove('saving');btn.classList.add('saved');btn.textContent='Salvo ✓';setTimeout(function(){btn.classList.remove('saved');btn.textContent=btn.dataset.label||'Salvar'},2000)}else if(state==='error'){btn.disabled=false;btn.classList.remove('saving','saved');btn.textContent='Erro ✗';setTimeout(function(){btn.textContent=btn.dataset.label||'Salvar'},2500)}else{btn.disabled=false;btn.classList.remove('saving','saved');btn.textContent=btn.dataset.label||'Salvar'}}

function confirmShow(msg,cb){$('#confirmMsg').textContent=msg;_confirmCb=cb;$('#confirmDlg').style.display='flex'}
function confirmClose(yes){$('#confirmDlg').style.display='none';if(_confirmCb)_confirmCb(yes);_confirmCb=null}

function sbH(m){var h={'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':'application/json'};if(m==='PATCH'||m==='POST')h['Prefer']='return=representation';return h}

async function sbGet(table,qs){try{var r=await fetch(SB+'/rest/v1/'+table+'?'+qs,{headers:{'apikey':SK,'Authorization':'Bearer '+SK}});if(!r.ok)throw r;return await r.json()}catch(e){dbg('sbGet ERRO ['+table+']',{status:e.status,msg:e.message});return null}}
async function sbPatch(table,id,body){try{var r=await fetch(SB+'/rest/v1/'+table+'?id=eq.'+id,{method:'PATCH',headers:sbH('PATCH'),body:JSON.stringify(body)});if(!r.ok){var txt=await r.text();dbg('sbPatch FAIL ['+table+' id='+id+']',{status:r.status,body:txt});return false}return true}catch(e){dbg('sbPatch ERRO ['+table+']',{msg:e.message});return false}}
async function sbPost(table,body){try{var r=await fetch(SB+'/rest/v1/'+table,{method:'POST',headers:sbH('POST'),body:JSON.stringify(body)});if(!r.ok){var txt=await r.text();dbg('sbPost FAIL ['+table+']',{status:r.status,body:txt});return null}return await r.json()}catch(e){dbg('sbPost ERRO ['+table+']',{msg:e.message});return null}}
async function sbDel(table,id){try{var r=await fetch(SB+'/rest/v1/'+table+'?id=eq.'+id,{method:'DELETE',headers:{'apikey':SK,'Authorization':'Bearer '+SK}});return r.ok}catch(e){dbg('sbDel ERRO ['+table+']',{msg:e.message});return false}}
async function sbUpload(path,file){try{var r=await fetch(SB+'/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers:{'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':file.type,'x-upsert':'true'},body:file});return r.ok}catch(e){return false}}
function sbPublicUrl(path){return SB+'/storage/v1/object/public/'+BUCKET+'/'+path}

$$('.nav button').forEach(function(b){b.addEventListener('click',function(){$$('.nav button').forEach(function(x){x.classList.remove('active')});b.classList.add('active');$$('.panel').forEach(function(p){p.classList.remove('active')});var target=$('#p-'+b.dataset.tab);if(target)target.classList.add('active')})});
$$('.btn-save').forEach(function(b){b.dataset.label=b.textContent});

function ytId(url){if(!url)return'';var m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);return m?m[1]:''}
function ytThumb(url){var id=ytId(url);return id?'https://img.youtube.com/vi/'+id+'/hqdefault.jpg':''}

var SEC_NAMES={urgencia:'🔔 Urgência',hero:'🏠 Hero',strip:'📜 Strip',dor:'😰 Dor',como:'🔢 Como Funciona',servicos:'🎧 Serviços',numeros:'📊 Números',galeria:'📷 Galeria',pacotes:'📦 Pacotes',depoimentos:'💬 Depoimentos',faq:'❓ FAQ',contato:'📱 Contato'};
var VISUAL_DEFAULTS={glass_opacity:0.82,glass_blur:16,bpm_global:74,orbs_intensity:50,particles_density:50,tide_speed:1.0,tide_amplitude:50,motion_enabled:true,layer_aurora:true,layer_algae:true,layer_particles:true,cta_pulse_enabled:true,tema_ativo:'auto',hero_text_anim:'breathe',motion_level:'normal'};

function renderVisual(){
  var v=DATA.config;if(!v)return;
  if($('#vGlass')){$('#vGlass').value=Math.round((v.glass_opacity||.82)*100);$('#vGlassVal').textContent=Math.round((v.glass_opacity||.82)*100)+'%';}
  if($('#vBlur')){$('#vBlur').value=v.glass_blur||16;$('#vBlurVal').textContent=(v.glass_blur||16)+'px';}
  if($('#vBpm')){$('#vBpm').value=v.bpm_global||74;$('#vBpmVal').textContent=v.bpm_global||74;}
  if($('#vOrbs')){$('#vOrbs').value=v.orbs_intensity||50;$('#vOrbsVal').textContent=(v.orbs_intensity||50)+'%';}
  if($('#vPart')){$('#vPart').value=v.particles_density||50;$('#vPartVal').textContent=(v.particles_density||50)+'%';}
  if($('#vTide')){$('#vTide').value=Math.round((v.tide_speed||1)*10);$('#vTideVal').textContent=(v.tide_speed||1).toFixed(1);}
  if($('#vAmp')){$('#vAmp').value=v.tide_amplitude||50;$('#vAmpVal').textContent=(v.tide_amplitude||50)+'%';}
  if($('#vMotion'))$('#vMotion').checked=v.motion_enabled!==false;
  if($('#vAurora'))$('#vAurora').checked=v.layer_aurora!==false;
  if($('#vAlgae'))$('#vAlgae').checked=v.layer_algae!==false;
  if($('#vParticlesOn'))$('#vParticlesOn').checked=v.layer_particles!==false;
  if($('#vCta'))$('#vCta').checked=v.cta_pulse_enabled!==false;
  if($('#vTema'))$('#vTema').value=v.tema_ativo||'auto';
  if($('#vHeroAnim'))$('#vHeroAnim').value=v.hero_text_anim||'breathe';
  if($('#vMotionLevel'))$('#vMotionLevel').value=v.motion_level||'normal';
  if(v.depoimentos_max_home&&$('#depMaxHome'))$('#depMaxHome').value=v.depoimentos_max_home;
  if(v.faq_max_home&&$('#faqMaxHome'))$('#faqMaxHome').value=v.faq_max_home;
}

async function renderAnimacoes(){
  try{
    var r=await fetch(SB+'/rest/v1/co_configuracoes?id=eq.1&select=aurora_opacity,fog_opacity,carousel_home_speed,carousel_home_autoplay,carousel_home_pause_hover,carousel_home_transition,carousel_home_max_items,carousel_home_fx,carousel_gallery_speed,carousel_gallery_autoplay,carousel_gallery_pause_hover,carousel_gallery_transition,carousel_gallery_max_items,carousel_gallery_fx,masonry_columns_mobile,masonry_columns_tablet,masonry_columns_desktop,masonry_gap,masonry_entry_animation,calc_tema,calc_motion,home_herdar_camadas,home_layer_motion,home_layer_aurora,home_layer_algae,home_layer_particles,home_layer_cta,gal_herdar_camadas,gal_layer_motion,gal_layer_aurora,gal_layer_algae,gal_layer_particles,gal_layer_cta,galeria_carrossel_ativo,calc_herdar_camadas,calc_layer_motion,calc_layer_aurora,calc_layer_algae,calc_layer_particles,calc_layer_cta',{headers:{'apikey':SK,'Authorization':'Bearer '+SK}});
    if(!r.ok){dbg('renderAnimacoes fetch FAIL',{status:r.status});throw r;}
    var rows=await r.json();
    var c=rows&&rows[0]?rows[0]:{};
    if($('#vAuroraOpacity')){$('#vAuroraOpacity').value=c.aurora_opacity!=null?c.aurora_opacity:0.6;$('#vAuroraOpacityVal').textContent=c.aurora_opacity!=null?c.aurora_opacity:0.6}
    if($('#vFogOpacity')){$('#vFogOpacity').value=c.fog_opacity!=null?c.fog_opacity:0.4;$('#vFogOpacityVal').textContent=c.fog_opacity!=null?c.fog_opacity:0.4}
    if($('#vMasonMob')){$('#vMasonMob').value=c.masonry_columns_mobile||1;$('#vMasonMobVal').textContent=c.masonry_columns_mobile||1}
    if($('#vMasonTab')){$('#vMasonTab').value=c.masonry_columns_tablet||2;$('#vMasonTabVal').textContent=c.masonry_columns_tablet||2}
    if($('#vMasonDesk')){$('#vMasonDesk').value=c.masonry_columns_desktop||3;$('#vMasonDeskVal').textContent=c.masonry_columns_desktop||3}
    if($('#vMasonGap')){$('#vMasonGap').value=c.masonry_gap!=null?c.masonry_gap:16;$('#vMasonGapVal').textContent=c.masonry_gap!=null?c.masonry_gap:16}
    if($('#vMasonFx'))$('#vMasonFx').value=c.masonry_entry_animation||'fx-fade';
    if($('#vCalcTema'))$('#vCalcTema').value=c.calc_tema||'auto';
    if($('#vCalcMotion'))$('#vCalcMotion').checked=c.calc_motion!==false;
  }catch(e){dbg('renderAnimacoes ERRO',{msg:e.message});}
}

async function saveAnimacoes(btn){
  btnState(btn,'saving');
  var payload={
    aurora_opacity: parseFloat($('#vAuroraOpacity')&&$('#vAuroraOpacity').value||0.6),
    fog_opacity: parseFloat($('#vFogOpacity')&&$('#vFogOpacity').value||0.4),
    masonry_columns_mobile: parseInt($('#vMasonMob')&&$('#vMasonMob').value||1),
    masonry_columns_tablet: parseInt($('#vMasonTab')&&$('#vMasonTab').value||2),
    masonry_columns_desktop: parseInt($('#vMasonDesk')&&$('#vMasonDesk').value||3),
    masonry_gap: parseInt($('#vMasonGap')&&$('#vMasonGap').value||16),
    masonry_entry_animation: $('#vMasonFx')&&$('#vMasonFx').value||'fx-fade',
    calc_tema: $('#vCalcTema')&&$('#vCalcTema').value||'auto',
    calc_motion: !!($('#vCalcMotion')&&$('#vCalcMotion').checked)
  };
  try{
    var r=await fetch(SB+'/rest/v1/co_configuracoes?id=eq.1',{method:'PATCH',headers:{'apikey':SK,'Authorization':'Bearer '+SK,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
    if(r.ok){toast('Animações salvas!','ok');btnState(btn,'saved');markSaved()}
    else{toast('Erro ao salvar animações','err');btnState(btn,'error')}
  }catch(e){toast('Erro ao salvar animações','err');btnState(btn,'error')}
}

function renderSecoes(){
  var c=$('#secoesContainer');if(!c)return;c.innerHTML='';
  DATA.secoes.forEach(function(s){
    var name=SEC_NAMES[s.tipo]||s.tipo;var vis=s.visivel!==false;
    if(s.tipo==='strip'){
      c.innerHTML+='<div class="sec-block" data-id="'+s.id+'" data-table="co_secoes"><div class="item-header"><h3>'+name+'</h3></div><div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(vis?'checked':'')+' data-field="visivel"><span class="track"></span><span class="thumb"></span></label><span>Visível</span></div><div class="field"><label>Texto da faixa</label><input data-field="titulo" class="admin-input" value="'+esc(s.titulo)+'"></div><div class="field-row"><div class="field"><label>Ordem</label><input type="number" class="admin-input" data-field="ordem" value="'+(s.ordem||0)+'"></div><div class="field"><label>Tipo</label><input class="admin-input" value="'+s.tipo+'" disabled style="opacity:.5"></div></div></div>';
    }else{
      c.innerHTML+='<div class="sec-block" data-id="'+s.id+'" data-table="co_secoes"><div class="item-header"><h3>'+name+'</h3></div><div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(vis?'checked':'')+' data-field="visivel"><span class="track"></span><span class="thumb"></span></label><span>Visível</span></div><div class="field"><label>Título</label><input data-field="titulo" class="admin-input" value="'+esc(s.titulo)+'"></div><div class="field"><label>Subtítulo</label><textarea data-field="subtitulo" class="admin-input">'+(s.subtitulo||'')+'</textarea></div><div class="field-row"><div class="field"><label>Ordem</label><input type="number" class="admin-input" data-field="ordem" value="'+(s.ordem||0)+'"></div><div class="field"><label>Tipo</label><input class="admin-input" value="'+s.tipo+'" disabled style="opacity:.5"></div></div></div>';
    }
  });
}

function renderServicos(){
  var c=$('#servicosContainer');if(!c)return;c.innerHTML='';
  DATA.servicos.forEach(function(s,i){
    var faixas=[];
    if(s.faixas){var fa=typeof s.faixas==='string'?JSON.parse(s.faixas):s.faixas;if(Array.isArray(fa))faixas=fa}
    var faixasHtml='<div class="faixas-editor" data-srv-id="'+s.id+'">';
    faixas.forEach(function(fx,fi){
      faixasHtml+='<div class="faixa-row" data-faixa-idx="'+fi+'"><label>Até</label><input type="number" class="admin-input faixa-ate" value="'+(fx.ate||fx.max||0)+'"> <label>pessoas → R$</label><input type="number" step="0.01" class="admin-input faixa-valor" value="'+(fx.valor||0)+'"><button type="button" class="btn-danger btn-sm" onclick="removeFaixa(this)">✕</button></div>';
    });
    faixasHtml+='<button type="button" class="btn-ghost btn-sm" onclick="addFaixa(this)">+ Faixa</button></div>';

    c.innerHTML+='<div class="item-card" data-id="'+s.id+'" data-table="co_calculadora_valores"><div class="item-header"><h3>'+esc(s.icone||'')+' '+esc(s.nome_exibicao||s.nome)+'</h3><div class="item-actions"><span class="item-num">#'+(i+1)+'</span><button class="btn-danger" onclick="removeItem(\'co_calculadora_valores\','+s.id+',this)">Remover</button></div></div>'
    +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(s.ativo!==false?'checked':'')+' data-field="ativo"><span class="track"></span><span class="thumb"></span></label><span>Ativo</span></div>'
    +'<div class="field-row"><div class="field"><label>Ícone</label><input class="admin-input" data-field="icone" value="'+esc(s.icone)+'"></div><div class="field"><label>Nome exibição</label><input class="admin-input" data-field="nome_exibicao" value="'+esc(s.nome_exibicao)+'"></div></div>'
    +'<div class="field"><label>Descrição</label><textarea class="admin-input" data-field="descricao">'+(s.descricao||'')+'</textarea></div>'
    +'<div class="field-row"><div class="field"><label>ID interno</label><input class="admin-input" data-field="servico_id" value="'+esc(s.servico_id)+'" style="opacity:.7"></div><div class="field"><label>Nome interno</label><input class="admin-input" data-field="nome" value="'+esc(s.nome)+'"></div></div>'
    +'<div class="field-row"><div class="field"><label>Preço base (R$)</label><input type="number" step="0.01" class="admin-input" data-field="valor_base" value="'+(s.valor_base||0)+'"></div><div class="field"><label>Hora extra (R$)</label><input type="number" step="0.01" class="admin-input" data-field="valor_por_hora" value="'+(s.valor_por_hora||0)+'"></div></div>'
    +'<div class="field-row"><div class="field"><label>Valor/Pessoa (R$)</label><input type="number" step="0.01" class="admin-input" data-field="valor_por_pessoa" value="'+(s.valor_por_pessoa||0)+'"></div><div class="field"><label>Ordem</label><input type="number" class="admin-input" data-field="ordem" value="'+(s.ordem||0)+'"></div></div>'
    +'<div class="field"><label>Faixas por pessoa</label>'+faixasHtml+'</div></div>';
  });
}

function renderPacotes(){
  var c=$('#pacotesContainer');if(!c)return;c.innerHTML='';
  DATA.pacotes.forEach(function(p,i){
    var itensArr=Array.isArray(p.itens)?p.itens:(typeof p.itens==='string'?JSON.parse(p.itens||'[]'):[]);
    var itensStr=itensArr.join('\n');

    c.innerHTML+='<div class="item-card" data-id="'+p.id+'" data-table="co_calc_pacotes">'
      +'<div class="item-header"><h3>'+esc(p.nome)+'</h3><div class="item-actions"><span class="item-num">#'+(i+1)+'</span><button class="btn-danger" onclick="removeItem(\'co_calc_pacotes\','+p.id+',this)">Remover</button></div></div>'
      +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(p.ativo!==false?'checked':'')+' data-field="ativo"><span class="track"></span><span class="thumb"></span></label><span>Ativo</span></div>'
      +'<div class="field"><label>Nome</label><input class="admin-input" data-field="nome" value="'+esc(p.nome)+'"></div>'
      +'<div class="field-row"><div class="field"><label>Preço pacote (R$)</label><input type="number" step="0.01" class="admin-input" data-field="preco_pacote" value="'+(p.preco_pacote||0)+'"></div><div class="field"><label>Preço original (R$)</label><input type="number" step="0.01" class="admin-input" data-field="preco_original" value="'+(p.preco_original||0)+'"></div></div>'
      +'<div class="field"><label>Itens (um por linha)</label><textarea class="admin-input" data-field="itens" rows="4">'+itensStr+'</textarea></div>'
      +'<div class="field"><label>Ordem</label><input type="number" class="admin-input" data-field="ordem" value="'+(p.ordem||0)+'"></div>'
    +'</div>';
  });
}

function renderDepoimentos(){
  var c=$('#depoimentosContainer');if(!c)return;c.innerHTML='';
  DATA.depoimentos.forEach(function(d,i){
    c.innerHTML+='<div class="item-card" data-id="'+d.id+'" data-table="co_depoimentos"><div class="item-header"><h3>"'+esc((d.texto||'').substring(0,40))+'…"</h3><div class="item-actions"><span class="item-num">#'+(i+1)+'</span><button class="btn-danger" onclick="removeItem(\'co_depoimentos\','+d.id+',this)">Remover</button></div></div>'
    +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(d.ativo!==false?'checked':'')+' data-field="ativo"><span class="track"></span><span class="thumb"></span></label><span>Ativo</span></div>'
    +'<div class="field-row"><div class="field"><label>Nome</label><input class="admin-input" data-field="nome" value="'+esc(d.nome)+'"></div><div class="field"><label>Cargo / Evento</label><input class="admin-input" data-field="cargo" value="'+esc(d.cargo)+'"></div></div>'
    +'<div class="field"><label>Texto</label><textarea class="admin-input" data-field="texto" rows="3">'+(d.texto||'')+'</textarea></div>'
    +'<div class="field-row"><div class="field"><label>Nota (1-5)</label><input type="number" min="1" max="5" class="admin-input" data-field="nota" value="'+(d.nota||5)+'"></div><div class="field"><label>Ordem</label><input type="number" class="admin-input" data-field="ordem" value="'+(d.ordem||0)+'"></div></div></div>';
  });
}

function renderFaq(){
  var c=$('#faqContainer');if(!c)return;c.innerHTML='';
  DATA.faq.forEach(function(f,i){
    c.innerHTML+='<div class="item-card" data-id="'+f.id+'" data-table="co_faq"><div class="item-header"><h3>'+esc((f.pergunta||'').substring(0,50))+'</h3><div class="item-actions"><span class="item-num">#'+(i+1)+'</span><button class="btn-danger" onclick="removeItem(\'co_faq\','+f.id+',this)">Remover</button></div></div>'
    +'<div class="toggle-wrap"><label class="toggle"><input type="checkbox" '+(f.ativo!==false?'checked':'')+' data-field="ativo"><span class="track"></span><span class="thumb"></span></label><span>Ativo</span></div>'
    +'<div class="field"><label>Pergunta</label><input class="admin-input" data-field="pergunta" value="'+esc(f.pergunta)+'"></div>'
    +'<div class="field"><label>Resposta</label><textarea class="admin-input" data-field="resposta" rows="3">'+(f.resposta||'')+'</textarea></div>'
    +'<div class="field"><label>Ordem</label><input type="number" class="admin-input" data-field="ordem" value="'+(f.ordem||0)+'"></div></div>';
  });
}

function renderGaleria(){
  buildGalCatSelect();
  renderGalCatManager();
  renderGalList();
  if($('#galCount'))$('#galCount').textContent=DATA.galFotos.length;
}

function buildGalCatSelect(){
  var sel=$('#galCat');if(!sel)return;sel.innerHTML='';
  DATA.galCats.forEach(function(c){sel.innerHTML+='<option value="'+c.slug+'">'+c.emoji+' '+c.nome+'</option>'});
}

function buildGalCatOptions(selected){
  var h='';DATA.galCats.forEach(function(c){h+='<option value="'+c.slug+'"'+(c.slug===selected?' selected':'')+'>'+c.emoji+' '+c.nome+'</option>'});return h;
}

function renderGalCatManager(){
  var list=$('#galCatList');if(!list)return;list.innerHTML='';
  DATA.galCats.forEach(function(c){
    var tag=document.createElement('span');tag.className='lead-tag';
    tag.innerHTML=(c.emoji||'')+' '+c.nome+' <button type="button" onclick="galDelCat(\''+c.id+'\')">✕</button>';
    list.appendChild(tag);
  });
}

function renderGalList(){
  var list=$('#galListContainer');if(!list)return;list.innerHTML='';
  if(!DATA.galFotos.length){list.innerHTML='<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhuma mídia publicada.</p>';return}
  DATA.galFotos.forEach(function(f){
    var isVid=(f.tipo==='video'||f.tipo==='video_yt'||f.tipo==='video_up');
    var thumbSrc=isVid?(f.tipo==='video_up'?(f.url_thumb||f.url):ytThumb(f.video_url)):(f.url_thumb||f.url);
    var div=document.createElement('div');div.className='gal-item';
    div.innerHTML='<img src="'+(thumbSrc||'')+'" alt="" onerror="this.style.background=\'rgba(255,255,255,0.05)\'">'
      +'<input class="admin-input" value="'+esc(f.titulo)+'" placeholder="Título" onchange="galEditField(\''+f.id+'\',\'titulo\',this.value)">'
      +'<div class="gal-item-actions">'
        +'<button type="button" onclick="galMover(\''+f.id+'\',-1)">▲</button>'
        +'<button type="button" onclick="galMover(\''+f.id+'\',1)">▼</button>'
        +'<button type="button" onclick="galDeletar(\''+f.id+'\')">🗑</button>'
      +'</div>';
    list.appendChild(div);
  });
}

function renderLeads(){
  var c=$('#leadsContainer');if(!c)return;
  var leads=getFilteredLeads();
  if($('#leadsTotal'))$('#leadsTotal').textContent=DATA.leads.length;
  if(!leads.length){c.innerHTML='<p style="color:var(--text-muted);text-align:center;padding:30px 0">Nenhum lead encontrado.</p>';return}
  var h='';
  leads.forEach(function(l){
    var sel=selectedLeads[l.id]?'selected':'';
    var status=l.status||'novo';
    var waLink=l.whatsapp?'https://wa.me/'+l.whatsapp.replace(/\D/g,''):'';
    h+='<div class="lead-card '+sel+'" data-lead-id="'+l.id+'">'
      +'<div class="lead-top"><div><input type="checkbox" '+(selectedLeads[l.id]?'checked':'')+' onchange="toggleLeadSelect(\''+l.id+'\',this.checked)"> <span class="lead-name">'+(l.nome||'Sem nome')+'</span></div><span>'+(l.criado_em?new Date(l.criado_em).toLocaleDateString('pt-BR'):'—')+'</span></div>'
      +'<div>';
    if(l.whatsapp)h+='<span class="lead-tag wa" onclick="window.open(\''+waLink+'\',\'_blank\')">📱 '+esc(l.whatsapp)+'</span>';
    if(l.email)h+='<span class="lead-tag">✉ '+esc(l.email)+'</span>';
    if(l.origem)h+='<span class="lead-tag">📍 '+esc(l.origem)+'</span>';
    h+='</div>'
      +'<div style="margin-top:8px"><label style="font-size:0.75rem;color:var(--text-muted)">Status: </label><select class="admin-select" style="width:auto;display:inline-block;padding:4px 8px;" onchange="updateLeadField(\''+l.id+'\',\'status\',this.value)"><option value="novo"'+(status==='novo'?' selected':'')+'>🟡 Novo</option><option value="em_contato"'+(status==='em_contato'?' selected':'')+'>🔵 Em contato</option><option value="fechado"'+(status==='fechado'?' selected':'')+'>🟢 Fechado</option><option value="perdido"'+(status==='perdido'?' selected':'')+'>🔴 Perdido</option></select></div>'
      +'<div style="margin-top:8px"><textarea class="admin-input" onchange="updateLeadField(\''+l.id+'\',\'observacoes\',this.value)" rows="2" placeholder="Notas internas...">'+(l.observacoes||'')+'</textarea></div></div>';
  });
  c.innerHTML=h;
}

function getFilteredLeads(){
  var search=($('#leadSearch')?$('#leadSearch').value:'').toLowerCase();
  var status=($('#leadStatusFilter')?$('#leadStatusFilter').value:'');
  var origem=($('#leadOrigemFilter')?$('#leadOrigemFilter').value:'');
  return DATA.leads.filter(function(l){
    if(search){var nm=(l.nome||'').toLowerCase();var wa=(l.whatsapp||'').toLowerCase();if(nm.indexOf(search)<0&&wa.indexOf(search)<0)return false}
    if(status&&(l.status||'novo')!==status)return false;
    if(origem&&(l.origem||'')!==origem)return false;
    return true;
  });
}

function renderConfig(){
  var v=DATA.config;
  if($('#cfgNome'))$('#cfgNome').value=v.nome_site||'432UP Produções';
  if($('#cfgWa'))$('#cfgWa').value=v.whatsapp||'5511948564577';
  if($('#cfgInsta'))$('#cfgInsta').value=v.instagram||'@432up.producoes';
  if($('#cfgEmail'))$('#cfgEmail').value=v.email||'contato@432up.com';
  if($('#cfgDesc'))$('#cfgDesc').value=v.descricao||'';
  if($('#cfgWaMsg'))$('#cfgWaMsg').value=v.wa_msg_fab||'Olá! Vi o site da 432UP...';
  if($('#cfgWaOrcamento'))$('#cfgWaOrcamento').value=v.wa_msg_orcamento||'';
  if($('#cfgWaGaleria'))$('#cfgWaGaleria').value=v.wa_msg_galeria||'Olá! Vi a galeria...';
  if($('#cfgTxtPosEmail'))$('#cfgTxtPosEmail').value=v.txt_pos_email||'Deseja também falar no WhatsApp?';
  if($('#cfgTxtBtnForm'))$('#cfgTxtBtnForm').value=v.txt_btn_form||'Garantir minha data';
  if($('#cfgTxtUrgencia'))$('#cfgTxtUrgencia').value=v.txt_urgencia||'🎵 Sua data ainda está disponível...';
}

function collectCard(card){
  var obj={};
  card.querySelectorAll('[data-field]').forEach(function(el){
    var f=el.dataset.field;
    if(el.type==='checkbox')obj[f]=el.checked;
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
  if($('#vGlass'))v.glass_opacity=parseInt($('#vGlass').value)/100;
  if($('#vBlur'))v.glass_blur=parseInt($('#vBlur').value);
  if($('#vBpm'))v.bpm_global=parseInt($('#vBpm').value);
  if($('#vOrbs'))v.orbs_intensity=parseInt($('#vOrbs').value);
  if($('#vPart'))v.particles_density=parseInt($('#vPart').value);
  if($('#vTide'))v.tide_speed=parseInt($('#vTide').value)/10;
  if($('#vAmp'))v.tide_amplitude=parseInt($('#vAmp').value);
  if($('#vMotion'))v.motion_enabled=$('#vMotion').checked;
  if($('#vAurora'))v.layer_aurora=$('#vAurora').checked;
  if($('#vAlgae'))v.layer_algae=$('#vAlgae').checked;
  if($('#vParticlesOn'))v.layer_particles=$('#vParticlesOn').checked;
  if($('#vCta'))v.cta_pulse_enabled=$('#vCta').checked;
  if($('#vTema'))v.tema_ativo=$('#vTema').value;
  if($('#vHeroAnim'))v.hero_text_anim=$('#vHeroAnim').value;
  if($('#vMotionLevel'))v.motion_level=$('#vMotionLevel').value;
  
  var ok=await sbPatch('co_configuracoes',1,{valor:v,atualizado_em:new Date().toISOString()});
  if(ok){DATA.config=v;toast('Visual salvo!','ok');btnState(btn,'saved');markSaved()}
  else{toast('Erro ao salvar visual','err');btnState(btn,'error')}
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

async function saveTable(table,containerId,btn){
  btnState(btn,'saving');var cards=$$('#'+containerId+' .item-card');var ok=true;
  for(var i=0;i<cards.length;i++){
    var card=cards[i];var id=card.dataset.id;var d=collectCard(card);
    var isNew=String(id).indexOf('new_')===0;
    if(isNew){
      var body=Object.assign({},d);
      if(table==='co_calc_pacotes'){
        body.itens=JSON.stringify(body.itens||[]);
      }
      if(table==='co_calculadora_valores'){body.faixas=JSON.stringify(body.faixas||[])}
      var res=await sbPost(table,body);
      if(res&&res[0])card.dataset.id=res[0].id;else ok=false;
    }else{
      var patchBody=Object.assign({},d);
      if(table==='co_calc_pacotes'){
        patchBody.itens=JSON.stringify(patchBody.itens||[]);
      }
      if(table==='co_calculadora_valores'){patchBody.faixas=JSON.stringify(patchBody.faixas||[])}
      var r=await sbPatch(table,id,patchBody);
      if(!r)ok=false;
    }
  }
  if(ok){toast('Salvo!','ok');btnState(btn,'saved');markSaved();await loadAll()}
  else{toast('Erro ao salvar ('+table+')','err');btnState(btn,'error')}
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

function markSaved(){if($('#lastSave'))$('#lastSave').textContent='Salvo '+new Date().toLocaleTimeString('pt-BR');}

function addItem(type){
  var id='new_'+Date.now();
  if(type==='servicos'){DATA.servicos.push({id:id,servico_id:'novo',nome:'novo',nome_exibicao:'Novo Serviço',descricao:'',icone:'🎵',valor_base:0,valor_por_hora:0,valor_por_pessoa:0,faixas:[],ordem:DATA.servicos.length+1,ativo:true});renderServicos()}
  else if(type==='pacotes'){
    DATA.pacotes.push({id:id,pacote_id:'pacote_'+Date.now(),nivel:'Novo',nome:'Novo pacote',preco_pacote:0,preco_original:0,itens:[],ordem:DATA.pacotes.length+1,ativo:true});
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

function addFaixa(btn){
  var editor=btn.parentElement;
  var rows=editor.querySelectorAll('.faixa-row');
  var div=document.createElement('div');div.className='faixa-row';
  div.innerHTML='<label>Até</label><input type="number" class="admin-input faixa-ate" value=""> <label>pessoas → R$</label><input type="number" step="0.01" class="admin-input faixa-valor" value=""><button type="button" class="btn-danger btn-sm" onclick="removeFaixa(this)">✕</button>';
  editor.insertBefore(div,btn);
}
function removeFaixa(btn){btn.parentElement.remove()}

function toggleGalTipo(){
  var tipo=document.querySelector('input[name=galTipo]:checked').value;
  $('#galUploadFoto').style.display=tipo==='foto'?'':'none';
  $('#galUploadYt').style.display=tipo==='video_yt'?'':'none';
  $('#galUploadVid').style.display=tipo==='video_up'?'':'none';
}

function handleGalFiles(files){galFiles=Array.from(files).filter(function(f){return f.type.startsWith('image/')});if(galFiles.length){$('#galUploadZone').textContent=galFiles.length+' foto(s) selecionada(s)';toast(galFiles.length+' foto(s)','info')}}
function handleGalVidFile(files){var f=Array.from(files).filter(function(f){return f.type.startsWith('video/')})[0];if(!f)return;galVidFile=f;$('#galUploadZoneVid').textContent=f.name;toast('Vídeo pronto','info')}

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
    }
    galResetForm();await loadAll();
  }catch(e){toast('Erro: '+e.message,'err')}
  btn.disabled=false;btn.textContent='📤 Publicar';
}

function galResetForm(){galFiles=[];galVidFile=null;if($('#galTitulo'))$('#galTitulo').value='';}
function galEditField(id,field,value){var body={};body[field]=value;sbPatch('co_galeria_fotos',id,body).then(function(){toast('Atualizado','ok')})}
function galMover(id,dir){var idx=DATA.galFotos.findIndex(function(f){return String(f.id)===String(id)});if(idx<0)return;var n=idx+dir;if(n<0||n>=DATA.galFotos.length)return;var a=DATA.galFotos[idx],b=DATA.galFotos[n];var tmp=a.ordem;a.ordem=b.ordem;b.ordem=tmp;DATA.galFotos.splice(idx,1);DATA.galFotos.splice(n,0,a);sbPatch('co_galeria_fotos',a.id,{ordem:a.ordem});sbPatch('co_galeria_fotos',b.id,{ordem:b.ordem});renderGalList()}
function galDeletar(id){confirmShow('Excluir esta mídia?',function(yes){if(!yes)return;sbDel('co_galeria_fotos',id).then(function(){toast('Excluído','ok');loadAll()})})}
function galAddCat(){var nome=$('#galCatNome').value.trim();var emoji=$('#galCatEmoji').value.trim()||'📌';if(!nome)return;var slug=nome.toLowerCase().replace(/[^a-z0-9]/g,'');sbPost('co_galeria_categorias',{slug:slug,nome:nome,emoji:emoji,ordem:DATA.galCats.length+1}).then(function(){toast('Categoria criada','ok');loadAll()})}
function galDelCat(id){confirmShow('Excluir categoria?',function(yes){if(!yes)return;sbDel('co_galeria_categorias',id).then(function(){toast('Excluída','ok');loadAll()})})}

function filterLeads(){renderLeads();}
function toggleLeadSelect(id,checked){if(checked)selectedLeads[id]=true;else delete selectedLeads[id];}
function toggleSelectAll(){var leads=getFilteredLeads();var allSelected=leads.every(function(l){return selectedLeads[l.id]});if(allSelected){leads.forEach(function(l){delete selectedLeads[l.id]})}else{leads.forEach(function(l){selectedLeads[l.id]=true})}renderLeads();}

async function updateLeadField(id,field,value){var body={};body[field]=value;var ok=await sbPatch('co_leads',id,body);if(ok)toast('Lead atualizado','ok');}

function deleteSelectedLeads(){var ids=Object.keys(selectedLeads);if(!ids.length)return;confirmShow('Excluir '+ids.length+' lead(s)?',async function(yes){if(!yes)return;for(var i=0;i<ids.length;i++){await sbDel('co_leads',ids[i]);}selectedLeads={};toast('Excluídos','ok');await loadAll()})}

function exportCSV(){
  var leads=getFilteredLeads();if(!leads.length)return;
  var headers=['Nome','WhatsApp','Email','Origem','Status','Notas','Data'];
  var rows=[headers.join(';')];
  leads.forEach(function(l){rows.push([l.nome||'',l.whatsapp||'',l.email||'',l.origem||'',l.status||'novo',l.observacoes||'',l.criado_em||''].join(';'));});
  var blob=new Blob(['\uFEFF'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='432up_leads.csv';a.click();
}

async function loadAll(){
  if($('#dbSt')){$('#dbSt').textContent='...';$('#dbSt').style.color='var(--primary-lime)'}

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
  if($('#dbSt')){$('#dbSt').textContent=ok?'OK':'ERRO';$('#dbSt').style.color=ok?'var(--primary-lime)':'var(--danger)';}

  DATA.secoes=results[0]||[];
  DATA.servicos=results[1]||[];
  DATA.pacotes=results[2]||[];
  DATA.depoimentos=results[3]||[];
  DATA.faq=results[4]||[];
  DATA.config=(results[5]&&results[5][0])?results[5][0].valor:{};
  DATA.leads=results[6]||[];
  DATA.galFotos=results[7]||[];
  DATA.galCats=results[8]||[];

  renderVisual();renderAnimacoes();renderSecoes();renderServicos();renderPacotes();renderDepoimentos();renderFaq();renderGaleria();renderLeads();renderConfig();

  if(ok)toast('Dados sincronizados com sucesso!','ok');
}

window.$=window.$||$;
window.saveVisual=saveVisual;window.restaurarVisual=restaurarVisual;window.saveSecoes=saveSecoes;window.saveTable=saveTable;window.saveConfig=saveConfig;window.saveConfigField=saveConfigField;
window.addItem=addItem;window.removeItem=removeItem;window.loadAll=loadAll;
window.confirmShow=confirmShow;window.confirmClose=confirmClose;window.toggleTheme=toggleTheme;window.resetThemeAuto=resetThemeAuto;
window.toggleGalTipo=toggleGalTipo;window.handleGalFiles=handleGalFiles;window.handleGalVidFile=handleGalVidFile;window.galPublicar=galPublicar;
window.galEditField=galEditField;window.galMover=galMover;window.galDeletar=galDeletar;window.galAddCat=galAddCat;window.galDelCat=galDelCat;
window.filterLeads=filterLeads;window.toggleLeadSelect=toggleLeadSelect;window.toggleSelectAll=toggleSelectAll;window.deleteSelectedLeads=deleteSelectedLeads;window.exportCSV=exportCSV;
window.updateLeadField=updateLeadField;
window.addFaixa=addFaixa;window.removeFaixa=removeFaixa;
window.saveAnimacoes=saveAnimacoes;

initTheme();
loadAll();

})();
