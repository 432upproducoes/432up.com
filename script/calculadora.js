/* ==========================================================
   432UP! - CALCULADORA DE ATMOSFERA (VERSÃO COMPLETA E REVISADA)
   ========================================================== */

let dbItems = [];
let selectedAddons = {};
let packageComponents = { bronze: [], prata: [], ouro: [] };

let selection = { scale: null, hours: null, package: null, guestsText: "", guestsCount: 0 };
let calcFallbackWhatsapp = "5511948564577";
let globalFormattedPrice = "";
let globalSpecsList = [];
let activeIdForPrice = null;
let calcDebounceTimer = null;

let currentNumericPrice = 0;
let priceAnimationTimer = null;
let isPriceBlockInView = false;
let currentVipCode = '';

function isAdminMode() {
  return !!document.querySelector('.admin-bar-top');
}

/* ---------- SISTEMA DE TOAST (SUCESSO / ERRO) ---------- */
function ensureToastStyles() {
  if (document.getElementById('toast-432up-styles')) return;
  const style = document.createElement('style');
  style.id = 'toast-432up-styles';
  style.textContent = `
    #toast-432up-container {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      z-index: 99999; display: flex; flex-direction: column; align-items: center;
      gap: 10px; pointer-events: none; width: 100%; padding: 0 16px; box-sizing: border-box;
    }
    .toast-432up {
      pointer-events: auto; max-width: 420px; width: 100%; padding: 14px 18px;
      border-radius: 10px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.88rem; font-weight: 600; color: #08080A;
      box-shadow: 0 8px 28px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 10px;
      opacity: 0; transform: translateY(16px); transition: opacity 0.28s ease, transform 0.28s ease;
    }
    .toast-432up.show { opacity: 1; transform: translateY(0); }
    .toast-432up.success { background: #00FF66; }
    .toast-432up.error { background: #FF4D6D; color: #fff; }
    .toast-432up .toast-icon { font-size: 1.05rem; line-height: 1; }
  `;
  document.head.appendChild(style);
}

function showToast(message, type) {
  ensureToastStyles();
  let container = document.getElementById('toast-432up-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-432up-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast-432up ' + (type === 'error' ? 'error' : 'success');
  const icon = type === 'error' ? '⚠️' : '✅';
  toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + escapeHtml(message) + '</span>';
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4200);
}

function formatBRLInput(input) {
  let value = input.value.replace(/\D/g, ''); 
  if (!value) { input.value = ''; return; }
  let floatValue = parseFloat(value) / 100;
  input.value = floatValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function parseBRLValue(valueStr) {
  if (typeof valueStr === 'number') return isNaN(valueStr) ? 0 : valueStr;
  if (!valueStr) return 0;
  const clean = String(valueStr).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

function formatCurrencyBRL(num) {
  return num.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}

function setupMoneyMasks() {
  const moneyInputIds = ['pop-vbase', 'pop-vhora', 'pop-vpessoa', 'new-item-vbase', 'new-item-vextra', 'new-item-vpessoa'];
  moneyInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.type = 'text';
      el.addEventListener('input', (e) => formatBRLInput(e.target));
    }
  });
}

function animateValue(start, end, duration, elements) {
  if (start === end) {
    const formatted = formatCurrencyBRL(end);
    elements.forEach(el => { if (el) { el.innerText = formatted; el.classList.remove('hint-mode'); } });
    return;
  }

  if (priceAnimationTimer) clearInterval(priceAnimationTimer);

  const startTime = performance.now();

  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.floor(start + (end - start) * easeProgress);

    const formatted = formatCurrencyBRL(currentValue);
    elements.forEach(el => {
      if (el) {
        el.innerText = formatted;
        el.classList.remove('hint-mode');
      }
    });

    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    } else {
      currentNumericPrice = end;
    }
  }

  requestAnimationFrame(updateNumber);
}

function initVipCode() {
  let savedCode = sessionStorage.getItem('432up_vip_code');
  if (!savedCode) {
    const randomNum = Math.floor(Math.random() * 9000 + 1000);
    savedCode = '#UP-' + randomNum;
    sessionStorage.setItem('432up_vip_code', savedCode);
  }
  currentVipCode = savedCode;
  const vipEl = document.getElementById('vip-reservation-code');
  if (vipEl) vipEl.innerText = currentVipCode;
}

document.addEventListener('DOMContentLoaded', () => {
  initVipCode();
  setupModalHandlers();
  setupInlineEditableListeners();
  setupMultipliersListeners();
  setupClickOutsideHandlers();
  setupMoneyMasks();
  setupStickyScrollObserver();
  resetAllSelectionsInDOM();
  setupReturnBanner();
});

