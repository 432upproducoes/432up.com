/* ==========================================================
   432UP! - CALCULADORA DE ATMOSFERA (CONECTANDO + CÁLCULO CORRIGIDO)
   ========================================================== */

let dbItems = [];
let selectedAddons = {};
let packageComponents = { bronze: [], prata: [], ouro: [] };

// Estado limpo inicial (nenhum card pré-selecionado)
let selection = { scale: null, hours: null, package: null, guestsText: "", guestsCount: 0 };
let calcFallbackWhatsapp = "5511948564577";
let globalFormattedPrice = "";
let globalSpecsList = [];
let activeIdForPrice = null;
let calcDebounceTimer = null;

function isAdminMode() {
  return !!document.querySelector('.admin-bar-top');
}

/* ---------- MÁSCARA DE MOEDA & PARSER BRL ---------- */
function formatBRLInput(input) {
  let raw = input.value.replace(/[^\d,]/g, '');
  if (!raw) { input.value = ''; return; }
  const parts = raw.split(',');
  let intPart = parts[0].replace(/^0+(?=\d)/, '') || '0';
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  input.value = parts.length > 1 ? 'R$ ' + intPart + ',' + parts[1].slice(0, 2) : 'R$ ' + intPart + ',00';
}

function parseBRLValue(valueStr) {
  if (typeof valueStr === 'number') return isNaN(valueStr) ? 0 : valueStr;
  if (!valueStr) return 0;
  const clean = String(valueStr).replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
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

document.addEventListener('DOMContentLoaded', () => {
  setupModalHandlers();
  setupInlineEditableListeners();
  setupMultipliersListeners();
  setupClickOutsideHandlers();
  setupMoneyMasks();
  
  // Limpa seleções visuais iniciais no DOM
  resetAllSelectionsInDOM();
});

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
    if (isId) {
      query = query.eq('id', itemIdentifier);
    } else {
      query = query.eq('slug', itemIdentifier);
    }

    const { data: existing } = await query.maybeSingle();

    let error = null;
    if (existing) {
      if (existing.categoria) updateData.categoria = existing.categoria;
      let updateQuery = supabaseClient.from('calculadora_valores').update(updateData);
      if (isId) {
        updateQuery = updateQuery.eq('id', itemIdentifier);
      } else {
        updateQuery = updateQuery.eq('slug', itemIdentifier);
      }
      const res = await updateQuery;
      error = res.error;
    } else {
      const isLayoutText = String(itemIdentifier).includes('hero') || String(itemIdentifier).includes('step') || String(itemIdentifier).includes('title');
      const cat = isLayoutText ? 'texto_layout' : 'adicional';
      const res = await supabaseClient.from('calculadora_valores').insert([{
        slug: isId ? 'addon_' + itemIdentifier : itemIdentifier,
        categoria: cat,
        ativo: true,
        ...updateData
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
    if (itemId) {
      await saveFieldToSupabase(itemId, colName, novoTexto, true);
    } else {
      await saveFieldToSupabase(itemSlug, colName, novoTexto, false);
    }
  }
}

function debouncedCalculate() {
  if (calcDebounceTimer) clearTimeout(calcDebounceTimer);
  calcDebounceTimer = setTimeout(() => {
    calculateAtmosphere();
  }, 80);
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
                if (item.slug === 'titulo_hero') {
                  el.innerHTML = item.nome || item.nome_exibicao;
                } else {
                  el.innerText = item.nome || item.nome_exibicao;
                }
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
          if (!isAdminMode() && step4Container) {
            step4Container.style.display = isVisible ? 'block' : 'none';
          }
        }

        const { data: pkgComp } = await supabaseClient.from('pacote_componentes').select('*');
        packageComponents = { bronze: [], prata: [], ouro: [] };
        if (pkgComp) {
          pkgComp.forEach(c => {
            if (packageComponents[c.pacote_slug]) packageComponents[c.pacote_slug].push(c.item_id);
          });
        }
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
      '<span class="addon-price-tag">(' + preco + ')</span></h5>' +
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
        const card = dropMenu.closest('.option-card');
        if (card) card.style.zIndex = '1000';
      }
    }
    if (selectedList) {
      const selectedIds = packageComponents[pkg] || [];
      const itemsInPkg = allAddons.filter(function(i) { return selectedIds.includes(i.id) || selectedIds.includes(String(i.id)); });
      selectedList.innerHTML = itemsInPkg.map(function(addon) {
        var n = String(addon.nome || addon.nome_exibicao || '').replace(/\s*\(R\$\s*[\d.,]+\)\s*/g, '').trim();
        return '<div class="pkg-selected-tag glass-card"><span>' + escapeHtml(n) + '</span>' + (admin ? '<span style="cursor:pointer; color:#FF4444;" onclick="removeItemFromPackage(event, \'' + pkg + '\', \'' + escapeHtml(addon.id) + '\')">&times;</span>' : '') + '</div>';
      }).join('');
    }
  });
}

