// ── LocalStorage Persistence Layer ──────────────────────────
const STORAGE_KEY = 'deliveriq_data';
const THEME_KEY = 'deliveriq_theme';
const CONFIG_KEY = 'deliveriq_config';

export function saveProjects(projects) {
  const data = loadAll();
  data.projects = projects;
  data.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function savePMs(pms) {
  const data = loadAll();
  data.pms = pms;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveICs(ics) {
  const data = loadAll();
  data.ics = ics;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveMapping(mapping) {
  const data = loadAll();
  data.columnMapping = mapping;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.error('Failed to load data:', e); }
  return { projects: [], pms: [], ics: [], columnMapping: null, lastUpdated: null };
}

export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasData() {
  const data = loadAll();
  return data.projects && data.projects.length > 0;
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
}

export function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { orgName: 'DeliverIQ', tagline: 'Delivery Intelligence' };
}

// ── Sample Data for Demo Mode ───────────────────────────────
export const SAMPLE_PROJECTS = [
  { id:1, name:"Titan ERP Migration", client:"Meridian Corp", pm:"Sarah Chen", region:"APAC", status:"at-risk", health:38, rev:2400000, billed:960000, ms:12, cms:5, ov:2, dd:14, nm:"UAT Sign-off", nd:"Jul 12", trend:[-2,-5,-3,-8,-4], ics:["Anika P.","Tomás R."] },
  { id:2, name:"CloudFirst Platform", client:"Nordvik AS", pm:"Erik Lindberg", region:"EMEA", status:"on-track", health:82, rev:1850000, billed:1480000, ms:8, cms:7, ov:0, dd:0, nm:"Go-Live", nd:"Jul 1", trend:[3,2,5,4,1], ics:["Yuki T.","Fatima A."] },
  { id:3, name:"FinCore Rollout", client:"Atlas Financial", pm:"Priya Sharma", region:"MEA", status:"on-track", health:91, rev:3100000, billed:2790000, ms:10, cms:9, ov:0, dd:0, nm:"Hypercare Exit", nd:"Jul 20", trend:[1,3,2,2,4], ics:["Fatima A.","Daniel O."] },
  { id:4, name:"RetailHub Integration", client:"Luxe Group", pm:"Sarah Chen", region:"APAC", status:"critical", health:22, rev:1200000, billed:240000, ms:6, cms:1, ov:3, dd:45, nm:"Data Migration", nd:"Jun 15", trend:[-4,-8,-6,-12,-10], ics:["Anika P."] },
  { id:5, name:"SmartFleet Telematics", client:"Vanguard Motors", pm:"James Okafor", region:"EMEA", status:"on-track", health:75, rev:980000, billed:588000, ms:5, cms:3, ov:0, dd:0, nm:"Phase 2", nd:"Aug 1", trend:[2,1,3,0,2], ics:["Yuki T.","Lena H."] },
  { id:6, name:"Omni Commerce", client:"Peak Retail", pm:"Laura Martinez", region:"AMER", status:"at-risk", health:45, rev:1650000, billed:495000, ms:9, cms:3, ov:1, dd:8, nm:"API Gateway", nd:"Jul 5", trend:[1,-2,-1,-3,-2], ics:["Carlos M.","Tomás R."] },
  { id:7, name:"HR Transform", client:"Cascade Health", pm:"Priya Sharma", region:"MEA", status:"on-track", health:88, rev:750000, billed:600000, ms:4, cms:3, ov:0, dd:0, nm:"Training", nd:"Jul 15", trend:[2,4,3,1,5], ics:["Daniel O."] },
  { id:8, name:"DataVault Analytics", client:"Crestline Bank", pm:"Erik Lindberg", region:"EMEA", status:"at-risk", health:52, rev:2200000, billed:660000, ms:7, cms:2, ov:1, dd:11, nm:"ETL Pipeline", nd:"Jul 8", trend:[0,-1,-3,-2,-4], ics:["Lena H.","Carlos M."] },
];

export const SAMPLE_PMS = [
  { name:"Priya Sharma", ini:"PS", region:"MEA", xp:4200, ah:89.5, br:0.92, ov:0, streak:14, badges:["perfectBilling","zeroOverdue","streakMaster","topHealth"] },
  { name:"James Okafor", ini:"JO", region:"EMEA", xp:2800, ah:72, br:0.6, ov:0, streak:8, badges:["zeroOverdue","teamPlayer"] },
  { name:"Erik Lindberg", ini:"EL", region:"EMEA", xp:2400, ah:67, br:0.78, ov:1, streak:5, badges:["fastCloser"] },
  { name:"Sarah Chen", ini:"SC", region:"APAC", xp:1400, ah:30, br:0.5, ov:5, streak:0, badges:[] },
  { name:"Laura Martinez", ini:"LM", region:"AMER", xp:800, ah:30, br:0.23, ov:3, streak:0, badges:[] },
];
