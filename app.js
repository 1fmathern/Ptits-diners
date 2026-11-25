(() => {
  const { DAYS, DURATION_SLOTS, DEFAULT_STOCK, ALL_RECIPES, inferCategory, scoreRecipe } = window.DataModule;

  const state = {
    theme: 'light',
    activeTab: 'planning',
    season: 'Automne',
    stock: [],
    plan: [],
    ratings: {},
    history: [],
    customRecipes: [],
    includeShoppingInPdf: true,
    searchQuery: '',
    filterSeasonOnly: true,
    ocrPreviewItems: [],
    reminders: { shoppingDay: 'Samedi', shoppingTime: '09:30', dinnerTime: '18:30' }
  };

  function detectSeason() {
    const m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return 'Printemps';
    if (m >= 6 && m <= 8) return 'Été';
    if (m >= 9 && m <= 11) return 'Automne';
    return 'Hiver';
  }

  function showFeedback(message, isError = false) {
    const el = document.getElementById('feedbackBanner');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden', 'error');
    if (isError) el.classList.add('error');
    clearTimeout(showFeedback._t);
    showFeedback._t = setTimeout(() => el.classList.add('hidden'), 5000);
  }

  function getRecipesCatalog() {
    return [...(state.customRecipes || []), ...ALL_RECIPES];
  }

  function getRecipesMap() {
    const map = {};
    getRecipesCatalog().forEach((r) => { map[r.id] = r; });
    return map;
  }

  async function persist() {
    await window.StorageModule.saveState(state);
  }

  function applyTheme(theme) {
    state.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  function generateWeekPlan(preserveLocked = true) {
    const catalog = getRecipesCatalog();
    const historyIds = state.history.map((h) => h.recipeId);
    const usedThisWeek = new Set();

    // Simule la consommation au fil des jours pour adapter les recettes suivantes
    const virtualStock = state.stock.map((s) => ({ ...s }));

    const nextPlan = DAYS.map((day, idx) => {
      const existing = state.plan[idx] || { day, slotId: 'auto', doubleBatch: false, cooked: false };
      if (preserveLocked && existing.cooked && existing.recipeId) {
        usedThisWeek.add(existing.recipeId);
        return existing;
      }

      const slotId = existing.slotId || 'auto';
      const scored = catalog
        .filter((r) => !usedThisWeek.has(r.id))
        .map((r) => ({
          recipe: r,
          score: scoreRecipe(r, {
            season: state.season,
            stock: virtualStock,
            historyIds,
            ratings: state.ratings,
            slotId
          })
        }))
        .sort((a, b) => b.score - a.score);

      const chosen = (scored[0] && scored[0].recipe) || catalog[idx % catalog.length];
      usedThisWeek.add(chosen.id);

      const mult = existing.doubleBatch ? 2 : 1;
      chosen.ingredients.forEach((req) => {
        const st = virtualStock.find((s) => s.name.toLowerCase() === req.name.toLowerCase());
        if (st) st.qty = Math.max(0, st.qty - req.qty * mult);
      });

      return {
        day,
        recipeId: chosen.id,
        slotId,
        doubleBatch: Boolean(existing.doubleBatch),
        cooked: false
      };
    });

    state.plan = nextPlan;
    persist();
    renderAll();
  }

  function computeShoppingList() {
    const map = getRecipesMap();
    const needed = {};

    state.plan.forEach((slot) => {
      if (slot.cooked) return;
      const r = map[slot.recipeId];
      if (!r) return;
      const mult = slot.doubleBatch ? 2 : 1;
      r.ingredients.forEach((ing) => {
        const key = ing.name.toLowerCase();
        if (!needed[key]) {
          needed[key] = {
            name: ing.name,
            qty: 0,
            unit: ing.unit,
            category: inferCategory(ing.name)
          };
        }
        needed[key].qty += ing.qty * mult;
      });
    });

    const missing = [];
    Object.values(needed).forEach((req) => {
      const inStock = state.stock.find((s) => s.name.toLowerCase() === req.name.toLowerCase());
      const avail = inStock ? inStock.qty : 0;
      if (req.qty > avail) {
        missing.push({
          name: req.name,
          missingQty: Math.round((req.qty - avail) * 10) / 10,
          unit: req.unit,
          category: req.category
        });
      }
    });

    return missing;
  }

  function markDayCooked(dayIndex) {
    const slot = state.plan[dayIndex];
    const map = getRecipesMap();
    const recipe = slot && map[slot.recipeId];
    if (!slot || !recipe || slot.cooked) return;

    const mult = slot.doubleBatch ? 2 : 1;
    recipe.ingredients.forEach((req) => {
      const st = state.stock.find((s) => s.name.toLowerCase() === req.name.toLowerCase());
      if (st) {
        st.qty = Math.max(0, Math.round((st.qty - req.qty * mult) * 10) / 10);
      }
    });

    slot.cooked = true;
    const entryId = 'hist_' + Date.now() + '_' + dayIndex;
    slot.historyEntryId = entryId;

    state.history.unshift({
      id: entryId,
      date: new Date().toLocaleDateString('fr-FR'),
      day: slot.day,
      dayIndex,
      recipeId: recipe.id,
      title: recipe.title,
      doubleBatch: Boolean(slot.doubleBatch)
    });

    persist();
    showFeedback(`« ${recipe.title} » marqué comme réalisé et déduit du stock.`);
    renderAll();
  }

  function undoCookedEntry(historyId, dayIndexFallback) {
    const idx = state.history.findIndex((h) => h.id === historyId);
    const entry = idx !== -1 ? state.history[idx] : null;
    const map = getRecipesMap();
    const dayIdx = entry ? entry.dayIndex : dayIndexFallback;
    const slot = typeof dayIdx === 'number' ? state.plan[dayIdx] : null;
    const recipeId = (entry && entry.recipeId) || (slot && slot.recipeId);
    const doubleBatch = entry ? entry.doubleBatch : (slot && slot.doubleBatch);
    const recipe = recipeId ? map[recipeId] : null;

    if (recipe) {
      const mult = doubleBatch ? 2 : 1;
      recipe.ingredients.forEach((req) => {
        let st = state.stock.find((s) => s.name.toLowerCase() === req.name.toLowerCase());
        if (!st) {
          st = {
            id: 'ing_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: req.name,
            qty: 0,
            unit: req.unit,
            location: 'Frigo',
            urgent: false,
            category: inferCategory(req.name)
          };
          state.stock.push(st);
        }
        st.qty = Math.round((st.qty + req.qty * mult) * 10) / 10;
      });
    }

    if (idx !== -1) state.history.splice(idx, 1);
    if (slot) {
      slot.cooked = false;
      delete slot.historyEntryId;
    }

    persist();
    showFeedback('Repas retiré du suivi et ingrédients remis en stock.');
    renderAll();
  }

  function openRecipeModal(recipeId) {
    const recipe = getRecipesMap()[recipeId];
    if (!recipe) return;
    const modal = document.getElementById('recipeModal');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    titleEl.textContent = recipe.title;

    const rating = state.ratings[recipe.id] || 0;
    bodyEl.innerHTML = `
      <div class="row-wrap" style="margin-bottom:10px;">
        <span class="badge badge-ok">🌿 ${recipe.season}</span>
        <span class="badge">⏱️ ${recipe.prepTime} min</span>
        <span class="badge">🥗 ${recipe.veggies.join(', ')}</span>
      </div>
      <p class="muted">${recipe.source || 'Recette familiale équilibrée'}</p>
      <div style="margin:10px 0;">
        <strong>Votre note :</strong>
        ${[1, 2, 3].map((n) => `<button type="button" class="star-btn" data-rate-id="${recipe.id}" data-rate-val="${n}">${n <= rating ? '⭐' : '☆'}</button>`).join('')}
      </div>
      <h4>Ingrédients (4 personnes : 2 adultes + 3 &amp; 5 ans)</h4>
      <ul>
        ${recipe.ingredients.map((i) => `<li>${i.name} : <strong>${i.qty} ${i.unit}</strong></li>`).join('')}
      </ul>
      <h4>Préparation</h4>
      <ol>
        ${recipe.steps.map((s) => `<li>${s}</li>`).join('')}
      </ol>
      <div class="card" style="margin-top:10px;">
        <strong>👶 Astuce enfants (3 &amp; 5 ans) :</strong> ${recipe.kidTip || 'Servir tiède avec des portions adaptées.'}
      </div>
    `;
    modal.classList.remove('hidden');
  }

  async function handleExportPdf(shareMode = false) {
    try {
      showFeedback('Génération du PDF en cours...');
      const blob = await window.PdfModule.buildWeekPdfBlob({
        season: state.season,
        plan: state.plan,
        recipesById: getRecipesMap(),
        shoppingList: computeShoppingList(),
        includeShopping: state.includeShoppingInPdf
      });

      const fileName = `ptits-diners-${state.season.toLowerCase()}.pdf`;
      if (shareMode && navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Menu P'tits Dîners (${state.season})`,
            text: 'Voici les fiches recettes de la semaine et la liste de courses.',
            files: [file]
          });
          showFeedback('PDF partagé avec succès.');
          return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showFeedback(`PDF prêt (${fileName}).`);
    } catch (err) {
      showFeedback(err.message || 'Erreur lors de la création du PDF.', true);
    }
  }

  function renderPlanning() {
    const el = document.getElementById('tab-planning');
    const map = getRecipesMap();
    const urgentItems = state.stock.filter((s) => s.urgent && s.qty > 0);

    el.innerHTML = `
      <div class="card card-hero">
        <div class="row-between">
          <div>
            <span class="badge" style="background:rgba(255,255,255,0.2);color:#fff;border:none;">🌿 Priorité ${state.season}</span>
            <h2 style="margin:6px 0 4px;font-size:18px;">Dîners de la semaine</h2>
            <p class="muted" style="margin:0;">Stock actif : ${state.stock.length} ingrédients • 4 pers.</p>
          </div>
          <button type="button" id="regenWeekBtn" class="btn btn-accent">🪄 Générer</button>
        </div>
        <div class="row-wrap" style="margin-top:12px;">
          <label class="row-wrap" style="font-size:12px;cursor:pointer;">
            <input type="checkbox" id="pdfShoppingCheck" style="width:auto;" ${state.includeShoppingInPdf ? 'checked' : ''} />
            Inclure courses au PDF
          </label>
          <button type="button" id="downloadPdfBtn" class="btn btn-sm">📄 PDF Semaine</button>
          <button type="button" id="sharePdfBtn" class="btn btn-sm">📤 Partager PDF</button>
        </div>
      </div>

      ${urgentItems.length ? `
        <div class="card">
          <strong>⏰ À utiliser rapidement (anti-gaspi) :</strong>
          <p class="muted" style="margin:4px 0 0;">${urgentItems.map((u) => `${u.name} (${u.qty} ${u.unit})`).join(', ')}</p>
        </div>
      ` : ''}

      ${state.plan.map((slot, idx) => {
        const r = map[slot.recipeId];
        if (!r) return '';
        return `
          <div class="card">
            <div class="row-between">
              <strong>${slot.day}</strong>
              <div class="row-wrap">
                <select class="select-inline" data-slot-day="${idx}" aria-label="Durée ${slot.day}">
                  ${DURATION_SLOTS.map((d) => `<option value="${d.id}" ${slot.slotId === d.id ? 'selected' : ''}>⏱️ ${d.label}</option>`).join('')}
                </select>
                <button type="button" class="btn btn-sm ${slot.doubleBatch ? 'btn-primary' : ''}" data-double-day="${idx}">
                  ${slot.doubleBatch ? 'x2 Avance ✓' : 'x2 Avance'}
                </button>
              </div>
            </div>
            <h3 class="item-title">${r.title}</h3>
            <div class="row-wrap" style="margin:6px 0;">
              <span class="badge badge-ok">${r.season}</span>
              <span class="badge">⏱️ ${r.prepTime} min</span>
              <span class="badge">🥗 ${r.veggies.join(', ')}</span>
              ${slot.cooked ? '<span class="badge badge-ok">✅ Réalisé</span>' : ''}
            </div>
            <div class="row-wrap" style="margin-top:8px;">
              <button type="button" class="btn btn-sm" data-open-recipe="${r.id}">📖 Fiche</button>
              <button type="button" class="btn btn-sm" data-swap-day="${idx}">🔄 Changer</button>
              ${slot.cooked
                ? `<button type="button" class="btn btn-sm btn-danger" data-undo-day="${idx}">↩️ Annuler</button>`
                : `<button type="button" class="btn btn-sm btn-primary" data-cook-day="${idx}">👨‍🍳 Réalisé</button>`}
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  function renderRecipes() {
    const el = document.getElementById('tab-recipes');
    const q = state.searchQuery.trim().toLowerCase();
    const list = getRecipesCatalog().filter((r) => {
      if (state.filterSeasonOnly && r.season !== state.season) return false;
      if (!q) return true;
      return r.title.toLowerCase().includes(q) || r.veggies.some((v) => v.toLowerCase().includes(q));
    });

    el.innerHTML = `
      <div class="card">
        <h2 class="sec-title">Catalogue (${getRecipesCatalog().length} recettes)</h2>
        <div class="row-wrap" style="margin-bottom:8px;">
          <input type="search" id="recipeSearchInput" placeholder="Rechercher un légume, plat..." value="${state.searchQuery}" />
        </div>
        <div class="row-between">
          <label class="row-wrap" style="font-size:13px;cursor:pointer;">
            <input type="checkbox" id="filterSeasonCheck" style="width:auto;" ${state.filterSeasonOnly ? 'checked' : ''} />
            Saison active (${state.season}) uniquement
          </label>
          <button type="button" id="fetchOnlineRecipesBtn" class="btn btn-sm btn-primary">🌐 Charger idées en ligne</button>
        </div>
      </div>

      ${list.slice(0, 40).map((r) => {
        const stars = state.ratings[r.id] || 0;
        return `
          <div class="card">
            <div class="row-between">
              <span class="badge badge-ok">${r.season} • ${r.prepTime} min</span>
              <div>
                ${[1, 2, 3].map((n) => `<button type="button" class="star-btn" data-rate-id="${r.id}" data-rate-val="${n}">${n <= stars ? '⭐' : '☆'}</button>`).join('')}
              </div>
            </div>
            <h3 class="item-title">${r.title}</h3>
            <p class="muted" style="margin:2px 0 8px;">🥗 ${r.veggies.join(', ')} • ${r.source || ''}</p>
            <div class="row-wrap">
              <button type="button" class="btn btn-sm" data-open-recipe="${r.id}">📖 Voir la fiche</button>
              <select class="select-inline" data-assign-recipe="${r.id}">
                <option value="">+ Mettre au planning...</option>
                ${DAYS.map((d, idx) => `<option value="${idx}">${d}</option>`).join('')}
              </select>
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  function renderFridge() {
    const el = document.getElementById('tab-fridge');
    el.innerHTML = `
      <div class="card">
        <h2 class="sec-title">📸 Scanner un ticket de caisse (JPEG/PNG, max 5 Mo)</h2>
        <p class="muted">Importez une photo de ticket ou capture d'écran de magasin pour mettre à jour votre stock.</p>
        <input type="file" id="ocrFileInput" accept="image/jpeg,image/png" />
        <div id="ocrStatusText" class="muted" style="margin-top:6px;"></div>
        ${state.ocrPreviewItems.length ? `
          <div style="margin-top:10px;">
            <strong>Articles détectés à valider :</strong>
            ${state.ocrPreviewItems.map((it, idx) => `
              <div class="stock-row">
                <label class="row-wrap" style="flex:1;">
                  <input type="checkbox" style="width:auto;" data-ocr-check="${idx}" ${it.checked ? 'checked' : ''} />
                  <span>${it.name} (${it.qty} ${it.unit} • ${it.location})</span>
                </label>
              </div>
            `).join('')}
            <button type="button" id="applyOcrBtn" class="btn btn-primary" style="margin-top:8px;">✅ Ajouter au stock</button>
          </div>
        ` : ''}
      </div>

      <div class="card">
        <h2 class="sec-title">➕ Ajouter un ingrédient manuellement</h2>
        <div class="grid-2" style="margin-bottom:8px;">
          <input type="text" id="newIngName" placeholder="Nom (ex: Courgettes)" />
          <input type="number" id="newIngQty" placeholder="Quantité" min="1" step="any" />
        </div>
        <div class="grid-2" style="margin-bottom:8px;">
          <select id="newIngUnit">
            <option value="g">g</option>
            <option value="pièces">pièces</option>
            <option value="ml">ml</option>
          </select>
          <select id="newIngLoc">
            <option value="Frigo">Frigo</option>
            <option value="Étagère">Étagère</option>
          </select>
        </div>
        <button type="button" id="addStockBtn" class="btn btn-primary">Ajouter au stock</button>
      </div>

      <div class="card">
        <h2 class="sec-title">🧊 Mon Stock (${state.stock.length} produits)</h2>
        ${state.stock.map((item, idx) => `
          <div class="stock-row">
            <div>
              <strong>${item.name}</strong>
              <div class="muted">${item.location} ${item.urgent ? '• ⏰ À utiliser vite' : ''}</div>
            </div>
            <div class="qty-box">
              <button type="button" class="btn btn-sm" data-urgent-idx="${idx}" title="Marquer urgent">⏰</button>
              <button type="button" class="btn btn-sm" data-dec-idx="${idx}">-</button>
              <span><strong>${item.qty}</strong> ${item.unit}</span>
              <button type="button" class="btn btn-sm" data-inc-idx="${idx}">+</button>
              <button type="button" class="btn btn-sm btn-danger" data-del-stock="${idx}">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderShopping() {
    const el = document.getElementById('tab-shopping');
    const missing = computeShoppingList();

    el.innerHTML = `
      <div class="card">
        <div class="row-between">
          <div>
            <h2 class="sec-title">🛒 Liste de courses automatique</h2>
            <p class="muted" style="margin:0;">Calculée selon vos repas prévus et votre stock actuel.</p>
          </div>
          <button type="button" id="copyShoppingBtn" class="btn btn-sm">📋 Copier</button>
        </div>
      </div>

      <div class="card">
        ${missing.length === 0
          ? '<p class="muted">Votre stock couvre tous les ingrédients nécessaires pour la semaine !</p>'
          : missing.map((m) => `
              <div class="stock-row">
                <span><strong>${m.name}</strong></span>
                <span class="badge badge-warn">${m.missingQty} ${m.unit}</span>
              </div>
            `).join('')}
      </div>
    `;
  }

  function renderHistory() {
    const el = document.getElementById('tab-history');
    el.innerHTML = `
      <div class="card">
        <h2 class="sec-title">📋 Repas réalisés (${state.history.length})</h2>
        <p class="muted">Supprimez une ligne si un repas a été validé par erreur : le stock sera automatiquement recrédité.</p>
        ${state.history.length === 0
          ? '<p class="muted">Aucun repas marqué comme réalisé pour le moment.</p>'
          : state.history.map((h) => `
              <div class="stock-row">
                <div>
                  <strong>${h.title}</strong>
                  <div class="muted">${h.date} (${h.day}) ${h.doubleBatch ? '• x2 Avance' : ''}</div>
                </div>
                <button type="button" class="btn btn-sm btn-danger" data-del-history="${h.id}" title="Annuler ce repas">🗑️</button>
              </div>
            `).join('')}
      </div>

      <div class="card">
        <h2 class="sec-title">🔄 Partage & Synchronisation multi-appareils</h2>
        <p class="muted">Partagez votre stock et votre planning vers un autre téléphone Android (lien ou fichier JSON).</p>
        <div class="row-wrap" style="margin-bottom:8px;">
          <button type="button" id="copySyncLinkBtn" class="btn btn-sm btn-primary">🔗 Copier lien de synchro</button>
          <button type="button" id="exportJsonBtn" class="btn btn-sm">💾 Exporter JSON</button>
        </div>
        <textarea id="syncImportInput" rows="2" placeholder="Collez ici un code ou lien de synchronisation reçu..."></textarea>
        <button type="button" id="applySyncBtn" class="btn btn-sm" style="margin-top:6px;">📥 Importer les données</button>
      </div>

      <div class="card">
        <h2 class="sec-title">🔔 Rappels courses & dîner</h2>
        <div class="grid-2" style="margin-bottom:8px;">
          <select id="remDay">
            ${DAYS.map((d) => `<option value="${d}" ${state.reminders.shoppingDay === d ? 'selected' : ''}>Courses : ${d}</option>`).join('')}
          </select>
          <input type="time" id="remShopTime" value="${state.reminders.shoppingTime}" />
        </div>
        <div class="row-between">
          <span class="muted">Rappel préparation dîner :</span>
          <input type="time" id="remDinnerTime" style="width:auto;" value="${state.reminders.dinnerTime}" />
        </div>
        <button type="button" id="enableNotifBtn" class="btn btn-sm btn-primary" style="margin-top:8px;">Activer les notifications</button>
      </div>
    `;
  }

  function renderAll() {
    document.querySelectorAll('.season-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.season === state.season);
    });
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === 'tab-' + state.activeTab);
    });

    renderPlanning();
    renderRecipes();
    renderFridge();
    renderShopping();
    renderHistory();
  }

  async function fetchOnlineIdeas() {
    try {
      showFeedback('Recherche de nouvelles recettes en ligne...');
      const res = await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian');
      if (!res.ok) throw new Error('Service en ligne temporairement indisponible.');
      const data = await res.json();
      const meals = (data.meals || []).slice(0, 12);
      let added = 0;
      meals.forEach((m) => {
        const id = 'online_' + m.idMeal;
        if (!state.customRecipes.some((r) => r.id === id)) {
          state.customRecipes.push({
            id,
            title: `${m.strMeal} (version familiale légumes)`,
            season: state.season,
            prepTime: 20,
            source: 'Import en ligne • Sélection famille',
            veggies: ['Carottes', 'Courgettes'],
            ingredients: [
              { name: 'Carottes', qty: 300, unit: 'g' },
              { name: 'Courgettes', qty: 300, unit: 'g' },
              { name: 'Riz basmati', qty: 240, unit: 'g' }
            ],
            steps: [
              'Préparer les légumes de saison en petits dés.',
              'Cuire à feu doux avec le riz et assaisonner légèrement.'
            ],
            kidTip: 'Adapter l’assaisonnement en gardant les épices douces.'
          });
          added++;
        }
      });
      await persist();
      showFeedback(`${added} nouvelle(s) recette(s) importée(s) dans votre catalogue.`);
      renderAll();
    } catch (err) {
      showFeedback(err.message || 'Impossible de charger les recettes en ligne.', true);
    }
  }

  function bindEvents() {
    document.getElementById('themeToggle').addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      persist();
    });

    document.querySelectorAll('.season-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.season = btn.dataset.season;
        generateWeekPlan(true);
        showFeedback(`Saison active : ${state.season}. Recettes mises à jour.`);
      });
    });

    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        renderAll();
      });
    });

    document.getElementById('closeModalBtn').addEventListener('click', () => {
      document.getElementById('recipeModal').classList.add('hidden');
    });

    document.body.addEventListener('click', async (e) => {
      const t = e.target.closest('button');
      if (!t) return;

      if (t.id === 'regenWeekBtn') return generateWeekPlan(true);
      if (t.id === 'downloadPdfBtn') return handleExportPdf(false);
      if (t.id === 'sharePdfBtn') return handleExportPdf(true);
      if (t.id === 'fetchOnlineRecipesBtn') return fetchOnlineIdeas();

      if (t.dataset.openRecipe) return openRecipeModal(t.dataset.openRecipe);
      if (t.dataset.cookDay !== undefined) return markDayCooked(Number(t.dataset.cookDay));
      if (t.dataset.undoDay !== undefined) {
        const dIdx = Number(t.dataset.undoDay);
        const slot = state.plan[dIdx];
        return undoCookedEntry(slot && slot.historyEntryId, dIdx);
      }
      if (t.dataset.delHistory) return undoCookedEntry(t.dataset.delHistory);

      if (t.dataset.doubleDay !== undefined) {
        const dIdx = Number(t.dataset.doubleDay);
        state.plan[dIdx].doubleBatch = !state.plan[dIdx].doubleBatch;
        await persist();
        return renderAll();
      }

      if (t.dataset.swapDay !== undefined) {
        const dIdx = Number(t.dataset.swapDay);
        const slot = state.plan[dIdx];
        const candidates = getRecipesCatalog().filter(
          (r) => r.season === state.season && r.id !== slot.recipeId
        );
        if (candidates.length) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          slot.recipeId = pick.id;
          slot.cooked = false;
          await persist();
          renderAll();
        }
        return;
      }

      if (t.dataset.rateId) {
        state.ratings[t.dataset.rateId] = Number(t.dataset.rateVal);
        await persist();
        renderAll();
        if (!document.getElementById('recipeModal').classList.contains('hidden')) {
          openRecipeModal(t.dataset.rateId);
        }
        return;
      }

      if (t.id === 'addStockBtn') {
        const name = (document.getElementById('newIngName').value || '').trim();
        const qty = parseFloat(document.getElementById('newIngQty').value);
        const unit = document.getElementById('newIngUnit').value;
        const location = document.getElementById('newIngLoc').value;
        if (!name || isNaN(qty) || qty <= 0) {
          return showFeedback('Veuillez saisir un nom valide et une quantité positive.', true);
        }
        const existing = state.stock.find((s) => s.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          existing.qty = Math.round((existing.qty + qty) * 10) / 10;
        } else {
          state.stock.push({
            id: 'ing_' + Date.now(),
            name,
            qty,
            unit,
            location,
            urgent: false,
            category: inferCategory(name)
          });
        }
        await persist();
        showFeedback(`${name} ajouté au stock.`);
        return renderAll();
      }

      if (t.dataset.incIdx !== undefined) {
        const it = state.stock[Number(t.dataset.incIdx)];
        const step = it.unit === 'g' || it.unit === 'ml' ? 50 : 1;
        it.qty += step;
        await persist();
        return renderAll();
      }
      if (t.dataset.decIdx !== undefined) {
        const it = state.stock[Number(t.dataset.decIdx)];
        const step = it.unit === 'g' || it.unit === 'ml' ? 50 : 1;
        it.qty = Math.max(0, it.qty - step);
        await persist();
        return renderAll();
      }
      if (t.dataset.urgentIdx !== undefined) {
        const it = state.stock[Number(t.dataset.urgentIdx)];
        it.urgent = !it.urgent;
        await persist();
        return renderAll();
      }
      if (t.dataset.delStock !== undefined) {
        state.stock.splice(Number(t.dataset.delStock), 1);
        await persist();
        return renderAll();
      }

      if (t.id === 'applyOcrBtn') {
        const selected = state.ocrPreviewItems.filter((i) => i.checked);
        selected.forEach((it) => {
          const existing = state.stock.find((s) => s.name.toLowerCase() === it.name.toLowerCase());
          if (existing) existing.qty += it.qty;
          else {
            state.stock.push({
              id: 'ing_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
              name: it.name,
              qty: it.qty,
              unit: it.unit,
              location: it.location,
              urgent: false,
              category: inferCategory(it.name)
            });
          }
        });
        state.ocrPreviewItems = [];
        await persist();
        showFeedback(`${selected.length} article(s) ajouté(s) depuis le ticket.`);
        return renderAll();
      }

      if (t.id === 'copyShoppingBtn') {
        const list = computeShoppingList();
        const text = list.length
          ? list.map((m) => `- ${m.name} : ${m.missingQty} ${m.unit}`).join('\n')
          : 'Rien à acheter, tout est en stock !';
        await navigator.clipboard.writeText(text);
        return showFeedback('Liste de courses copiée dans le presse-papiers.');
      }

      if (t.id === 'copySyncLinkBtn') {
        const token = window.StorageModule.encodeSyncPayload(state);
        const link = `${location.origin}${location.pathname}#sync=${token}`;
        await navigator.clipboard.writeText(link);
        return showFeedback('Lien de synchronisation copié.');
      }

      if (t.id === 'exportJsonBtn') {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ptits-diners-sauvegarde.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return;
      }

      if (t.id === 'applySyncBtn') {
        try {
          const raw = (document.getElementById('syncImportInput').value || '').trim();
          const token = raw.includes('#sync=') ? raw.split('#sync=')[1] : raw;
          const imported = window.StorageModule.decodeSyncPayload(token);
          state.stock = imported.stock;
          if (imported.plan) state.plan = imported.plan;
          if (imported.ratings) state.ratings = imported.ratings;
          if (imported.history) state.history = imported.history;
          await persist();
          showFeedback('Données synchronisées avec succès.');
          renderAll();
        } catch (err) {
          showFeedback(err.message || 'Code de synchronisation invalide.', true);
        }
        return;
      }

      if (t.id === 'enableNotifBtn') {
        if (!('Notification' in window)) {
          return showFeedback('Les notifications ne sont pas supportées sur ce navigateur.', true);
        }
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification("P'tits Dîners", {
            body: `Rappels actifs : courses ${state.reminders.shoppingDay} à ${state.reminders.shoppingTime}, dîner à ${state.reminders.dinnerTime}.`
          });
          showFeedback('Notifications activées.');
        } else {
          showFeedback('Autorisation de notification refusée.', true);
        }
      }
    });

    document.body.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.id === 'pdfShoppingCheck') {
        state.includeShoppingInPdf = t.checked;
        await persist();
      }
      if (t.id === 'filterSeasonCheck') {
        state.filterSeasonOnly = t.checked;
        renderRecipes();
      }
      if (t.dataset.slotDay !== undefined) {
        const idx = Number(t.dataset.slotDay);
        state.plan[idx].slotId = t.value;
        generateWeekPlan(true);
      }
      if (t.dataset.assignRecipe) {
        const dayIdx = Number(t.value);
        if (!isNaN(dayIdx) && state.plan[dayIdx]) {
          state.plan[dayIdx].recipeId = t.dataset.assignRecipe;
          state.plan[dayIdx].cooked = false;
          await persist();
          showFeedback(`Recette placée le ${DAYS[dayIdx]}.`);
          renderAll();
        }
      }
      if (t.dataset.ocrCheck !== undefined) {
        state.ocrPreviewItems[Number(t.dataset.ocrCheck)].checked = t.checked;
      }
      if (t.id === 'ocrFileInput' && t.files && t.files[0]) {
        const statusEl = document.getElementById('ocrStatusText');
        try {
          if (statusEl) statusEl.textContent = 'Analyse du ticket en cours...';
          const res = await window.OcrModule.scanReceiptFile(t.files[0], (pct) => {
            if (statusEl) statusEl.textContent = `Lecture OCR : ${pct}%`;
          });
          state.ocrPreviewItems = res.items;
          if (!res.items.length) {
            showFeedback('Aucun article alimentaire reconnu sur cette image.', true);
          } else {
            showFeedback(`${res.items.length} ligne(s) détectée(s) sur le ticket.`);
          }
          renderFridge();
        } catch (err) {
          showFeedback(err.message || 'Erreur lors de la lecture du ticket.', true);
        }
      }
    });

    document.body.addEventListener('input', (e) => {
      if (e.target.id === 'recipeSearchInput') {
        state.searchQuery = e.target.value;
        renderRecipes();
      }
    });
  }

  async function init() {
    const saved = await window.StorageModule.loadState();
    if (saved) {
      Object.assign(state, saved);
    } else {
      state.season = detectSeason();
      state.stock = DEFAULT_STOCK.map((s) => ({ ...s }));
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        state.theme = 'dark';
      }
    }

    if (location.hash && location.hash.startsWith('#sync=')) {
      try {
        const imported = window.StorageModule.decodeSyncPayload(location.hash.slice(6));
        state.stock = imported.stock;
        if (imported.plan) state.plan = imported.plan;
        history.replaceState(null, '', location.pathname);
        showFeedback('Données importées depuis le lien de partage.');
      } catch (_) {}
    }

    applyTheme(state.theme);
    bindEvents();

    if (!state.plan || state.plan.length !== 7) {
      generateWeekPlan(false);
    } else {
      renderAll();
    }

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
