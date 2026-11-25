window.OcrModule = (() => {
  const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo max
  const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
  let tesseractPromise = null;

  function validateFile(file) {
    if (!file) return 'Aucun fichier sélectionné.';
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Format non supporté : utilisez uniquement une image JPEG ou PNG.';
    }
    if (file.size > MAX_BYTES) {
      return 'Fichier trop volumineux : la taille maximale autorisée est de 5 Mo.';
    }
    return null;
  }

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (tesseractPromise) return tesseractPromise;
    tesseractPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.async = true;
      script.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Tesseract non initialisé')));
      script.onerror = () => {
        tesseractPromise = null;
        reject(new Error('Impossible de charger le moteur OCR (vérifiez votre connexion).'));
      };
      document.head.appendChild(script);
    });
    return tesseractPromise;
  }

  function parseReceiptLines(rawText) {
    const lines = (rawText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const items = [];
    const qtyRegex = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|cl|pieces?|pièces?|x)?/i;

    lines.forEach((line) => {
      if (line.length < 3) return;
      if (/total|tva|carte|cb|merci|ticket|caisse|rendu|espèces|sous-total/i.test(line)) return;
      const cleaned = line.replace(/\d+[.,]\d{2}\s*€?$/g, '').trim();
      if (cleaned.length < 2) return;

      let qty = 1;
      let unit = 'pièces';
      const m = cleaned.match(qtyRegex);
      if (m) {
        const val = parseFloat(m[1].replace(',', '.'));
        const u = (m[2] || '').toLowerCase();
        if (u === 'kg') { qty = Math.round(val * 1000); unit = 'g'; }
        else if (u === 'g') { qty = Math.round(val); unit = 'g'; }
        else if (u === 'l') { qty = Math.round(val * 1000); unit = 'ml'; }
        else if (u === 'cl') { qty = Math.round(val * 10); unit = 'ml'; }
        else if (u === 'ml') { qty = Math.round(val); unit = 'ml'; }
        else if (val > 0 && val <= 20) { qty = Math.round(val); unit = 'pièces'; }
      }

      const label = cleaned
        .replace(qtyRegex, '')
        .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (label.length >= 3) {
        const formatted = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
        items.push({
          checked: true,
          name: formatted,
          qty: qty > 0 ? qty : 1,
          unit,
          location: /pâtes|riz|lentilles|semoule|huile|farine|sucre|conserve/i.test(formatted) ? 'Étagère' : 'Frigo'
        });
      }
    });

    return items;
  }

  async function scanReceiptFile(file, onProgress) {
    const validationError = validateFile(file);
    if (validationError) throw new Error(validationError);

    const Tesseract = await loadTesseract();
    const result = await Tesseract.recognize(file, 'fra', {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(Math.round((m.progress || 0) * 100));
        }
      }
    });
    const text = result && result.data ? result.data.text : '';
    const parsed = parseReceiptLines(text);
    return { rawText: text, items: parsed };
  }

  return { scanReceiptFile, parseReceiptLines, validateFile };
})();