/* ---------- BANNER "QUE BOM TER VOCÊ DE VOLTA" & RESTAURAÇÃO ---------- */
function restoreSavedUserSelection() {
  try {
    const saved = localStorage.getItem('432up_user_project');
    if (saved) {
      const parsed = JSON.parse(saved);
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      if (parsed.timestamp && (new Date().getTime() - parsed.timestamp) < THIRTY_DAYS_MS) {
        
        if (parsed.selection) {
          selection = parsed.selection;
          
          if (selection.scale) {
            document.querySelectorAll('#group-scale .option-card').forEach(c => {
              if (c.dataset.value === selection.scale || c.dataset.slug === selection.scale) c.classList.add('selected');
            });
          }
          if (selection.hours !== null) {
            document.querySelectorAll('#group-hours .option-card').forEach(c => {
              if (parseInt(c.dataset.value, 10) === selection.hours) c.classList.add('selected');
            });
          }
          if (selection.package) {
            document.querySelectorAll('#group-package .option-card').forEach(c => {
              if (c.dataset.value === selection.package || c.dataset.slug === selection.package) c.classList.add('selected');
            });
          }
        }

        if (parsed.selectedAddons) {
          selectedAddons = parsed.selectedAddons;
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao restaurar seleções do projeto:', e);
  }
}

function setupReturnBanner() {
  const banner = document.getElementById('return-banner');
  const resetBtn = document.getElementById('btn-top-reset');
  if (!banner) return;

  try {
    const saved = localStorage.getItem('432up_user_project');
    if (saved) {
      const parsed = JSON.parse(saved);
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const isRecent = parsed.timestamp && (new Date().getTime() - parsed.timestamp) < THIRTY_DAYS_MS;
      if (isRecent) {
        banner.style.display = 'flex';
      }
    }
  } catch (e) {
    console.warn('Não foi possível ler o projeto salvo:', e);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      try {
        localStorage.removeItem('432up_user_project');
      } catch (e) {
        console.warn('Não foi possível limpar o projeto salvo:', e);
      }
      selection = { scale: null, hours: null, package: null, guestsText: "", guestsCount: 0 };
      resetAllSelectionsInDOM();
      banner.style.display = 'none';
      if (typeof updateSummaryAndPrice === 'function') updateSummaryAndPrice();
      calculateAtmosphere();
    });
  }
}

function resetAllSelectionsInDOM() {
  document.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
  document.querySelectorAll('.extra-item').forEach(item => item.classList.remove('selected'));
  selectedAddons = {};
}

/* ---------- BANCO DE DADOS & SYNC ---------- */
async function saveFieldToSupabase(itemIdentifier, colName, novoTexto, isId = false) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient || !itemIdentifier) return;
  const syncStatus = document.getElementById('admin-sync-text');
  if (syncStatus) syncStatus.innerText = 'Salvando alteração...';

  let updateData = {};

  if (colName === 'qtd_horas') {
    const parsedHours = parseInt(String(novoTexto).replace(/\D/g, '')) || 0;
    if (selection.hours !== null) selection.hours = parsedHours;
    updateData.valor_por_hora = parsedHours;
  } else if (colName === 'qtd_pessoas') {
    const parsedGuests = parseInt(String(novoTexto).replace(/\D/g, '')) || 0;
    if (selection.guestsCount !== 0) selection.guestsCount = parsedGuests;
    updateData.valor_por_pessoa = parsedGuests;
  } else if (colName === 'descricao') {
    updateData.descricao = novoTexto;
  } else if (colName === 'valor_base') {
    updateData.valor_base = parseBRLValue(novoTexto);
  } else {
    updateData.nome = novoTexto;
    updateData.nome_exibicao = novoTexto;
  }

  try {
    let query = supabaseClient.from('calculadora_valores').select('id, categoria');
    query = isId ? query.eq('id', itemIdentifier) : query.eq('slug', itemIdentifier);

    const { data: existing } = await query.maybeSingle();

    let error = null;
    if (existing) {
      if (existing.categoria) updateData.categoria = existing.categoria;
      let updateQuery = supabaseClient.from('calculadora_valores').update(updateData);
      updateQuery = isId ? updateQuery.eq('id', itemIdentifier) : updateQuery.eq('slug', itemIdentifier);
      const res = await updateQuery;
      error = res.error;
    } else {
      const isLayoutText = String(itemIdentifier).includes('hero') || String(itemIdentifier).includes('step') || String(itemIdentifier).includes('title');
      const cat = isLayoutText ? 'texto_layout' : 'adicional';
      const res = await supabaseClient.from('calculadora_valores').insert([{
        slug: isId ? 'addon_' + itemIdentifier : itemIdentifier, categoria: cat, ativo: true, ...updateData
      }]);
      error = res.error;
    }

    if (error) {
      console.error('Erro Supabase:', error);
      if (syncStatus) syncStatus.innerText = 'Erro ao salvar alteração.';
    } else {
      if (syncStatus) syncStatus.innerText = 'Alteração salva no Supabase!';
      const local = dbItems.find(i => isId ? String(i.id) === String(itemIdentifier) : i.slug === itemIdentifier);
      if (local) Object.assign(local, updateData);
      calculateAtmosphere();
    }
  } catch (err) {
    console.error('Erro ao salvar:', err);
    if (syncStatus) syncStatus.innerText = 'Erro ao salvar alteração.';
  }
}

function setupInlineEditableListeners() {
  document.removeEventListener('focusout', handleGlobalFocusOut);
  document.addEventListener('focusout', handleGlobalFocusOut);
}

async function handleGlobalFocusOut(e) {
  const targetEl = e.target;
  if (!targetEl || typeof targetEl.getAttribute !== 'function' || targetEl.getAttribute('contenteditable') !== 'true') return;

  let itemSlug = targetEl.getAttribute('data-db-item');
  let itemId = targetEl.getAttribute('data-db-id');

  if (!itemSlug && !itemId) {
    const closestDb = targetEl.closest('[data-db-item], [data-db-id]');
    if (closestDb) {
      itemSlug = closestDb.getAttribute('data-db-item');
      itemId = closestDb.getAttribute('data-db-id');
    }
  }

  const colName = targetEl.getAttribute('data-db-col') || 'nome';
  let novoTexto = (itemSlug === 'titulo_hero') ? targetEl.innerHTML.trim() : (targetEl.innerText || '').trim();

  if (colName === 'nome' && itemSlug !== 'titulo_hero') {
    novoTexto = novoTexto.replace(/\s*\(R\$\s*[\d.,]+\)\s*/g, '').trim();
  }

  if ((itemId || itemSlug) && novoTexto !== '') {
    if (itemId) await saveFieldToSupabase(itemId, colName, novoTexto, true);
    else await saveFieldToSupabase(itemSlug, colName, novoTexto, false);
  }
}

function debouncedCalculate() {
  if (calcDebounceTimer) clearTimeout(calcDebounceTimer);
  calcDebounceTimer = setTimeout(() => { calculateAtmosphere(); }, 80);
}

function setupMultipliersListeners() {
  document.querySelectorAll('#group-scale strong[data-db-col="qtd_pessoas"]').forEach(el => {
    el.addEventListener('input', (e) => {
      const card = e.target.closest('.option-card');
      if (card && card.classList.contains('selected')) {
        selection.guestsCount = parseInt(String(e.target.innerText).replace(/\D/g, '')) || 0;
        selection.guestsText = card.querySelector('.sub') ? card.querySelector('.sub').innerText : '';
        debouncedCalculate();
      }
    });
  });

  document.querySelectorAll('#group-hours strong[data-db-col="qtd_horas"]').forEach(el => {
    el.addEventListener('input', (e) => {
      const card = e.target.closest('.option-card');
      if (card && card.classList.contains('selected')) {
        selection.hours = parseInt(String(e.target.innerText).replace(/\D/g, '')) || 0;
        debouncedCalculate();
      }
    });
  });
}

