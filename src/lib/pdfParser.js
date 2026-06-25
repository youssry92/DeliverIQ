// ── PDF Parser ──────────────────────────────────────────────
// Extracts tabular data from PDFs. Handles both:
//  • Text-based PDFs  → reconstruct rows/columns from positioned text
//  • Image-based PDFs → render pages and OCR them with Tesseract
// Returns the same shape as the CSV parser so the mapping UI is shared.

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { detectMapping } from './csvParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Cluster numbers into groups whose members are within `tol` of a group anchor.
function cluster(values, tol) {
  const sorted = [...values].sort((a, b) => a - b);
  const groups = [];
  for (const v of sorted) {
    const g = groups.find(g => Math.abs(g.anchor - v) <= tol);
    if (g) { g.items.push(v); g.anchor = g.items.reduce((s, x) => s + x, 0) / g.items.length; }
    else groups.push({ anchor: v, items: [v] });
  }
  return groups.map(g => g.anchor).sort((a, b) => a - b);
}

// Turn a list of {str,x,y,h} text items into a 2D grid (array of row-arrays).
function itemsToGrid(items) {
  if (!items.length) return [];
  const heights = items.map(i => i.h).filter(Boolean);
  const medianH = heights.sort((a, b) => a - b)[Math.floor(heights.length / 2)] || 8;

  // Group into rows by y (already top-origin → sort ascending, top first)
  const rowTol = Math.max(medianH * 0.6, 3);
  const byY = [...items].sort((a, b) => a.y - b.y);
  const rows = [];
  for (const it of byY) {
    let row = rows.find(r => Math.abs(r.y - it.y) <= rowTol);
    if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
    row.items.push(it);
  }

  // Merge consecutive words on each row into CELLS: a wide horizontal gap
  // signals a real column gutter; a small gap is just a space within a cell.
  const gutter = Math.max(medianH * 1.2, 12);
  const rowCells = rows.map(r => {
    const sorted = [...r.items].sort((a, b) => a.x - b.x);
    const cells = [];
    let cur = null;
    for (const it of sorted) {
      const x1 = it.x + (it.w || 0);
      if (cur && it.x - cur.x1 <= gutter) {
        cur.text += ' ' + it.str; cur.x1 = Math.max(cur.x1, x1);
      } else {
        cur = { x: it.x, x1, text: it.str }; cells.push(cur);
      }
    }
    return cells;
  });

  // Column anchors come from CELL starts (far fewer than word starts),
  // so multi-word cells no longer explode into separate columns.
  const colTol = Math.max(medianH * 2, 18);
  const colAnchors = cluster(rowCells.flatMap(cells => cells.map(c => c.x)), colTol);

  // Place each cell under its nearest column anchor
  const grid = rowCells.map(cells => {
    const out = Array(colAnchors.length).fill('');
    for (const c of cells) {
      let ci = 0, best = Infinity;
      for (let i = 0; i < colAnchors.length; i++) {
        const d = Math.abs(colAnchors[i] - c.x);
        if (d < best) { best = d; ci = i; }
      }
      out[ci] = (out[ci] ? out[ci] + ' ' : '') + c.text;
    }
    return out.map(c => c.trim());
  });
  return { grid, anchors: colAnchors };
}

