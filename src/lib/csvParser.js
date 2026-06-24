import Papa from 'papaparse';

// ── Known Column Patterns ───────────────────────────────────
const FIELD_PATTERNS = {
  project_ref: [/ref/i, /reference/i, /project.?id/i, /order.?id/i, /^id$/i],
  project_name: [/project.?name/i, /order.?desc/i, /description/i, /^name$/i],
  client: [/client/i, /customer/i, /account/i, /company/i],
  milestone_name: [/milestone.?desc/i, /milestone.?name/i, /deliverable/i],
  milestone_no: [/milestone.?no/i, /milestone.?num/i, /ms.?no/i, /^no$/i],
  milestone_value: [/value/i, /amount/i, /revenue/i, /price/i, /cost/i, /billing/i],
  milestone_status: [/status/i, /state/i, /stage/i],
  expected_date: [/expected/i, /planned/i, /target.?date/i, /due.?date/i, /^due$/i],
  actual_date: [/actual/i, /completed/i, /billed.?date/i],
  pm: [/pm/i, /project.?manager/i, /manager/i, /owner/i, /lead/i],
  region: [/region/i, /area/i, /geography/i, /territory/i, /country/i],
  health: [/health/i, /score/i, /rag/i, /rating/i],
  overdue: [/overdue/i, /days.?late/i, /delay/i, /slip/i],
  csat: [/csat/i, /satisfaction/i, /nps/i],
  consultant: [/consultant/i, /resource/i, /assigned/i, /engineer/i, /implementer/i],
};

// ── Auto-detect column mapping ──────────────────────────────
export function detectMapping(headers) {
  const mapping = {};
  
  for (const header of headers) {
    let bestMatch = null;
    let bestConf = 0;
    
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(header)) {
          const conf = header.toLowerCase().includes(field.replace('_', '')) ? 95 : 85;
          if (conf > bestConf) {
            bestConf = conf;
            bestMatch = field;
          }
        }
      }
    }
    
    if (bestMatch) {
      mapping[header] = { field: bestMatch, confidence: bestConf };
    } else {
      // Try fuzzy match
      const lower = header.toLowerCase();
      for (const [field] of Object.entries(FIELD_PATTERNS)) {
        if (lower.includes(field.replace('_', ' ')) || lower.includes(field.replace('_', ''))) {
          mapping[header] = { field, confidence: 70 };
          break;
        }
      }
      if (!mapping[header]) {
        mapping[header] = { field: 'unmapped', confidence: 0 };
      }
    }
  }
  
  return mapping;
}

// ── Detect binary / encrypted files before parsing ─────────
function looksBinary(text) {
  if (!text) return false;
  // Known encryption/binary magic markers
  const head = text.slice(0, 64);
  if (/MARPCRYPT|MSMAMA|AES\/CBC|PK\x03\x04|%PDF|\x00/.test(head)) return true;
  // High ratio of non-printable characters = not a text CSV
  let nonPrintable = 0;
  const sample = text.slice(0, 2000);
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0 || (c < 32 && c !== 9 && c !== 10 && c !== 13) || c === 65533) nonPrintable++;
  }
  return sample.length > 0 && (nonPrintable / sample.length) > 0.1;
}

// ── Parse CSV file ──────────────────────────────────────────
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    // First read a chunk as text to check it's really a CSV
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (looksBinary(text)) {
        reject(new Error("This file looks encrypted or isn't a plain CSV. Export it again as 'CSV (Comma delimited)' without password protection, then re-upload. A real CSV opens as readable text in Notepad/TextEdit."));
        return;
      }
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          const headers = (results.meta.fields || []).filter(h => h && h.trim());
          if (headers.length === 0) {
            reject(new Error("No columns found. Make sure the first row contains column headers and the file is a valid CSV."));
            return;
          }
          const mapping = detectMapping(headers);
          const rows = results.data;
          resolve({ headers, mapping, rows, rowCount: rows.length, preview: rows.slice(0, 3) });
        },
        error: (error) => reject(error),
      });
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsText(file.slice(0, 4096)); // sample first 4KB for the binary check
  });
}