async function loadDynamicContentFromDatabase() {
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const { data: items, error } = await supabaseClient.from('calculadora_valores').select('*').order('ordem', { ascending: true });
      if (!error && items && items.length > 0) {
        dbItems = items;
        items.forEach(item => {
          if (!item.slug && !item.id) return;
          const selector = item.slug ? '[data-slug="' + item.slug + '"], [data-value="' + item.slug + '"], [data-db-item="' + item.slug + '"]' : '[data-db-id="' + item.id + '"]';
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.hasAttribute('data-db-col')) {
              const col = el.getAttribute('data-db-col');
              if (col === 'qtd_horas' && item.valor_por_hora != null) el.innerText = item.valor_por_hora;
              else if (col === 'qtd_pessoas' && item.valor_por_pessoa != null) el.innerText = item.valor_por_pessoa;
              else if (col === 'descricao' && item.descricao != null) el.innerText = item.descricao;
              else if (col === 'nome' && (item.nome || item.nome_exibicao)) {
                if (item.slug === 'titulo_hero') el.innerHTML = item.nome || item.nome_exibicao;
                else el.innerText = item.nome || item.nome_exibicao;
              }
              return;
            }
          });
        });

        const step4Visibility = dbItems.find(i => i.slug === 'step4_visibilidade');
        const step4Container = document.getElementById('step4-container');
        const step4ToggleInput = document.getElementById('step4-master-toggle');

        if (step4Visibility) {
          const isVisible = step4Visibility.ativo !== false;
          if (step4ToggleInput) step4ToggleInput.checked = isVisible;
          if (!isAdminMode() && step4Container) step4Container.style.display = isVisible ? 'block' : 'none';
        }

        const { data: pkgComp } = await supabaseClient.from('pacote_componentes').select('*');
        packageComponents = { bronze: [], prata: [], ouro: [] };
        if (pkgComp) {
          pkgComp.forEach(c => {
            if (packageComponents[c.pacote_slug]) packageComponents[c.pacote_slug].push(c.item_id);
          });
        }
        
        restoreSavedUserSelection();
        renderAddonsFromMainTable();
        renderPackageDropdowns();
      }
    }
  } catch (e) {
    console.warn('Sincronização offline / fallback:', e);
  }
  calculateAtmosphere();
}

/* ---------- RENDERIZAÇÃO DE COMPONENTES ---------- */
function renderAddonsFromMainTable() {
  const listContainer = document.getElementById('dynamic-addons-list');
  if (!listContainer) return;
  const admin = isAdminMode();
  const addons = dbItems.filter(i => {
    const cat = (i.categoria || '').toLowerCase().trim();
    if (cat !== 'adicional') return false;
    if (admin) return true;
    return i.ativo !== false;
  });

  if (addons.length === 0) {
    listContainer.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-size: 0.85rem; padding: 10px;">Nenhum adicional cadastrado.</div>';
    return;
  }

  listContainer.innerHTML = addons.map(addon => {
    const isSelected = selectedAddons[addon.id] ? 'selected' : '';
    let nome = addon.nome || addon.nome_exibicao || 'Adicional';
    nome = String(nome).replace(/\s*\(R\$\s*[\d.,]+\)\s*/g, '').trim();
    const desc = addon.descricao || '';
    const precoVal = parseBRLValue(addon.valor_base);
    const preco = precoVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const isAtivo = addon.ativo !== false;

    return '<div class="extra-item glass-card ' + isSelected + '" data-id="' + escapeHtml(addon.id) + '" onclick="handleDynamicAddonClick(\'' + escapeHtml(addon.id) + '\', event, this)">' +
      '<div style="flex: 1;">' +
      '<h5 style="display:flex; align-items:baseline; flex-wrap:wrap; gap:4px;">' +
      '<span ' + (admin ? 'contenteditable="true" data-db-id="' + escapeHtml(addon.id) + '" data-db-col="nome"' : '') + '>' + escapeHtml(nome) + '</span>' +
      (admin ? '<span class="addon-price-tag">(' + preco + ')</span>' : '') + '</h5>' +
      '<p ' + (admin ? 'contenteditable="true" data-db-id="' + escapeHtml(addon.id) + '" data-db-col="descricao"' : '') + '>' + escapeHtml(desc) + '</p>' +
      (admin ? '<div class="admin-toggle-wrapper" onclick="event.stopPropagation()"><span>Exibir no Front:</span><label class="switch"><input type="checkbox" ' + (isAtivo ? 'checked' : '') + ' onchange="toggleAddonVisibility(\'' + escapeHtml(addon.id) + '\', this.checked)"><span class="slider"></span></label></div>' : '') +
      '</div><div style="display:flex; align-items:center; gap:8px;">' +
      (admin ? '<button type="button" class="btn-edit-price-tag" onclick="openPricePopover(event, \'' + escapeHtml(addon.id) + '\')">Preço</button>' : '') +
      (admin ? '<span onclick="deleteAddonItem(event, \'' + escapeHtml(addon.id) + '\')" style="cursor:pointer; font-size:0.9rem;" title="Excluir">X</span>' : '') +
      '<div class="checkbox-custom"></div></div></div>';
  }).join('');
}

async function toggleAddonVisibility(id, isChecked) {
  const syncStatus = document.getElementById('admin-sync-text');
  if (syncStatus) syncStatus.innerText = 'Atualizando visibilidade...';
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      await supabaseClient.from('calculadora_valores').update({ ativo: isChecked, categoria: 'adicional' }).eq('id', id);
      const item = dbItems.find(i => String(i.id) === String(id));
      if (item) item.ativo = isChecked;
      if (syncStatus) syncStatus.innerText = 'Visibilidade atualizada!';
    }
  } catch (err) {
    if (syncStatus) syncStatus.innerText = 'Erro ao alterar visibilidade.';
  }
}

async function toggleStep4MasterVisibility(isChecked) {
  const syncStatus = document.getElementById('admin-sync-text');
  if (syncStatus) syncStatus.innerText = 'Atualizando visibilidade do Passo 4...';
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const { data: existing } = await supabaseClient.from('calculadora_valores').select('id').eq('slug', 'step4_visibilidade').maybeSingle();
      if (existing) {
        await supabaseClient.from('calculadora_valores').update({ ativo: isChecked }).eq('slug', 'step4_visibilidade');
      } else {
        await supabaseClient.from('calculadora_valores').insert([{ slug: 'step4_visibilidade', categoria: 'texto_layout', ativo: isChecked }]);
      }
      if (syncStatus) syncStatus.innerText = 'Visibilidade do Passo 4 salva!';
    }
  } catch (err) {
    if (syncStatus) syncStatus.innerText = 'Erro ao alterar visibilidade do Passo 4.';
  }
}