function filterPackageDropdown(pkg, text) {
  renderPackageDropdowns(text);
  const menu = document.getElementById('dropdown-' + pkg);
  if (menu) {
    menu.classList.add('active');
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
  const card = target ? target.closest('.option-card') : null;
  const isActive = target && target.classList.contains('active');

  document.querySelectorAll('.pkg-dropdown-menu').forEach(function(m) { m.classList.remove('active'); });
  document.querySelectorAll('.option-card').forEach(function(c) { c.style.zIndex = ''; });

  if (target && !isActive) {
    renderPackageDropdowns();
    target.classList.add('active');
    if (card) card.style.zIndex = '1000';
    setTimeout(function() { const input = target.querySelector('.pkg-search-input'); if (input) input.focus(); }, 50);
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

function handleDynamicAddonClick(id, event, element) {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'LABEL' || event.target.getAttribute('contenteditable') === 'true' || event.target.closest('.admin-toggle-wrapper') || event.target.classList.contains('btn-edit-price-tag') || event.target.closest('.btn-edit-price-tag')) return;
  element.classList.toggle('selected');
  selectedAddons[id] = element.classList.contains('selected');
  calculateAtmosphere();
}

/* ---------- CÁLCULO PROGRESSIVO RIGOROSO (CORRIGIDO) ---------- */
function calculateAtmosphere() {
  const priceEl = document.getElementById('total-price');
  const stickyPriceEl = document.getElementById('sticky-total-price');

  const pkg = selection.package;
  const scale = selection.scale;
  const hours = selection.hours;
  const guests = selection.guestsCount;

  const hasAddonSelected = Object.values(selectedAddons).some(v => v === true);

  // Nada selecionado → mensagem limpa
  if (!pkg && !scale && hours === null && !hasAddonSelected) {
    const welcomeMsg = "Selecione as opções do seu projeto ao lado para simular em tempo real.";
    if (priceEl) { priceEl.innerText = welcomeMsg; priceEl.classList.add('hint-mode'); }
    if (stickyPriceEl) { stickyPriceEl.innerText = welcomeMsg; stickyPriceEl.classList.add('hint-mode'); }

    if (document.getElementById('sum-guests')) document.getElementById('sum-guests').innerText = "Não selecionado";
    if (document.getElementById('sum-hours')) document.getElementById('sum-hours').innerText = "Não selecionado";
    if (document.getElementById('sum-package')) document.getElementById('sum-package').innerText = "Não selecionado";
    if (document.getElementById('sum-service-details')) {
      document.getElementById('sum-service-details').innerHTML = '<li>Aguardando seleções do projeto</li>';
    }
    return;
  }

  const itemPkg = pkg ? dbItems.find(i => i.slug === pkg) : null;

  // CORREÇÃO 1: Preço base do pacote SÓ entra se o pacote tiver pelo menos 1 componente.
  // Se estiver vazio → basePrice = 0 (não adiciona os 3500 fantasmas).
  let basePrice = 0;
  const itemIdsInPkg = (pkg && packageComponents[pkg]) ? packageComponents[pkg] : [];
  if (pkg && itemIdsInPkg.length > 0 && itemPkg) {
    basePrice = parseBRLValue(itemPkg.valor_base);
  }

  // CORREÇÃO 2: Escala NÃO tem preço fixo próprio.
  // O valor por pessoa só entra via processItemCost dos itens (valor_por_pessoa).
  // Assim some o R$ 1 fantasmas do "small".
  const scalePrice = 0;

  let totalItensAdicionais = 0;
  globalSpecsList = [];

  const processItemCost = (item) => {
    const vBase = parseBRLValue(item.valor_base);
    const hMin = parseBRLValue(item.hora_minima) || 0;
    const vExtraHora = parseBRLValue(item.valor_por_hora);
    const vPorPessoa = parseBRLValue(item.valor_por_pessoa);
    const aCada = parseBRLValue(item.a_cada_pessoas) || 100;

let custoHoras = 0;
if (hours !== null && hours > 0 && vExtraHora > 0) {
  // Cobra todas as horas selecionadas (não desconta hora mínima)
  custoHoras = hours * vExtraHora;
}

    let custoPessoas = 0;
    if (guests > 0 && vPorPessoa > 0 && aCada > 0) {
      const blocos = Math.ceil(guests / aCada);
      custoPessoas = blocos * vPorPessoa;
    }

    return vBase + custoHoras + custoPessoas;
  };

  // Itens dentro do pacote selecionado
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

  // Adicionais marcados manualmente (passo 4)
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

  const finalTotal = basePrice + scalePrice + totalItensAdicionais;

  // Atualiza sidebar
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

  globalFormattedPrice = finalTotal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  if (priceEl) {
    priceEl.innerText = globalFormattedPrice;
    priceEl.classList.remove('hint-mode');
  }
  if (stickyPriceEl) {
    stickyPriceEl.innerText = globalFormattedPrice;
    stickyPriceEl.classList.remove('hint-mode');
  }

  // WhatsApp
  const msg = encodeURIComponent(
    'Olá! Montei um projeto no simulador da 432UP!:\n' +
    (pkg ? '- Rider: ' + pkg.toUpperCase() + '\n' : '') +
    (selection.guestsText ? '- Escala: ' + selection.guestsText + '\n' : '') +
    (hours !== null ? '- Duração: ' + hours + 'h\n' : '') +
    '- Investimento Estimado: ' + globalFormattedPrice
  );

  const targetWhatsappUrl = 'https://wa.me/' + calcFallbackWhatsapp + '?text=' + msg;
  const btnWhatsapp = document.getElementById('btn-whatsapp');
  const stickyBtnWhatsapp = document.getElementById('sticky-btn-whatsapp');
  if (btnWhatsapp) btnWhatsapp.href = targetWhatsappUrl;
  if (stickyBtnWhatsapp) stickyBtnWhatsapp.href = targetWhatsappUrl;
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

/* ---------- SELEÇÃO DE CARDS (COM SUPORTE A DESELECIONAR) ---------- */
document.querySelectorAll('#group-scale .option-card').forEach(function(card) {
  card.addEventListener('click', function(e) {
    if (e.target.getAttribute('contenteditable') === 'true' || e.target.classList.contains('btn-edit-price-tag')) return;
    
    const isAlreadySelected = card.classList.contains('selected');
    document.querySelectorAll('#group-scale .option-card').forEach(function(c) { c.classList.remove('selected'); });
    
    if (isAlreadySelected) {
      selection.scale = null;
      selection.guestsCount = 0;
      selection.guestsText = "";
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
      document.querySelectorAll('.pkg-dropdown-menu').forEach(m => m.classList.remove('active'));
      document.querySelectorAll('.option-card').forEach(c => c.style.zIndex = '');
    }
    const pop1 = document.getElementById('price-popover');
    const pop2 = document.getElementById('new-item-popover');
    const btn = document.getElementById('btn-toggle-new-item');
    if (pop1 && !pop1.contains(e.target) && !e.target.classList.contains('btn-edit-price-tag')) pop1.classList.remove('active');
    if (pop2 && !pop2.contains(e.target) && btn && !btn.contains(e.target)) pop2.classList.remove('active');
  });
}

// Inicializa a chamada ao Supabase logo após o carregamento estrutural
window.addEventListener('DOMContentLoaded', async function() {
  await loadDynamicContentFromDatabase();
});