// ── Transform parsed data into projects ─────────────────────
export function transformToProjects(rows, mapping) {
  // Find which CSV columns map to which fields
  const fieldToCol = {};
  for (const [col, map] of Object.entries(mapping)) {
    if (map.field !== 'unmapped') {
      fieldToCol[map.field] = col;
    }
  }
  
  // Group rows by project reference
  const projectMap = {};
  
  for (const row of rows) {
    const ref = row[fieldToCol.project_ref] || row[fieldToCol.project_name] || `proj-${Object.keys(projectMap).length + 1}`;
    const name = row[fieldToCol.project_name] || ref;
    
    if (!projectMap[ref]) {
      projectMap[ref] = {
        id: Object.keys(projectMap).length + 1,
        ref,
        name,
        client: row[fieldToCol.client] || 'Unknown',
        pm: row[fieldToCol.pm] || 'Unassigned',
        region: row[fieldToCol.region] || 'Global',
        milestones: [],
        health: parseInt(row[fieldToCol.health]) || 50,
        ics: [],
      };
    }
    
    // Add milestone
    const msValue = parseFloat(String(row[fieldToCol.milestone_value] || '0').replace(/[^0-9.-]/g, '')) || 0;
    const msStatus = (row[fieldToCol.milestone_status] || '').toLowerCase();
    
    projectMap[ref].milestones.push({
      name: row[fieldToCol.milestone_name] || `Milestone ${projectMap[ref].milestones.length + 1}`,
      no: row[fieldToCol.milestone_no] || '',
      value: msValue,
      status: msStatus,
      expectedDate: row[fieldToCol.expected_date] || '',
      actualDate: row[fieldToCol.actual_date] || '',
    });
    
    // Add consultant
    const ic = row[fieldToCol.consultant];
    if (ic && !projectMap[ref].ics.includes(ic)) {
      projectMap[ref].ics.push(ic);
    }
  }
  
  // Calculate derived fields
  const projects = Object.values(projectMap).map(p => {
    const totalValue = p.milestones.reduce((s, m) => s + m.value, 0);
    const billedMs = p.milestones.filter(m => ['completed', 'billed', 'done', 'invoiced', 'closed'].some(s => m.status.includes(s)));
    const billedValue = billedMs.reduce((s, m) => s + m.value, 0);
    const overdueMs = p.milestones.filter(m => {
      if (m.actualDate || ['completed', 'billed', 'done'].some(s => m.status.includes(s))) return false;
      if (!m.expectedDate) return false;
      return new Date(m.expectedDate) < new Date();
    });
    
    const nextMs = p.milestones.find(m => !['completed', 'billed', 'done', 'invoiced', 'closed'].some(s => m.status.includes(s)));
    
    // Determine status
    let status = 'on-track';
    if (overdueMs.length >= 3 || p.health < 30) status = 'critical';
    else if (overdueMs.length > 0 || p.health < 60) status = 'at-risk';
    
    return {
      id: p.id,
      name: p.name,
      client: p.client,
      pm: p.pm,
      region: p.region,
      status,
      health: p.health,
      rev: totalValue,
      billed: billedValue,
      ms: p.milestones.length,
      cms: billedMs.length,
      ov: overdueMs.length,
      dd: overdueMs.length > 0 ? Math.max(...overdueMs.map(m => Math.floor((new Date() - new Date(m.expectedDate)) / 86400000))) : 0,
      nm: nextMs?.name || 'Complete',
      nd: nextMs?.expectedDate ? new Date(nextMs.expectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
      trend: [0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 10) - 5), // placeholder
      ics: p.ics,
    };
  });
  
  // Extract unique PMs
  const pmMap = {};
  projects.forEach(p => {
    if (!pmMap[p.pm]) {
      pmMap[p.pm] = { name: p.pm, ini: p.pm.split(' ').map(w => w[0]).join('').slice(0, 2), region: p.region, xp: 0, ah: 0, br: 0, ov: 0, streak: 0, badges: [], projectCount: 0, totalHealth: 0, totalBilled: 0, totalRev: 0 };
    }
    pmMap[p.pm].projectCount++;
    pmMap[p.pm].totalHealth += p.health;
    pmMap[p.pm].totalBilled += p.billed;
    pmMap[p.pm].totalRev += p.rev;
    pmMap[p.pm].ov += p.ov;
  });
  
  const pms = Object.values(pmMap).map(pm => ({
    ...pm,
    ah: Math.round(pm.totalHealth / pm.projectCount),
    br: pm.totalRev > 0 ? pm.totalBilled / pm.totalRev : 0,
    xp: Math.round(pm.totalBilled / 1000) + (pm.ov === 0 ? 500 : 0),
    badges: [
      ...(pm.totalRev > 0 && pm.totalBilled / pm.totalRev > 0.9 ? ['perfectBilling'] : []),
      ...(pm.ov === 0 ? ['zeroOverdue'] : []),
    ],
  })).sort((a, b) => b.xp - a.xp);
  
  return { projects, pms };
}