/* ---------- DROPDOWN DE PACOTES (PORTAL + VISUAL DO ESCOPO) ---------- */
function renderPackageDropdowns(filterText) {
  filterText = filterText || '';
  const admin = isAdminMode();
  const allAddons = dbItems.filter(i => (i.categoria || '').toLowerCase().trim() === 'adicional');

  ['bronze', 'prata', 'ouro'].forEach(function(pkg) {
    const dropMenu = document.getElementById('dropdown-' + pkg);
    const selectedList = document.getElementById('selected-' + pkg);
    const wasActive = dropMenu && dropMenu.classList.contains('active');

    if (dropMenu && admin) {
      const filteredAddons = allAddons.filter(function(a) {
        const n = (a.nome || a.nome_exibicao || '').toLowerCase().replace(/\s*\(r\$\s*[\d.,]+\)\s*/g, '');
        return n.includes(filterText.toLowerCase());
      });
      var html = '<input type="text" class="pkg-search-input" placeholder="Pesquisar item..." value="' + escapeHtml(filterText) + '" oninput="filterPackageDropdown(\'' + pkg + '\', this.value)" onclick="event.stopPropagation()"><div class="pkg-dropdown-list-items">';
      if (filteredAddons.length > 0) {
        filteredAddons.forEach(function(addon) {
          var n = String(addon.nome || addon.nome_exibicao || '').replace(/\s*\(R\$\s*[\d.,]+\)\s*/g, '').trim();
          html += '<div class="pkg-dropdown-item" onclick="addItemToPackage(\'' + pkg + '\', \'' + escapeHtml(addon.id) + '\')"><span>' + escapeHtml(n) + '</span><span style="color:#00FF66;">+ Add</span></div>';
        });
      } else {
        html += '<div style="font-size:0.72rem; color:rgba(255,255,255,0.4); padding:6px; text-align:center;">Nenhum item encontrado</div>';
      }
      html += '</div>';
      dropMenu.innerHTML = html;

      if (wasActive) {
        dropMenu.classList.add('active');
        positionPkgDropdown(pkg);
      }
    }

    if (selectedList) {
      const selectedIds = packageComponents[pkg] || [];
      const itemsInPkg = allAddons.filter(function(i) {
        return selectedIds.includes(i.id) || selectedIds.includes(String(i.id));
      });

      selectedList.innerHTML = '<ul class="pkg-specs-list">' +
        itemsInPkg.map(function(addon) {
          var n = String(addon.nome || addon.nome_exibicao || '').replace(/\s*\(R\$\s*[\d.,]+\)\s*/g, '').trim();
          return '<li data-id="' + escapeHtml(addon.id) + '"><span class="dot"></span><span>' + escapeHtml(n) + '</span>' +
            (admin ? '<span class="btn-remove-pkg" onclick="removeItemFromPackage(event, \'' + pkg + '\', \'' + escapeHtml(addon.id) + '\')">&times;</span>' : '') +
            '</li>';
        }).join('') +
      '</ul>';
    }
  });
}

function positionPkgDropdown(pkg) {
  const menu = document.getElementById('dropdown-' + pkg);
  if (!menu) return;
  const anchorBtn = document.querySelector(
    '.option-card[data-slug="' + pkg + '"] .btn-add-pkg-item, .option-card[data-value="' + pkg + '"] .btn-add-pkg-item'
  );
  const anchor = anchorBtn || menu.closest('.option-card') || menu._originalParent;
  if (!anchor) return;

  if (menu.parentElement !== document.body) {
    menu._originalParent = menu.parentElement;
    document.body.appendChild(menu);
  }

  const rect = anchor.getBoundingClientRect();
  const menuWidth = Math.min(300, window.innerWidth - 16);
  let left = rect.left;
  let top = rect.bottom + 6;

  if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
  if (left < 8) left = 8;
  if (top + 240 > window.innerHeight) top = Math.max(8, rect.top - 240);

  menu.style.position = 'fixed';
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  menu.style.width = menuWidth + 'px';
  menu.style.maxWidth = 'calc(100vw - 16px)';
  menu.style.right = 'auto';
  menu.style.zIndex = '999999';
}

function restorePkgDropdown(pkg) {
  const menu = document.getElementById('dropdown-' + pkg);
  if (!menu) return;
  menu.classList.remove('active');
  if (menu._originalParent) {
    menu._originalParent.appendChild(menu);
    menu.style.position = '';
    menu.style.left = '';
    menu.style.top = '';
    menu.style.width = '';
    menu.style.maxWidth = '';
    menu.style.right = '';
    menu.style.zIndex = '';
  }
}

function filterPackageDropdown(pkg, text) {
  renderPackageDropdowns(text);
  const menu = document.getElementById('dropdown-' + pkg);
  if (menu) {
    menu.classList.add('active');
    positionPkgDropdown(pkg);
    const input = menu.querySelector('.pkg-search-input');
    if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  }
}

async function addItemToPackage(pkgSlug, itemId) {
  if (!packageComponents[pkgSlug]) packageComponents[pkgSlug] = [];
  if (!packageComponents[pkgSlug].includes(itemId) && !packageComponents[pkgSlug].includes(String(itemId))) {
    packageComponents[pkgSlug].push(itemId);
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      await supabaseClient.from('pacote_componentes').insert([{ pacote_slug: pkgSlug, item_id: itemId }]);
    }
    renderPackageDropdowns();
    calculateAtmosphere();
  }
}

async function removeItemFromPackage(event, pkgSlug, itemId) {
  event.stopPropagation();
  packageComponents[pkgSlug] = packageComponents[pkgSlug].filter(function(id) { return String(id) !== String(itemId); });
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    await supabaseClient.from('pacote_componentes').delete().eq('pacote_slug', pkgSlug).eq('item_id', itemId);
  }
  renderPackageDropdowns();
  calculateAtmosphere();
}

function togglePkgDropdown(event, pkg) {
  event.stopPropagation();
  const target = document.getElementById('dropdown-' + pkg);
  const isActive = target && target.classList.contains('active');

  ['bronze', 'prata', 'ouro'].forEach(function(p) { if (p !== pkg) restorePkgDropdown(p); });
  document.querySelectorAll('.option-card').forEach(function(c) { c.style.zIndex = ''; });

  if (target && !isActive) {
    renderPackageDropdowns();
    target.classList.add('active');
    positionPkgDropdown(pkg);
    setTimeout(function() { const input = target.querySelector('.pkg-search-input'); if (input) input.focus(); }, 50);
  } else if (target) {
    restorePkgDropdown(pkg);
  }
}

async function deleteAddonItem(event, id) {
  event.stopPropagation();
  if (!confirm('Tem certeza que deseja excluir este adicional do banco?')) return;
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    await supabaseClient.from('calculadora_valores').delete().eq('id', id);
    await supabaseClient.from('pacote_componentes').delete().eq('item_id', id);
    await loadDynamicContentFromDatabase();
  }
}

/* ---------- TOGGLE DE SELEÇÃO UNIFICADO ---------- */
function handleDynamicAddonClick(id, event, element) {
  if (event.target.closest('.admin-toggle-wrapper, .btn-edit-price-tag, [contenteditable="true"]')) return;
  element.classList.toggle('selected');
  selectedAddons[id] = element.classList.contains('selected');
  calculateAtmosphere();
}

