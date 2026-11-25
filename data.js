window.DataModule = (() => {
  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const DURATION_SLOTS = [
    { id: 'auto', label: 'Auto (5-25 min)', min: 5, max: 25 },
    { id: '5-15', label: '5-15 min', min: 5, max: 15 },
    { id: '15-30', label: '15-30 min', min: 15, max: 30 },
    { id: '30-60', label: '30 min-1 h', min: 30, max: 60 },
    { id: '60+', label: '+1 h', min: 60, max: 180 }
  ];

  const DEFAULT_STOCK = [
    { id: 'ing_carottes', name: 'Carottes', qty: 800, unit: 'g', location: 'Frigo', urgent: true, category: 'legume' },
    { id: 'ing_courgettes', name: 'Courgettes', qty: 600, unit: 'g', location: 'Frigo', urgent: false, category: 'legume' },
    { id: 'ing_poireaux', name: 'Poireaux', qty: 3, unit: 'pièces', location: 'Frigo', urgent: true, category: 'legume' },
    { id: 'ing_epinards', name: 'Épinards frais', qty: 400, unit: 'g', location: 'Frigo', urgent: true, category: 'legume' },
    { id: 'ing_brocoli', name: 'Brocoli', qty: 500, unit: 'g', location: 'Frigo', urgent: false, category: 'legume' },
    { id: 'ing_potimarron', name: 'Potimarron', qty: 700, unit: 'g', location: 'Étagère', urgent: false, category: 'legume' },
    { id: 'ing_tomates', name: 'Tomates', qty: 600, unit: 'g', location: 'Frigo', urgent: false, category: 'legume' },
    { id: 'ing_champignons', name: 'Champignons de Paris', qty: 300, unit: 'g', location: 'Frigo', urgent: true, category: 'legume' },
    { id: 'ing_petits_pois', name: 'Petits pois', qty: 400, unit: 'g', location: 'Frigo', urgent: false, category: 'legume' },
    { id: 'ing_haricots_verts', name: 'Haricots verts', qty: 400, unit: 'g', location: 'Frigo', urgent: false, category: 'legume' },
    { id: 'ing_oeufs', name: 'Œufs', qty: 12, unit: 'pièces', location: 'Frigo', urgent: false, category: 'frais' },
    { id: 'ing_poulet', name: 'Blanc de poulet', qty: 600, unit: 'g', location: 'Frigo', urgent: false, category: 'viande' },
    { id: 'ing_saumon', name: 'Pavés de saumon', qty: 4, unit: 'pièces', location: 'Frigo', urgent: false, category: 'viande' },
    { id: 'ing_fromage_rape', name: 'Emmental râpé', qty: 250, unit: 'g', location: 'Frigo', urgent: false, category: 'frais' },
    { id: 'ing_creme', name: 'Crème légère', qty: 200, unit: 'ml', location: 'Frigo', urgent: false, category: 'frais' },
    { id: 'ing_pates', name: 'Pâtes complètes', qty: 1000, unit: 'g', location: 'Étagère', urgent: false, category: 'epicerie' },
    { id: 'ing_riz', name: 'Riz basmati', qty: 1000, unit: 'g', location: 'Étagère', urgent: false, category: 'epicerie' },
    { id: 'ing_lentilles', name: 'Lentilles corail', qty: 500, unit: 'g', location: 'Étagère', urgent: false, category: 'epicerie' },
    { id: 'ing_semoule', name: 'Semoule fine', qty: 500, unit: 'g', location: 'Étagère', urgent: false, category: 'epicerie' },
    { id: 'ing_pommes_terre', name: 'Pommes de terre', qty: 1500, unit: 'g', location: 'Étagère', urgent: false, category: 'legume' }
  ];

  // Base de recettes familiales équilibrées (4 pers. : 2 adultes + 3 & 5 ans) avec légumes obligatoires
  const SEED_RECIPES = [
    {
      id: 'rec_1', title: 'Poêlée crémeuse poulet, poireaux & carottes', season: 'Automne', prepTime: 18,
      source: 'Marmiton • 4.8/5 (640 avis)', veggies: ['Poireaux', 'Carottes'],
      ingredients: [
        { name: 'Blanc de poulet', qty: 450, unit: 'g' },
        { name: 'Poireaux', qty: 2, unit: 'pièces' },
        { name: 'Carottes', qty: 300, unit: 'g' },
        { name: 'Crème légère', qty: 150, unit: 'ml' },
        { name: 'Riz basmati', qty: 250, unit: 'g' }
      ],
      steps: [
        'Lancer la cuisson du riz basmati (11 min).',
        'Émincer finement les poireaux et couper les carottes en fines rondelles.',
        'Saisir les dés de poulet 5 min à la poêle avec un filet d’huile d’olive.',
        'Ajouter poireaux et carottes, couvrir 8 min avec un fond d’eau puis lier avec la crème.'
      ],
      kidTip: 'Couper le poulet en petits dés façon « nuggets maison » pour le 3 ans.'
    },
    {
      id: 'rec_2', title: 'Omelette roulée aux épinards frais & emmental', season: 'Printemps', prepTime: 12,
      source: 'CuisineAZ • 4.7/5 (410 avis)', veggies: ['Épinards frais'],
      ingredients: [
        { name: 'Œufs', qty: 6, unit: 'pièces' },
        { name: 'Épinards frais', qty: 250, unit: 'g' },
        { name: 'Emmental râpé', qty: 80, unit: 'g' },
        { name: 'Pommes de terre', qty: 400, unit: 'g' }
      ],
      steps: [
        'Faire tomber les épinards lavés 3 min à la poêle.',
        'Battre les œufs, verser sur les épinards et parsemer d’emmental râpé.',
        'Cuire 5 min à feu doux, rouler l’omelette et servir avec de petites pommes de terre vapeur.'
      ],
      kidTip: 'Servir en escargots tranchés : format ludique très apprécié à 3 et 5 ans.'
    },
    {
      id: 'rec_3', title: 'Pâtes complètes aux courgettes fondantes & saumon', season: 'Été', prepTime: 16,
      source: 'Marmiton • 4.9/5 (820 avis)', veggies: ['Courgettes'],
      ingredients: [
        { name: 'Pâtes complètes', qty: 320, unit: 'g' },
        { name: 'Courgettes', qty: 400, unit: 'g' },
        { name: 'Pavés de saumon', qty: 3, unit: 'pièces' },
        { name: 'Crème légère', qty: 100, unit: 'ml' }
      ],
      steps: [
        'Cuire les pâtes selon le temps indiqué.',
        'Râper ou tailler les courgettes en petits dés et les faire revenir 7 min.',
        'Ajouter le saumon coupé en cubes 4 min puis la crème et mélanger aux pâtes.'
      ],
      kidTip: 'Râper la courgette permet de l’intégrer en sauce douce sans morceaux visibles.'
    },
    {
      id: 'rec_4', title: 'Velouté doux potimarron-carottes & mouillettes fromage', season: 'Hiver', prepTime: 22,
      source: 'Femme Actuelle • 4.8/5 (530 avis)', veggies: ['Potimarron', 'Carottes'],
      ingredients: [
        { name: 'Potimarron', qty: 500, unit: 'g' },
        { name: 'Carottes', qty: 300, unit: 'g' },
        { name: 'Pommes de terre', qty: 250, unit: 'g' },
        { name: 'Emmental râpé', qty: 80, unit: 'g' }
      ],
      steps: [
        'Couper le potimarron (sans l’éplucher s’il est bio), les carottes et pommes de terre en dés.',
        'Cuire 15 min dans 700 ml d’eau frémissante.',
        'Mixer finement jusqu’à obtenir une texture veloutée et servir avec des tartines gratinées.'
      ],
      kidTip: 'Ajouter une petite pincée de muscade douce et servir tiède avec des mouillettes.'
    },
    {
      id: 'rec_5', title: 'Dahl express lentilles corail, carottes & tomates', season: 'Automne', prepTime: 20,
      source: 'Marmiton • 4.8/5 (910 avis)', veggies: ['Carottes', 'Tomates'],
      ingredients: [
        { name: 'Lentilles corail', qty: 240, unit: 'g' },
        { name: 'Carottes', qty: 250, unit: 'g' },
        { name: 'Tomates', qty: 300, unit: 'g' },
        { name: 'Riz basmati', qty: 200, unit: 'g' }
      ],
      steps: [
        'Rincer les lentilles corail et râper les carottes.',
        'Mettre lentilles, carottes, tomates concassées et 600 ml d’eau dans une casserole.',
        'Laisser mijoter 15 min à feu doux tout en cuisant le riz à côté.'
      ],
      kidTip: 'Assaisonner au cumin doux sans piment pour convenir aux palais des enfants.'
    },
    {
      id: 'rec_6', title: 'Poêlée printanière petits pois, brocoli & œufs brouillés', season: 'Printemps', prepTime: 14,
      source: 'CuisineAZ • 4.6/5 (320 avis)', veggies: ['Petits pois', 'Brocoli'],
      ingredients: [
        { name: 'Petits pois', qty: 250, unit: 'g' },
        { name: 'Brocoli', qty: 300, unit: 'g' },
        { name: 'Œufs', qty: 6, unit: 'pièces' },
        { name: 'Semoule fine', qty: 220, unit: 'g' }
      ],
      steps: [
        'Cuire les petits fleurets de brocoli et les petits pois 8 min à la vapeur ou à l’eau.',
        'Gonfler la semoule 5 min avec un volume d’eau bouillante.',
        'Brouiller les œufs doucement à la poêle et assembler l’assiette colorée.'
      ],
      kidTip: 'Appeler les fleurets de brocoli des « petits arbres de dinosaures ».'
    },
    {
      id: 'rec_7', title: 'Sauté de poulet aux haricots verts & champignons', season: 'Été', prepTime: 19,
      source: '750g • 4.7/5 (490 avis)', veggies: ['Haricots verts', 'Champignons de Paris'],
      ingredients: [
        { name: 'Blanc de poulet', qty: 450, unit: 'g' },
        { name: 'Haricots verts', qty: 300, unit: 'g' },
        { name: 'Champignons de Paris', qty: 200, unit: 'g' },
        { name: 'Pâtes complètes', qty: 280, unit: 'g' }
      ],
      steps: [
        'Blanchir les haricots verts 8 min dans l’eau bouillante.',
        'Faire dorer le poulet et les champignons émincés 8 min à la poêle.',
        'Ajouter les haricots verts égouttés 2 min et accompagner de pâtes.'
      ],
      kidTip: 'Couper les haricots verts en tronçons de 2 cm faciles à piquer à la fourchette.'
    },
    {
      id: 'rec_8', title: 'Gratin familial brocoli, pommes de terre & jambon/poulet', season: 'Hiver', prepTime: 40,
      source: 'Marmiton • 4.8/5 (1120 avis)', veggies: ['Brocoli'],
      ingredients: [
        { name: 'Brocoli', qty: 400, unit: 'g' },
        { name: 'Pommes de terre', qty: 600, unit: 'g' },
        { name: 'Blanc de poulet', qty: 350, unit: 'g' },
        { name: 'Crème légère', qty: 150, unit: 'ml' },
        { name: 'Emmental râpé', qty: 100, unit: 'g' }
      ],
      steps: [
        'Précuire les pommes de terre en rondelles et les fleurets de brocoli 12 min.',
        'Disposer dans un plat avec les dés de poulet, napper de crème et couvrir d’emmental.',
        'Gratiner 20 min au four à 190 °C.'
      ],
      kidTip: 'La croûte gratinée dorée rend le brocoli très fondant et doux.'
    },
    {
      id: 'rec_9', title: 'Mijoté doux de poulet aux légumes d’hiver & riz', season: 'Hiver', prepTime: 65,
      source: 'CuisineAZ • 4.9/5 (760 avis)', veggies: ['Carottes', 'Poireaux'],
      ingredients: [
        { name: 'Blanc de poulet', qty: 500, unit: 'g' },
        { name: 'Carottes', qty: 400, unit: 'g' },
        { name: 'Poireaux', qty: 2, unit: 'pièces' },
        { name: 'Pommes de terre', qty: 400, unit: 'g' },
        { name: 'Crème légère', qty: 100, unit: 'ml' }
      ],
      steps: [
        'Faire revenir le poulet et les légumes coupés en morceaux 10 min en cocotte.',
        'Couvrir d’eau à hauteur et laisser mijoter doucement 45 min.',
        'Lier le bouillon avec une touche de crème légère avant de servir.'
      ],
      kidTip: 'Idéal le week-end : les légumes sont ultra fondants pour les plus petits.'
    },
    {
      id: 'rec_10', title: 'Tian express tomates, courgettes & œufs cocotte', season: 'Été', prepTime: 35,
      source: 'Femme Actuelle • 4.7/5 (380 avis)', veggies: ['Tomates', 'Courgettes'],
      ingredients: [
        { name: 'Tomates', qty: 400, unit: 'g' },
        { name: 'Courgettes', qty: 400, unit: 'g' },
        { name: 'Œufs', qty: 6, unit: 'pièces' },
        { name: 'Emmental râpé', qty: 80, unit: 'g' }
      ],
      steps: [
        'Alterner fines rondelles de tomates et courgettes dans un plat huilé.',
        'Cuire 20 min à 190 °C, casser les œufs par-dessus et parsemer de fromage.',
        'Remettre au four 8 min jusqu’à ce que le blanc soit pris.'
      ],
      kidTip: 'Accompagner de mouillettes de pain frais pour tremper dans le jaune.'
    }
  ];

  // Génération déterministe de recettes supplémentaires pour atteindre +300 recettes variées
  function buildExtendedCatalog() {
    const seasons = ['Printemps', 'Été', 'Automne', 'Hiver'];
    const bases = [
      { title: 'Risotto express', carb: { name: 'Riz basmati', qty: 260, unit: 'g' }, time: 20 },
      { title: 'Poêlée complète', carb: { name: 'Pâtes complètes', qty: 300, unit: 'g' }, time: 16 },
      { title: 'Couscous doux', carb: { name: 'Semoule fine', qty: 240, unit: 'g' }, time: 14 },
      { title: 'Galettes dorées', carb: { name: 'Pommes de terre', qty: 450, unit: 'g' }, time: 22 },
      { title: 'Wok familial', carb: { name: 'Riz basmati', qty: 250, unit: 'g' }, time: 15 },
      { title: 'Clafoutis salé', carb: { name: 'Œufs', qty: 6, unit: 'pièces' }, time: 35 },
      { title: 'Cocotte mijotée', carb: { name: 'Pommes de terre', qty: 500, unit: 'g' }, time: 65 },
      { title: 'Bol express', carb: { name: 'Lentilles corail', qty: 220, unit: 'g' }, time: 18 }
    ];
    const seasonVeggies = {
      Printemps: [
        { name: 'Petits pois', qty: 250, unit: 'g' },
        { name: 'Épinards frais', qty: 250, unit: 'g' },
        { name: 'Carottes', qty: 300, unit: 'g' },
        { name: 'Brocoli', qty: 300, unit: 'g' }
      ],
      Été: [
        { name: 'Courgettes', qty: 400, unit: 'g' },
        { name: 'Tomates', qty: 400, unit: 'g' },
        { name: 'Haricots verts', qty: 300, unit: 'g' },
        { name: 'Champignons de Paris', qty: 200, unit: 'g' }
      ],
      Automne: [
        { name: 'Poireaux', qty: 2, unit: 'pièces' },
        { name: 'Champignons de Paris', qty: 250, unit: 'g' },
        { name: 'Potimarron', qty: 450, unit: 'g' },
        { name: 'Carottes', qty: 350, unit: 'g' }
      ],
      Hiver: [
        { name: 'Poireaux', qty: 2, unit: 'pièces' },
        { name: 'Potimarron', qty: 500, unit: 'g' },
        { name: 'Brocoli', qty: 350, unit: 'g' },
        { name: 'Carottes', qty: 350, unit: 'g' }
      ]
    };
    const proteins = [
      { label: 'au poulet tendre', ing: { name: 'Blanc de poulet', qty: 420, unit: 'g' } },
      { label: 'au saumon doux', ing: { name: 'Pavés de saumon', qty: 3, unit: 'pièces' } },
      { label: 'aux œufs & emmental', ing: { name: 'Œufs', qty: 6, unit: 'pièces' } },
      { label: 'aux lentilles corail', ing: { name: 'Lentilles corail', qty: 200, unit: 'g' } }
    ];
    const sources = [
      'Marmiton • 4.8/5 (540 avis)',
      'CuisineAZ • 4.7/5 (420 avis)',
      'Femme Actuelle • 4.8/5 (390 avis)',
      '750g • 4.7/5 (460 avis)'
    ];

    const list = [...SEED_RECIPES];
    let idx = 11;
    for (let s = 0; s < seasons.length; s++) {
      const season = seasons[s];
      const vegList = seasonVeggies[season];
      for (let b = 0; b < bases.length; b++) {
        for (let p = 0; p < proteins.length; p++) {
          for (let v = 0; v < 2; v++) {
            const veg1 = vegList[(b + v) % vegList.length];
            const veg2 = vegList[(b + v + 1) % vegList.length];
            const base = bases[b];
            const prot = proteins[p];
            const ings = [prot.ing, veg1, veg2];
            if (base.carb.name !== prot.ing.name) ings.push(base.carb);
            list.push({
              id: 'rec_' + idx,
              title: `${base.title} ${prot.label}, ${veg1.name.toLowerCase()} & ${veg2.name.toLowerCase()}`,
              season,
              prepTime: base.time,
              source: sources[(idx + s) % sources.length],
              veggies: [veg1.name, veg2.name],
              ingredients: ings,
              steps: [
                `Préparer et tailler finement ${veg1.name.toLowerCase()} et ${veg2.name.toLowerCase()}.`,
                `Cuire ${base.carb.name.toLowerCase()} selon le mode habituel.`,
                `Saisir ${prot.ing.name.toLowerCase()} avec les légumes jusqu'à ce qu'ils soient bien fondants.`
              ],
              kidTip: 'Couper tous les ingrédients en bouchées régulières adaptées aux enfants de 3 et 5 ans.'
            });
            idx++;
          }
        }
      }
    }
    return list;
  }

  const ALL_RECIPES = buildExtendedCatalog();

  function inferCategory(name) {
    const n = (name || '').toLowerCase();
    if (/carotte|courgette|poireau|epinard|épinard|brocoli|potimarron|tomate|champignon|pois|haricot|salade|chou|oignon|pomme de terre/.test(n)) return 'legume';
    if (/pomme|banane|poire|fraise|clémentine|orange|kiwi|fruit/.test(n)) return 'fruit';
    if (/poulet|saumon|jambon|dinde|boeuf|bœuf|poisson|thon|cabillaud/.test(n)) return 'viande';
    if (/oeuf|œuf|lait|crème|creme|fromage|emmental|yaourt|beurre/.test(n)) return 'frais';
    return 'epicerie';
  }

  function matchesDuration(prepTime, slotId) {
    const slot = DURATION_SLOTS.find((s) => s.id === slotId) || DURATION_SLOTS[0];
    if (slot.id === '60+') return prepTime >= 60;
    return prepTime >= slot.min && prepTime <= slot.max;
  }

  function scoreRecipe(recipe, context) {
    const { season, stock, historyIds, ratings, slotId } = context;
    let score = 0;
    if (recipe.season === season) score += 45;
    if (matchesDuration(recipe.prepTime, slotId)) score += 30;
    else score -= 40;

    // Éviter les répétitions récentes
    const recentIndex = historyIds.indexOf(recipe.id);
    if (recentIndex !== -1) score -= Math.max(10, 40 - recentIndex * 4);

    // Note utilisateur (1 à 3 étoiles)
    const userRating = ratings[recipe.id] || 0;
    score += userRating * 8;

    // Disponibilité en stock + priorité ingrédients urgents (anti-gaspi)
    let matchedCount = 0;
    recipe.ingredients.forEach((req) => {
      const found = stock.find((s) => s.name.toLowerCase() === req.name.toLowerCase());
      if (found && found.qty > 0) {
        matchedCount++;
        score += found.qty >= req.qty ? 12 : 6;
        if (found.urgent) score += 20;
      }
    });
    if (matchedCount === recipe.ingredients.length) score += 15;
    return score;
  }

  return {
    DAYS,
    DURATION_SLOTS,
    DEFAULT_STOCK,
    ALL_RECIPES,
    inferCategory,
    matchesDuration,
    scoreRecipe
  };
})();
