window.PdfModule = (() => {
  let jspdfPromise = null;

  function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jspdfPromise) return jspdfPromise;
    jspdfPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      script.async = true;
      script.onload = () => {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF indisponible'));
      };
      script.onerror = () => {
        jspdfPromise = null;
        reject(new Error('Chargement jsPDF impossible'));
      };
      document.head.appendChild(script);
    });
    return jspdfPromise;
  }

  function drawCategoryIcon(doc, category, x, y) {
    const colors = {
      legume: [45, 106, 79],
      fruit: [224, 122, 63],
      viande: [184, 50, 39],
      frais: [58, 124, 165],
      epicerie: [140, 102, 53]
    };
    const tags = { legume: 'LEG', fruit: 'FRU', viande: 'PRO', frais: 'FRA', epicerie: 'EPI' };
    const rgb = colors[category] || colors.epicerie;
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(x, y - 3.6, 8.5, 4.6, 1.2, 1.2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(tags[category] || 'ING', x + 4.25, y - 0.5, { align: 'center' });
    doc.setTextColor(27, 38, 32);
  }

  async function buildWeekPdfBlob({ season, plan, recipesById, shoppingList, includeShopping }) {
    const JsPDF = await loadJsPdf();
    const doc = new JsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;
    let y = 16;

    function addFooter() {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(110, 120, 114);
        doc.text(`P'tits Dîners • Saison ${season} • Famille 4 pers.`, margin, pageH - 8);
        doc.text(`Page ${i}/${pageCount}`, pageW - margin, pageH - 8, { align: 'right' });
      }
    }

    function ensureSpace(neededHeight) {
      if (y + neededHeight > pageH - 16) {
        doc.addPage();
        y = 16;
      }
    }

    // Bandeau titre
    doc.setFillColor(45, 106, 79);
    doc.roundedRect(margin, y, contentW, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Menu de la semaine — ${season}`, margin + 5, y + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('4 personnes (2 adultes + enfants 3 et 5 ans) • Légumes équilibrés', margin + 5, y + 13.5);
    y += 24;

    // Fiches recettes par jour
    plan.forEach((slot) => {
      const recipe = recipesById[slot.recipeId];
      if (!recipe) return;
      const mult = slot.doubleBatch ? 2 : 1;
      const ingLines = recipe.ingredients.map(
        (ing) => `${ing.name} (${Math.round(ing.qty * mult)} ${ing.unit})`
      );
      const ingText = 'Ingrédients : ' + ingLines.join(', ');
      const stepText = 'Préparation : ' + recipe.steps.join(' ');

      doc.setFontSize(9);
      const wrappedIng = doc.splitTextToSize(ingText, contentW - 8);
      const wrappedSteps = doc.splitTextToSize(stepText, contentW - 8);
      const boxH = 14 + wrappedIng.length * 4.2 + wrappedSteps.length * 4.2 + 4;

      ensureSpace(boxH + 4);

      doc.setDrawColor(210, 220, 212);
      doc.setFillColor(248, 250, 248);
      doc.roundedRect(margin, y, contentW, boxH, 2.5, 2.5, 'FD');

      doc.setTextColor(45, 106, 79);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      const headerLine = `${slot.day.toUpperCase()} • ${recipe.title}${slot.doubleBatch ? ' [x2 Avance]' : ''}`;
      doc.text(headerLine, margin + 4, y + 6);

      doc.setTextColor(92, 107, 98);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(
        `Temps : ${recipe.prepTime} min | Légumes : ${recipe.veggies.join(', ')} | Portions : ${4 * mult} pers.`,
        margin + 4,
        y + 11
      );

      let cursorY = y + 16;
      doc.setTextColor(27, 38, 32);
      doc.setFontSize(9);
      doc.text(wrappedIng, margin + 4, cursorY);
      cursorY += wrappedIng.length * 4.2 + 1.5;
      doc.text(wrappedSteps, margin + 4, cursorY);

      y += boxH + 4;
    });

    // Liste de courses complémentaire avec pictos
    if (includeShopping && shoppingList.length > 0) {
      ensureSpace(24);
      y += 2;
      doc.setFillColor(224, 122, 63);
      doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Liste de courses complémentaire', margin + 4, y + 6.8);
      y += 15;

      shoppingList.forEach((item) => {
        ensureSpace(8);
        drawCategoryIcon(doc, item.category, margin + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(27, 38, 32);
        doc.text(`${item.name} — ${item.missingQty} ${item.unit}`, margin + 13, y);
        y += 6.5;
      });
    }

    addFooter();
    const blob = doc.output('blob');
    if (!blob || blob.size === 0) {
      throw new Error('Le fichier PDF généré est vide.');
    }
    return blob;
  }

  return { buildWeekPdfBlob };
})();