/* ---------- CÁLCULO DE VALORES E PERSISTÊNCIA ---------- */
function calculateAtmosphere() {
  const priceEl = document.getElementById('total-price');
  const stickyPriceEl = document.getElementById('sticky-total-price');
  const stickyBar = document.getElementById('mobile-sticky-bar');
  const stickyBtnWhatsapp = document.getElementById('sticky-btn-whatsapp');

  const pkg = selection.package;
  const scale = selection.scale;
  const hours = selection.hours;
  const guests = selection.guestsCount;

  const hasAddonSelected = Object.values(selectedAddons).some(v => v === true);
  const hasAnySelection = pkg || scale || hours !== null || hasAddonSelected;

  if (!hasAnySelection) {
    if (stickyBar) stickyBar.classList.remove('visible');

    const welcomeMsg = "Selecione as opções do seu projeto ao lado para simular em tempo real.";
    if (priceEl) { priceEl.innerText = welcomeMsg; priceEl.classList.add('hint-mode'); }
    if (stickyPriceEl) { stickyPriceEl.innerText = "Selecione os itens abaixo."; stickyPriceEl.classList.add('hint-mode'); }

    if (document.getElementById('sum-guests')) document.getElementById('sum-guests').innerText = "Não selecionado";
    if (document.getElementById('sum-hours')) document.getElementById('sum-hours').innerText = "Não selecionado";
    if (document.getElementById('sum-package')) document.getElementById('sum-package').innerText = "Não selecionado";
    if (document.getElementById('sum-service-details')) {
      document.getElementById('sum-service-details').innerHTML = '<li>Aguardando seleções do projeto</li>';
    }
    currentNumericPrice = 0;
    return;
  }

  const isMobile = window.innerWidth <= 768;
  if (stickyBar) {
    if (isMobile && hasAnySelection && !isPriceBlockInView) {
      stickyBar.classList.add('visible');
    } else {
      stickyBar.classList.remove('visible');
    }
  }

  let missingSteps = [];
  if (!scale && guests === 0) missingSteps.push("pessoas");
  if (hours === null) missingSteps.push("duração");
  if (!pkg) missingSteps.push("pacote");

  if (stickyBtnWhatsapp) {
    if (missingSteps.length > 0) {
      stickyBtnWhatsapp.classList.remove('ready-state');
      stickyBtnWhatsapp.innerText = "Próxima Etapa ↓";
      stickyBtnWhatsapp.style.background = "rgba(168, 85, 247, 0.18)";
      stickyBtnWhatsapp.style.color = "#E2E8F0";
      stickyBtnWhatsapp.style.border = "1px solid rgba(168, 85, 247, 0.4)";
      stickyBtnWhatsapp.style.boxShadow = "none";
      stickyBtnWhatsapp.style.backdropFilter = "blur(12px)";
      stickyBtnWhatsapp.href = "javascript:void(0);";

      stickyBtnWhatsapp.onclick = (e) => {
        e.preventDefault();

        let target = null;
        let mensagemEducada = "";

        if (!scale && guests === 0) {
          target = document.getElementById('group-scale') || document.querySelector('.step-section');
          mensagemEducada = "Por favor, selecione a escala ou quantidade de pessoas para continuarmos o seu projeto.";
        } else if (hours === null) {
          target = document.getElementById('group-hours');
          mensagemEducada = "Quase lá! Poderia escolher a duração ideal para a sua experiência?";
        } else if (!pkg) {
          target = document.getElementById('group-package');
          mensagemEducada = "Para finalizar, escolha o pacote que melhor traduz a atmosfera desejada.";
        }

        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.info("432UP! Condução: " + mensagemEducada);
        }
      };
    } else {
      stickyBtnWhatsapp.classList.add('ready-state');
      stickyBtnWhatsapp.innerText = "Solicitar Orçamento →";
      stickyBtnWhatsapp.style.background = "";
      stickyBtnWhatsapp.style.color = "";
      stickyBtnWhatsapp.style.border = "";
      stickyBtnWhatsapp.style.boxShadow = "";
      stickyBtnWhatsapp.style.backdropFilter = "";
      stickyBtnWhatsapp.onclick = null;
    }
  }

  let guidanceMessage = "";
  if (missingSteps.length > 0) {
    if (missingSteps.length === 3) {
      guidanceMessage = "Defina pessoas, duração e selecione o pacote.";
    } else if (missingSteps.length === 2) {
      guidanceMessage = "Selecione " + missingSteps.join(" e ") + " do evento.";
    } else {
      guidanceMessage = "Falta selecionar " + missingSteps[0] + ".";
    }
  }

  let basePrice = 0;
  const itemPkg = pkg ? dbItems.find(i => i.slug === pkg) : null;
  const itemIdsInPkg = (pkg && packageComponents[pkg]) ? packageComponents[pkg] : [];
  if (pkg && itemIdsInPkg.length > 0 && itemPkg) {
    basePrice = parseBRLValue(itemPkg.valor_base);
  }

  let totalItensAdicionais = 0;
  globalSpecsList = [];


    const processItemCost = (item) => {
    const vBase = parseBRLValue(item.valor_base);
    const vExtraHora = parseBRLValue(item.valor_por_hora);
    const vPorPessoa = parseBRLValue(item.valor_por_pessoa);
    const aCada = parseBRLValue(item.a_cada_pessoas) || 100;
const hMin = parseBRLValue(item.hora_minima) || 1;

    let custoHoras = 0;
    if (hours !== null && hours > hMin && vExtraHora > 0) {
const horasExcedentes = hours - hMin;
custoHoras = horasExcedentes * vExtraHora;
    }

    let custoPessoas = 0;
    if (guests > aCada && vPorPessoa > 0 && aCada > 0) {
      const pessoasExcedentes = guests - aCada;
      const blocosExcedentes = Math.ceil(pessoasExcedentes / aCada);
      custoPessoas = blocosExcedentes * vPorPessoa;
    }

    return vBase + custoHoras + custoPessoas;
  };

  if (pkg && itemIdsInPkg.length > 0) {
    dbItems
      .filter(i => itemIdsInPkg.includes(i.id) || itemIdsInPkg.includes(String(i.id)))
      .forEach(comp => {
        const cleanName = String(comp.nome || comp.nome_exibicao || '')
          .replace(/\s*\(R\$\s*[\d.,]+\)\s*/g, '')
          .trim();
        if (cleanName && !globalSpecsList.includes(cleanName)) {
          globalSpecsList.push(cleanName);
        }
        totalItensAdicionais += processItemCost(comp);
      });
  }

  const admin = isAdminMode();
  dbItems
    .filter(i => {
      if ((i.categoria || '').toLowerCase().trim() !== 'adicional') return false;
      return admin ? true : i.ativo !== false;
    })
    .forEach(addon => {
      if (selectedAddons[addon.id]) {
        totalItensAdicionais += processItemCost(addon);
        const cleanName = String(addon.nome || addon.nome_exibicao || '')
          .replace(/\s*\(R\$\s*[\d.,]+\)\s*/g, '')
          .trim();
        if (cleanName && !globalSpecsList.includes(cleanName)) {
          globalSpecsList.push(cleanName);
        }
      }
    });

  const finalTotal = basePrice + totalItensAdicionais;

  if (document.getElementById('sum-guests')) {
    document.getElementById('sum-guests').innerText =
      selection.guestsText || (guests ? guests + ' pessoas' : 'Não selecionado');
  }
  if (document.getElementById('sum-hours')) {
    document.getElementById('sum-hours').innerText =
      hours !== null ? hours + ' horas' : 'Não selecionado';
  }
  if (document.getElementById('sum-package')) {
    document.getElementById('sum-package').innerText =
      pkg ? pkg.toUpperCase() : 'Não selecionado';
  }
  if (document.getElementById('sum-service-details')) {
    document.getElementById('sum-service-details').innerHTML =
      globalSpecsList.length > 0
        ? globalSpecsList.map(item => '<li>' + escapeHtml(item) + '</li>').join('')
        : '<li>Rider técnico conforme itens selecionados</li>';
  }

  if (finalTotal > 0) {
    globalFormattedPrice = formatCurrencyBRL(finalTotal);

    if (priceEl) {
      priceEl.innerText = globalFormattedPrice;
      priceEl.classList.remove('hint-mode');
    }
    if (stickyPriceEl) {
      stickyPriceEl.innerText = globalFormattedPrice;
      stickyPriceEl.classList.remove('hint-mode');
    }

    animateValue(currentNumericPrice, finalTotal, 450, [priceEl, stickyPriceEl]);
  } else {
    if (priceEl) {
      priceEl.innerText = guidanceMessage || "Defina pessoas, duração e selecione o pacote.";
      priceEl.classList.add('hint-mode');
    }
    if (stickyPriceEl) {
      stickyPriceEl.innerText = guidanceMessage || "Defina pessoas, duração e selecione o pacote.";
      stickyPriceEl.classList.add('hint-mode');
    }
  }

  currentNumericPrice = finalTotal;

  try {
    localStorage.setItem('432up_user_project', JSON.stringify({
      selection: selection,
      selectedAddons: selectedAddons,
      timestamp: new Date().getTime()
    }));
  } catch (e) {
    console.warn('Não foi possível salvar a seleção local:', e);
  }

  const msg = encodeURIComponent(
    'Olá! Gostaria de validar meu Projeto de Atmosfera 432UP!:\n' +
    (currentVipCode ? 'Código de Reserva VIP: *' + currentVipCode + '*\n\n' : '') +
    (pkg ? '- Rider: ' + pkg.toUpperCase() + '\n' : '') +
    (selection.guestsText ? '- Escala: ' + selection.guestsText + '\n' : '') +
    (hours !== null ? '- Duração: ' + hours + 'h\n' : '') +
    '- Investimento Estimado: ' + (globalFormattedPrice || 'Sob consulta')
  );

  const targetWhatsappUrl = 'https://wa.me/' + calcFallbackWhatsapp + '?text=' + msg;
  const btnWhatsapp = document.getElementById('btn-whatsapp');
  if (btnWhatsapp) btnWhatsapp.href = targetWhatsappUrl;
  if (missingSteps.length === 0 && stickyBtnWhatsapp) {
    stickyBtnWhatsapp.href = targetWhatsappUrl;
  }
}