// Pick the header row: first row where most cells are non-empty & non-numeric.
function pickHeader(grid) {
  // Prefer a row with the most filled cells (real table header beats a title line)
  let best = 0, bestScore = -1;
  for (let i = 0; i < Math.min(grid.length, 6); i++) {
    const filled = grid[i].filter(Boolean).length;
    if (filled < 2) continue;
    const numeric = grid[i].filter(c => c && /^[\d.,$%\s-]+$/.test(c)).length;
    const score = filled - numeric * 2; // headers are mostly text, not numbers
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

// Convert a grid into {headers, rows[]} objects, dropping empty/degenerate rows.
function gridToRecords(grid) {
  grid = grid.filter(r => r.some(c => c && c.length));
  if (grid.length < 2) return { headers: [], rows: [] };
  const hi = pickHeader(grid);
  let headers = grid[hi].map((h, i) => h || `Column ${i + 1}`);
  // de-duplicate header names
  const seen = {};
  headers = headers.map(h => { seen[h] = (seen[h] || 0) + 1; return seen[h] > 1 ? `${h} ${seen[h]}` : h; });
  const rows = grid.slice(hi + 1).map(cells => {
    const o = {};
    headers.forEach((h, i) => { o[h] = cells[i] ?? ''; });
    return o;
  }).filter(o => Object.values(o).some(v => v && String(v).trim()));
  return { headers, rows };
}

// ── Text-based extraction ───────────────────────────────────
async function extractText(pdf, onProgress) {
  let allItems = [];
  let totalChars = 0;
  let page1Width = 0, page1Items = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const vp = page.getViewport({ scale: 1 });
    if (p === 1) page1Width = vp.width;
    for (const it of content.items) {
      const str = (it.str || '').trim();
      if (!str) continue;
      totalChars += str.length;
      // transform = [a,b,c,d,e,f]; e=x, f=y. Flip y to top-origin so rows sort naturally.
      const item = { str, x: it.transform[4], y: vp.height - it.transform[5], w: it.width || 0, h: it.height || Math.abs(it.transform[3]) || 8 };
      allItems.push(item);
      if (p === 1) page1Items.push(item);
    }
    onProgress?.(Math.round((p / pdf.numPages) * 100), `Reading page ${p}/${pdf.numPages}`);
  }
  return { items: allItems, totalChars, page1Width, page1Items };
}

// Render a page to an image data URL (for the visual mapping preview).
async function renderPagePreview(pdf, pageNo, maxW = 900) {
  const page = await pdf.getPage(pageNo);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, maxW / base.width);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.8), w: canvas.width, h: canvas.height };
}

// Convert column anchors + page width into column bands as fractions [0..1].
// Each band is centered between adjacent anchors so it lines up over the page.
function anchorsToBands(anchors, pageWidth) {
  if (!anchors || !anchors.length || !pageWidth) return [];
  const a = [...anchors].sort((x, y) => x - y);
  const bands = [];
  for (let i = 0; i < a.length; i++) {
    const left = i === 0 ? 0 : (a[i - 1] + a[i]) / 2;
    const right = i === a.length - 1 ? pageWidth : (a[i] + a[i + 1]) / 2;
    bands.push({ x0: Math.max(0, left / pageWidth), x1: Math.min(1, right / pageWidth) });
  }
  return bands;
}

// Remove long horizontal/vertical lines (table gridlines) from a rendered page.
// Gridlines confuse OCR — it reads them as stray characters and splits cells.
// We detect runs of dark pixels that span a large fraction of the row/column
// and erase them to white, leaving the text untouched.
function stripGridlines(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const dark = (x, y) => {
    const i = (y * W + x) * 4;
    return (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) < 160;
  };
  const erase = (x, y) => { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; };
  const hRun = Math.floor(W * 0.30);  // a horizontal line spans ≥30% of width
  const vRun = Math.floor(H * 0.30);

  // Horizontal lines: scan each row for long dark runs
  for (let y = 0; y < H; y++) {
    let run = 0, start = 0;
    for (let x = 0; x < W; x++) {
      if (dark(x, y)) { if (run === 0) start = x; run++; }
      else { if (run >= hRun) for (let k = start; k < x; k++) { erase(k, y); if (y > 0) erase(k, y - 1); if (y < H - 1) erase(k, y + 1); } run = 0; }
    }
    if (run >= hRun) for (let k = start; k < W; k++) erase(k, y);
  }
  // Vertical lines: scan each column for long dark runs
  for (let x = 0; x < W; x++) {
    let run = 0, start = 0;
    for (let y = 0; y < H; y++) {
      if (dark(x, y)) { if (run === 0) start = y; run++; }
      else { if (run >= vRun) for (let k = start; k < y; k++) { erase(x, k); if (x > 0) erase(x - 1, k); if (x < W - 1) erase(x + 1, k); } run = 0; }
    }
    if (run >= vRun) for (let k = start; k < H; k++) erase(x, k);
  }
  ctx.putImageData(img, 0, 0);
}