/* ---------- POPOVERS & MODAIS ---------- */
function openPricePopover(event, id) {
  event.stopPropagation();
  activeIdForPrice = id;
  const popover = document.getElementById('price-popover');
  if (!popover) return;
  const rect = event.currentTarget.getBoundingClientRect();
  let top = rect.bottom + 8;
  let left = Math.min(rect.left, window.innerWidth - 300);
  if (top + 320 > window.innerHeight) top = Math.max(8, rect.top - 320);
  popover.style.top = top + 'px';
  popover.style.left = Math.max(8, left) + 'px';

  const item = dbItems.find(function(i) { return String(i.id) === String(id); });
  if (item) {
    if (document.getElementById('pop-vbase')) {
      const v = parseBRLValue(item.valor_base);
      document.getElementById('pop-vbase').value = 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    if (document.getElementById('pop-vhora')) {
      const v = parseBRLValue(item.valor_por_hora);
      document.getElementById('pop-vhora').value = 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    if (document.getElementById('pop-hmin')) document.getElementById('pop-hmin').value = item.hora_minima || 1;
    if (document.getElementById('pop-vpessoa')) {
      const v = parseBRLValue(item.valor_por_pessoa);
      document.getElementById('pop-vpessoa').value = 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    if (document.getElementById('pop-acada')) document.getElementById('pop-acada').value = item.a_cada_pessoas || 100;
  }
  popover.classList.add('active');
}

async function savePriceFromPopover() {
  if (!activeIdForPrice) return;
  const vBase = parseBRLValue(document.getElementById('pop-vbase').value);
  const vHora = parseBRLValue(document.getElementById('pop-vhora').value);
  const hMin = parseInt(document.getElementById('pop-hmin').value) || 1;
  const vPessoa = parseBRLValue(document.getElementById('pop-vpessoa').value);
  const aCada = parseInt(document.getElementById('pop-acada').value) || 100;
  const syncStatus = document.getElementById('admin-sync-text');

  if (syncStatus) syncStatus.innerText = 'Atualizando preços...';
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const payload = { valor_base: vBase, valor_por_hora: vHora, hora_minima: hMin, valor_por_pessoa: vPessoa, a_cada_pessoas: aCada, categoria: 'adicional' };
      const res = await supabaseClient.from('calculadora_valores').update(payload).eq('id', activeIdForPrice);
      if (res.error) {
        if (syncStatus) syncStatus.innerText = 'Erro ao salvar preço.';
      } else {
        if (syncStatus) syncStatus.innerText = 'Preço atualizado no banco!';
        const pop = document.getElementById('price-popover');
        if (pop) pop.classList.remove('active');
        await loadDynamicContentFromDatabase();
      }
    }
  } catch (err) {
    if (syncStatus) syncStatus.innerText = 'Erro ao salvar preço.';
  }
}

function toggleNewItemModal(event) {
  if (event) event.stopPropagation();
  const pop = document.getElementById('new-item-popover');
  if (pop) pop.classList.toggle('active');
}

function closeNewItemModal() {
  const pop = document.getElementById('new-item-popover');
  if (pop) pop.classList.remove('active');
}

async function saveNewItemToDatabase() {
  const nome = document.getElementById('new-item-nome').value.trim();
  const desc = document.getElementById('new-item-desc').value.trim();
  const vBase = parseBRLValue(document.getElementById('new-item-vbase').value);
  const vExtra = parseBRLValue(document.getElementById('new-item-vextra').value);
  const hMin = parseInt(document.getElementById('new-item-hmin').value) || 1;
  const vPessoa = parseBRLValue(document.getElementById('new-item-vpessoa').value);
  const aCada = parseInt(document.getElementById('new-item-acada').value) || 100;
  const syncStatus = document.getElementById('admin-sync-text');

  if (!nome) return alert('Informe o nome do item.');
  const newSlug = 'addon_' + Date.now();
  if (syncStatus) syncStatus.innerText = 'Cadastrando item...';
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const { error } = await supabaseClient.from('calculadora_valores').insert([{
        slug: newSlug, categoria: 'adicional', nome: nome, nome_exibicao: nome, descricao: desc,
        valor_base: vBase, valor_por_hora: vExtra, hora_minima: hMin, valor_por_pessoa: vPessoa, a_cada_pessoas: aCada, ativo: true
      }]);
      if (error) {
        alert('Erro ao cadastrar: ' + error.message);
      } else {
        if (syncStatus) syncStatus.innerText = 'Novo item cadastrado no banco!';
        closeNewItemModal();
        ['new-item-nome', 'new-item-desc', 'new-item-vbase', 'new-item-vextra', 'new-item-vpessoa'].forEach(function(id) {
          const el = document.getElementById(id); if (el) el.value = '';
        });
        if (document.getElementById('new-item-hmin')) document.getElementById('new-item-hmin').value = '2';
        if (document.getElementById('new-item-acada')) document.getElementById('new-item-acada').value = '100';
        await loadDynamicContentFromDatabase();
      }
    }
  } catch (err) {
    alert('Erro no cadastro.');
  }
}

function setupModalHandlers() {
  const contactOverlay = document.getElementById('contact-overlay');
  const closeBtn = document.getElementById('contact-modal-close-btn');
  ['nav-trigger-modal', 'nav-trigger-modal-mobile', 'btn-trigger-modal-call', 'sticky-btn-trigger-modal'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        if (contactOverlay) { contactOverlay.style.display = 'flex'; setTimeout(function() { contactOverlay.classList.add('open', 'active'); }, 10); }
      });
    }
  });
  if (closeBtn && contactOverlay) {
    closeBtn.addEventListener('click', function() {
      contactOverlay.classList.remove('open', 'active');
      setTimeout(function() { contactOverlay.style.display = 'none'; }, 300);
    });
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- SELEÇÃO DE CARDS (DESELECIONÁVEIS) ---------- */
document.querySelectorAll('#group-scale .option-card').forEach(function(card) {
  card.addEventListener('click', function(e) {
    if (e.target.getAttribute('contenteditable') === 'true' || e.target.classList.contains('btn-edit-price-tag')) return;

    const isAlreadySelected = card.classList.contains('selected');
    document.querySelectorAll('#group-scale .option-card').forEach(function(c) { c.classList.remove('selected'); });

    if (isAlreadySelected) {
      selection.scale = null; selection.guestsCount = 0; selection.guestsText = "";
    } else {
      card.classList.add('selected');
      selection.scale = card.dataset.value || card.dataset.slug;
      const strongPessoas = card.querySelector('strong[data-db-col="qtd_pessoas"]');
      selection.guestsCount = strongPessoas ? parseInt(String(strongPessoas.innerText).replace(/\D/g, '')) || 0 : 0;
      selection.guestsText = card.querySelector('.sub') ? card.querySelector('.sub').innerText : '';
    }
    calculateAtmosphere();
  });
});

document.querySelectorAll('#group-hours .option-card').forEach(function(card) {
  card.addEventListener('click', function(e) {
    if (e.target.getAttribute('contenteditable') === 'true' || e.target.classList.contains('btn-edit-price-tag')) return;

    const isAlreadySelected = card.classList.contains('selected');
    document.querySelectorAll('#group-hours .option-card').forEach(function(c) { c.classList.remove('selected'); });

    if (isAlreadySelected) {
      selection.hours = null;
    } else {
      card.classList.add('selected');
      const strongHoras = card.querySelector('strong[data-db-col="qtd_horas"]');
      selection.hours = strongHoras
        ? parseInt(String(strongHoras.innerText).replace(/\D/g, '')) || 0
        : parseInt(card.dataset.value, 10) || 0;
    }
    calculateAtmosphere();
  });
});

document.querySelectorAll('#group-package .option-card').forEach(function(card) {
  card.addEventListener('click', function(e) {
    if (e.target.getAttribute('contenteditable') === 'true' || e.target.closest('.btn-add-pkg-item') || e.target.closest('.pkg-dropdown-menu') || e.target.classList.contains('btn-edit-price-tag')) return;

    const isAlreadySelected = card.classList.contains('selected');
    document.querySelectorAll('#group-package .option-card').forEach(function(c) { c.classList.remove('selected'); });

    if (isAlreadySelected) {
      selection.package = null;
    } else {
      card.classList.add('selected');
      selection.package = card.dataset.value || card.dataset.slug;
    }
    calculateAtmosphere();
  });
});

/* ---------- CLIQUES EXTERNOS ---------- */
function setupClickOutsideHandlers() {
  document.addEventListener('click', function(e) {
    if (e.target.getAttribute('contenteditable') === 'true' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (!e.target.closest('.btn-add-pkg-item') && !e.target.closest('.pkg-dropdown-menu')) {
      ['bronze', 'prata', 'ouro'].forEach(function(p) { restorePkgDropdown(p); });
      document.querySelectorAll('.option-card').forEach(c => c.style.zIndex = '');
    }
    const pop1 = document.getElementById('price-popover');
    const pop2 = document.getElementById('new-item-popover');
    const btn = document.getElementById('btn-toggle-new-item');
    if (pop1 && !pop1.contains(e.target) && !e.target.classList.contains('btn-edit-price-tag')) pop1.classList.remove('active');
    if (pop2 && !pop2.contains(e.target) && btn && !btn.contains(e.target)) pop2.classList.remove('active');
  });

  window.addEventListener('scroll', function() {
    ['bronze', 'prata', 'ouro'].forEach(function(pkg) {
      const menu = document.getElementById('dropdown-' + pkg);
      if (menu && menu.classList.contains('active')) positionPkgDropdown(pkg);
    });
  }, true);

  window.addEventListener('resize', function() {
    ['bronze', 'prata', 'ouro'].forEach(function(pkg) {
      const menu = document.getElementById('dropdown-' + pkg);
      if (menu && menu.classList.contains('active')) positionPkgDropdown(pkg);
    });
  });
}

function setupStickyScrollObserver() {
  const targetPriceBlock = document.getElementById('total-price') || document.querySelector('.summary-sidebar');
  if (!targetPriceBlock) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isPriceBlockInView = entry.isIntersecting;
      calculateAtmosphere();
    });
  }, { threshold: 0.2 });

  observer.observe(targetPriceBlock);
}