async function extractOCR(pdf, file, onProgress) {
  const { createWorker } = await import('tesseract.js');
  // Pick the right local core based on WASM SIMD support
  let simd = false;
  try { simd = WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); } catch {}
  const corePath = simd ? '/tess/tesseract-core-simd-lstm.wasm.js' : '/tess/tesseract-core-lstm.wasm.js';

  // All assets served locally → works offline / behind corporate firewalls
  const worker = await createWorker('eng', 1, {
    workerPath: '/tess/worker.min.js',
    corePath,
    langPath: '/tessdata',
  });
  // Tune for accuracy while letting Tesseract do its own layout analysis
  await worker.setParameters({
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  });

  const grids = [];
  const page1 = { anchors: [], width: 0 };
  try {
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 3 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      await page.render({ canvasContext: ctx, viewport }).promise;
      stripGridlines(canvas); // erase table borders so OCR reads only the text

      onProgress?.(Math.round(((p - 0.5) / pdf.numPages) * 100), `OCR page ${p}/${pdf.numPages}…`);
      const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });

      // Collect words with bounding boxes. v7 nests them in blocks→paragraphs→lines→words;
      // older shapes expose data.words directly. Support both.
      const words = [];
      if (Array.isArray(data.words) && data.words.length) {
        words.push(...data.words);
      } else if (Array.isArray(data.blocks)) {
        for (const blk of data.blocks)
          for (const par of (blk.paragraphs || []))
            for (const ln of (par.lines || []))
              for (const w of (ln.words || [])) words.push(w);
      }

      const items = [];
      words.forEach(w => {
        const t = (w.text || '').trim();
        const bb = w.bbox || w.bbox0;
        if (t && bb) items.push({ str: t, x: bb.x0, y: bb.y0, w: bb.x1 - bb.x0, h: bb.y1 - bb.y0 });
      });
      if (items.length) {
        const { grid, anchors } = itemsToGrid(items);
        grids.push(...grid);
        if (p === 1) { page1.anchors = anchors; page1.width = canvas.width; }
      }
      onProgress?.(Math.round((p / pdf.numPages) * 100), `OCR page ${p}/${pdf.numPages} done`);
    }
  } finally {
    await worker.terminate();
  }
  return { grids, page1 };
}

// ── Main entry ──────────────────────────────────────────────
export async function parsePDF(file, onProgress) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  onProgress?.(5, 'Opening PDF…');
  const { items, totalChars, page1Width, page1Items } = await extractText(pdf, onProgress);

  // Heuristic: ~enough embedded text means it's a real text PDF; otherwise OCR.
  const isTextBased = totalChars > 40 && items.length > 10;

  let headers, rows, method, bands = [];
  if (isTextBased) {
    method = 'text';
    const { grid, anchors } = itemsToGrid(items);
    ({ headers, rows } = gridToRecords(grid));
    // Column bands from page-1 text positions (in points)
    const p1 = itemsToGrid(page1Items.length ? page1Items : items);
    bands = anchorsToBands(p1.anchors, page1Width);
  }

  // If text path produced nothing usable, fall back to OCR.
  if (!isTextBased || !rows || rows.length === 0) {
    method = 'ocr';
    onProgress?.(10, 'No embedded text — running OCR…');
    const { grids, page1 } = await extractOCR(pdf, file, onProgress);
    ({ headers, rows } = gridToRecords(grids));
    bands = anchorsToBands(page1.anchors, page1.width);
  }

  if (!headers || headers.length === 0 || rows.length === 0) {
    throw new Error("Couldn't extract a table from this PDF. If it's a scanned document, make sure the text is clear and upright. A CSV export usually works best.");
  }

  // Render page 1 as an image for the visual mapping preview
  onProgress?.(96, 'Preparing preview…');
  let pageImage = null;
  try { pageImage = await renderPagePreview(pdf, 1); } catch { /* preview is optional */ }

  // Align bands to the number of detected columns (pad/trim defensively)
  if (bands.length !== headers.length) {
    if (bands.length > headers.length) bands = bands.slice(0, headers.length);
    else while (bands.length < headers.length) bands.push(null);
  }

  const mapping = detectMapping(headers);
  onProgress?.(100, 'Done');
  return {
    headers, mapping, rows, rowCount: rows.length, preview: rows.slice(0, 3), method,
    pageImage,            // { dataUrl, w, h } of page 1
    columnBands: bands,   // [{x0,x1}] fractions of page width, per column
  };
}