window.addEventListener('DOMContentLoaded', async function() {
  await loadDynamicContentFromDatabase();
});

/* ---------- FORMULÁRIO DE CONTATO (LEAD) ---------- */
function setupContactFormCalc() {
  const btn = document.getElementById('btn-submit-general-contact');
  if (!btn) return;
  if (btn.dataset.listenerAttached === 'true') return;
  btn.dataset.listenerAttached = 'true';

  btn.addEventListener('click', async function () {
    const nameEl = document.getElementById('mod-name');
    const contactEl = document.getElementById('mod-contact');
    const msgEl = document.getElementById('mod-msg');
    const errorEl = document.getElementById('mod-contact-error');

    const name = nameEl ? nameEl.value.trim() : '';
    const contact = contactEl ? contactEl.value.trim() : '';
    const msg = msgEl ? msgEl.value.trim() : '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = contact.replace(/\D/g, '');
    const isValid = emailRegex.test(contact) || /^\d{10,13}$/.test(phoneDigits);

    if (!name || !isValid) {
      if (errorEl) errorEl.style.display = 'block';
      if (contactEl) contactEl.focus();
      return;
    }
    if (errorEl) errorEl.style.display = 'none';

    btn.innerText = 'Registrando...';
    btn.disabled = true;

         // Dispara o alerta no seu Telegram
    await dispararLeadTelegram(name, contact, msg || 'Contato pela calculadora');

    let leadSaved = true;
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        const { error } = await supabaseClient.from('co_leads').insert([{
          nome: name, whatsapp: contact, mensagem: msg || 'Contato pela calculadora',
          origem: 'modal_calculadora', created_at: new Date().toISOString()
        }]);
        if (error) { console.error('Erro Supabase (calculadora):', error); leadSaved = false; }
      } catch (err) { console.error('Erro ao salvar lead (calculadora):', err); leadSaved = false; }
    }

    const encoded = encodeURIComponent(
      `Olá! Meu nome é ${name}.\nContato: ${contact}\nGostaria de iniciar um alinhamento técnico.\n\nDetalhes: ${msg || 'Nenhum'}`
    );
    window.open(`https://wa.me/${calcFallbackWhatsapp}?text=${encoded}`, '_blank');

    btn.innerText = 'Enviar Solicitação';
    btn.disabled = false;

    const overlay = document.getElementById('contact-overlay');
    if (overlay) {
      overlay.classList.remove('open', 'active');
      setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }

    if (leadSaved) {
      showToast('Solicitação enviada com sucesso! Em breve entraremos em contato.', 'success');
    } else {
      showToast('Solicitação encaminhada, mas houve um erro ao registrar no sistema. Você já pode falar direto pelo WhatsApp.', 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupContactFormCalc();
});

/* ---------- SISTEMA DRAG & DROP COM GRAVAÇÃO ROBUSTA NO SUPABASE ---------- */
(function inicializarDragDropSupabase() {
  function ativarSortable() {
    if (!isAdminMode()) return;
    
    if (typeof Sortable === 'undefined') return;

    const containers = document.querySelectorAll('#dynamic-addons-list, .pkg-specs-list');

    containers.forEach(container => {
      if (container.dataset.sortableAtivo) return;
      container.dataset.sortableAtivo = 'true';

      new Sortable(container, {
        animation: 150,
        ghostClass: 'item-arrastando',
        handle: 'li, .extra-item',
        onEnd: async function (evt) {
          const elementos = Array.from(evt.to.children);
          console.log('🔍 Container (evt.to):', evt.to.id || evt.to.className);
          console.log('🔍 IDs capturados no drag:', elementos.map(el => el.getAttribute('data-id')));
          console.log('🔍 Total de elementos:', elementos.length);

          const syncStatus = document.getElementById('admin-sync-text');
          if (syncStatus) syncStatus.innerText = 'Atualizando ordem no banco...';

          try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
              const atualizacoes = elementos.map(async (el, index) => {
                const idItem = el.getAttribute('data-id') || el.dataset.id;
                if (!idItem) {
                  console.warn('⚠️ Elemento sem data-id:', el);
                  return;
                }

                const numericId = parseInt(idItem, 10);
                const novaPosicao = index + 1;

                console.log(`🔍 Atualizando ID ${numericId} para ordem ${novaPosicao}`);

                const { data, error } = await supabaseClient
                  .from('calculadora_valores')
                  .update({ ordem: novaPosicao })
                  .eq('id', numericId)
                  .select();

                if (error) {
                  throw new Error(`Erro SQL no ID ${numericId}: ${error.message}`);
                }

                if (!data || data.length === 0) {
                  throw new Error(`ID ${numericId} não encontrado no banco ou bloqueado.`);
                }

                console.log(`✅ ID ${numericId} atualizado:`, data);
              });

              await Promise.all(atualizacoes);

              if (syncStatus) syncStatus.innerText = 'Nova ordem salva no banco!';
              if (typeof showToast === 'function') showToast('Ordem atualizada com sucesso!', 'success');
            }
          } catch (err) {
            console.error('❌ ERRO AO SALVAR ORDEM:', err.message);
            if (syncStatus) syncStatus.innerText = 'Falha ao salvar ordem.';
            if (typeof showToast === 'function') showToast('Falha ao gravar ordem. Veja o console(F12).', 'error');
            return; 
          }

          if (evt.to.id === 'dynamic-addons-list' && Array.isArray(dbItems)) {
            const IDsReordenados = elementos.map(el => String(el.getAttribute('data-id')));
            const addonsReordenados = [];

            IDsReordenados.forEach(id => {
              const item = dbItems.find(i => String(i.id) === id);
              if (item) addonsReordenados.push(item);
            });

            const outrosItens = dbItems.filter(i => (i.categoria || '').toLowerCase().trim() !== 'adicional');
            dbItems = [...outrosItens, ...addonsReordenados];
          }

          if (typeof calculateAtmosphere === 'function') {
            calculateAtmosphere();
          }
        }
      });
    });
  }

  if (!isAdminMode()) return;

  if (typeof Sortable === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.7/Sortable.min.js';
    script.onload = () => {
      ativarSortable();
      setInterval(ativarSortable, 1500); 
    };
    document.head.appendChild(script);
  } else {
    ativarSortable();
    setInterval(ativarSortable, 1500);
  }
})();



/* ---------- DISPARO VIA CLOUDFLARE EDGE FUNCTION (/telegram) ---------- */
async function dispararLeadTelegram(nome, telefone, mensagem) {
  try {
    await fetch('/telegram', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        nome: nome, 
        telefone: telefone, 
        mensagem: mensagem 
      })
    });
  } catch (err) {
    console.warn('Erro ao notificar via Telegram:', err);
  }
}
