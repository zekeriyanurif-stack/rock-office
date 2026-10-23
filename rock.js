/* ===== Rock character system — designVersion 1 ===== */
const DESIGN_VERSION = 1;
const INK = "#2C2724";
const PALETTES = [
  {id:"sage",     body:"#AEBDA6", shade:"#8FA088", speck:"#7D8E77"},
  {id:"lavender", body:"#D3CAE8", shade:"#B4A8D2", speck:"#9E92BF"},
  {id:"sand",     body:"#E6CDA4", shade:"#CDAF80", speck:"#B8996B"},
  {id:"slate",    body:"#BFC3C6", shade:"#9FA4A8", speck:"#8A8F94"},
  {id:"clay",     body:"#E6BBA9", shade:"#CC9A85", speck:"#B88470"},
  {id:"moss",     body:"#C3C795", shade:"#A3A873", speck:"#8F9460"}
];
const NEUTRAL_PAL = {id:"stone", body:"#D9D3C8", shade:"#BDB5A7", speck:"#A69E90"};
const SHAPES = [
  {w:1.00, h:1.00, k:[0.035, 0.025, 0.015], ph:[0.4, 1.9, 2.6], flat:0.80},
  {w:1.08, h:0.90, k:[0.050, 0.020, 0.020], ph:[1.2, 0.3, 4.1], flat:0.76},
  {w:0.94, h:1.08, k:[0.030, 0.040, 0.015], ph:[2.2, 3.1, 0.9], flat:0.84},
  {w:1.04, h:0.96, k:[0.060, 0.030, 0.010], ph:[5.0, 1.0, 2.0], flat:0.78},
  {w:0.98, h:1.02, k:[0.020, 0.050, 0.025], ph:[0.9, 4.4, 1.3], flat:0.82}
];
const ACCESSORIES = ["none", "scarf", "leaf", "glasses"];
const OVERRIDES = {
  milo: {pal:0, shape:0, eyes:0, smile:1, acc:1},
  luna: {pal:1, shape:2, eyes:1, smile:0, acc:2},
  greg: {pal:2, shape:1, eyes:3, smile:0, acc:3}
};

function normalizeName(s){ return String(s || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase(); }
function stableHash(s){ let h = 2166136261 >>> 0; for (const ch of s){ h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function prng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function deriveAppearance(displayName){
  const canon = normalizeName(displayName);
  if (!canon) return {designVersion:DESIGN_VERSION, neutral:true, pal:-1, shape:0, eyes:0, smile:0, acc:0, tex:7};
  const seed = stableHash(canon), r = prng(seed);
  const a = {designVersion:DESIGN_VERSION, neutral:false,
    pal: Math.floor(r()*PALETTES.length), shape: Math.floor(r()*SHAPES.length),
    eyes: Math.floor(r()*4), smile: Math.floor(r()*3), acc: Math.floor(r()*ACCESSORIES.length), tex: seed % 100000};
  const o = OVERRIDES[canon];
  return o ? Object.assign(a, o) : a;
}

/* ---- geometry ---- */
const CX = 160, CY = 132, RX = 84, RY = 64;
function bodyPoints(shapeId){
  const s = SHAPES[shapeId] || SHAPES[0], pts = [];
  for (let i = 0; i < 18; i++){
    const a = i / 18 * Math.PI * 2;
    const w = 1 + s.k[0]*Math.sin(2*a + s.ph[0]) + s.k[1]*Math.sin(3*a + s.ph[1]) + s.k[2]*Math.sin(5*a + s.ph[2]);
    let x = CX + Math.cos(a) * RX * s.w * w;
    let y = CY + Math.sin(a) * RY * s.h * w * (Math.sin(a) > 0 ? s.flat : 1);
    pts.push([x, y]);
  }
  return pts;
}
function smoothPath(pts){
  const n = pts.length, f = v => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++){
    const p0 = pts[(i-1+n)%n], p1 = pts[i], p2 = pts[(i+1)%n], p3 = pts[(i+2)%n];
    const c1 = [p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6];
    const c2 = [p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}
function bodyBox(shapeId){ const p = bodyPoints(shapeId); const ys = p.map(q=>q[1]), xs = p.map(q=>q[0]); return {top:Math.min(...ys), bottom:Math.max(...ys), left:Math.min(...xs), right:Math.max(...xs)}; }

/* ---- parts ---- */
function palOf(a){ return a.neutral ? NEUTRAL_PAL : PALETTES[a.pal] || PALETTES[0]; }
function partShade(a){
  // a soft lower-right shade crescent clipped by body
  const b = bodyBox(a.shape);
  return `<ellipse cx="${CX + 22}" cy="${(CY + 24).toFixed(1)}" rx="${(RX*0.95).toFixed(1)}" ry="${((b.bottom - CY)*1.05).toFixed(1)}" fill="${palOf(a).shade}" opacity=".55"/>`;
}
function partSpecks(a){
  const r = prng(a.tex * 31 + 7), pal = palOf(a), out = [];
  const spots = [[-58,-26],[-64,8],[-40,30],[52,-30],[62,4],[40,32],[-12,-48],[24,-46]];
  const n = 3 + Math.floor(r()*3);
  for (let i = 0; i < n; i++){
    const s = spots[Math.floor(r()*spots.length)], x = CX + s[0] + (r()*8-4), y = CY + s[1] + (r()*6-3);
    out.push(r() > 0.45
      ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.6 + r()*1.8).toFixed(1)}" fill="${pal.speck}"/>`
      : `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(5+r()*5).toFixed(1)} ${(r()*4-2).toFixed(1)}" stroke="${pal.speck}" stroke-width="2" stroke-linecap="round"/>`);
  }
  return out.join("");
}
function eyePos(a){ const b = bodyBox(a.shape); const ey = CY - (CY - b.top) * 0.18; return {l:[CX - 24, ey], r:[CX + 22, ey], m:[CX - 1, ey + 22]}; }
function partFace(a){
  const p = eyePos(a), [lx, ly] = p.l, [rx, ry] = p.r, [mx, my] = p.m, o = [];
  const eye = (x, y) => {
    switch (a.eyes){
      case 1: return `<path d="M${x-6} ${y+1}q6 -6 12 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
      case 2: return `<circle cx="${x}" cy="${y}" r="6.2" fill="${INK}"/><circle cx="${x+2}" cy="${y-2.2}" r="2" fill="#fff"/><path d="M${x-6} ${y-12}l10 -2" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
      case 3: return `<path d="M${x-6} ${y-1}h12" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M${x-5} ${y-1}a5 5 0 0 0 10 0z" fill="${INK}"/>`;
      default: return `<circle cx="${x}" cy="${y}" r="5" fill="${INK}"/><circle cx="${x+1.8}" cy="${y-1.8}" r="1.6" fill="#fff"/>`;
    }
  };
  o.push(eye(lx, ly), eye(rx, ry));
  if (!a.neutral) o.push(`<circle cx="${lx-10}" cy="${ly+12}" r="6" fill="#E98C77" opacity=".28"/><circle cx="${rx+10}" cy="${ry+12}" r="6" fill="#E98C77" opacity=".28"/>`);
  const smile = [`M${mx-8} ${my}q8 7 16 0`, `M${mx-12} ${my-1}q12 11 24 0`, `M${mx-8} ${my+1}q9 5 17 -4`][a.neutral ? 0 : a.smile] || `M${mx-8} ${my}q8 7 16 0`;
  o.push(`<path d="${smile}" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`);
  return o.join("");
}
function partAcc(a){
  if (a.neutral) return "";
  const b = bodyBox(a.shape), p = eyePos(a);
  switch (ACCESSORIES[a.acc]){
    case "scarf": {
      const y = CY + (b.bottom - CY) * 0.42, l = b.left + 14, r = b.right - 14;
      return `<path d="M${l} ${y-6}Q${CX} ${y+12} ${r} ${y-8}L${r+2} ${y+8}Q${CX} ${y+28} ${l-2} ${y+9}Z" fill="#E2725B" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M${r-22} ${y+8}l6 30l14 -4l-4 -28" fill="#D9654E" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M${l+20} ${y+4}Q${CX} ${y+20} ${r-30} ${y+2}" fill="none" stroke="#F2A08C" stroke-width="2" stroke-linecap="round"/>`;
    }
    case "leaf": {
      const x = CX + 14, y = b.top + 4;
      return `<path d="M${x} ${y+2}q-2 -10 4 -18" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M${x+4} ${y-16}c10 -12 26 -10 30 -4c-6 10 -22 14 -30 4z" fill="#86A577" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M${x+6} ${y-15}c8 -3 14 -4 22 -4" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".6"/>`;
    }
    case "glasses": {
      const [lx, ly] = p.l, [rx, ry] = p.r;
      return `<g fill="rgba(255,255,255,.25)" stroke="${INK}" stroke-width="2.6"><circle cx="${lx}" cy="${ly}" r="13"/><circle cx="${rx}" cy="${ry}" r="13"/></g>
        <path d="M${lx+13} ${ly-1}q${(rx-lx-26)/2} -6 ${rx-lx-26} 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    }
    default: return "";
  }
}

/* ---- scenes (props around the rock; not in the box) ---- */
const SCENES = {
  desk:   {layer:"front", svg:`<path d="M20 214h280" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><g transform="translate(246 160)"><rect x="0" y="0" width="56" height="38" rx="4" fill="#F6F1E7" stroke="${INK}" stroke-width="2.4"/><rect x="6" y="6" width="44" height="26" rx="2" fill="#CFE0E6"/><path d="M-6 52h68l-6 -14h-56z" fill="#F6F1E7" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></g>`},
  paper:  {layer:"back",  svg:`<g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"><path d="M70 196l86 -10l10 22l-88 10z" fill="#FFFDF7"/><path d="M150 200l84 4l-4 22l-86 -4z" fill="#FFFDF7"/></g><path d="M86 204l50 -6M162 210l48 2" stroke="${INK}" stroke-width="1.6" opacity=".4"/>`},
  secret: {layer:"front", svg:`<path d="M232 30h62a12 12 0 0 1 12 12v22a12 12 0 0 1 -12 12h-40l-14 14v-14h-8a12 12 0 0 1 -12 -12v-22a12 12 0 0 1 12 -12z" fill="#FFFDF7" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`},
  coffee: {layer:"front", svg:`<g transform="translate(24 158)"><path d="M0 8h40l-4 38a6 6 0 0 1 -6 5h-20a6 6 0 0 1 -6 -5z" fill="#FFFDF7" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M40 16c12 0 12 18 -2 18" fill="none" stroke="${INK}" stroke-width="2.4"/><path d="M12 -4c-4 -6 4 -10 0 -16M24 -4c-4 -6 4 -10 0 -16" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".5"/><path d="M4 18h32" stroke="#B9875F" stroke-width="6" opacity=".5"/></g>`},
  travel: {layer:"back",  svg:`<g transform="rotate(-8 70 60)"><rect x="18" y="22" width="104" height="70" rx="6" fill="#FFFDF7" stroke="${INK}" stroke-width="2.4"/><path d="M28 74l22 -22l16 14l14 -12l30 20" fill="none" stroke="#86A577" stroke-width="2.4" stroke-linejoin="round"/><circle cx="46" cy="40" r="7" fill="#E9B872"/><rect x="96" y="28" width="20" height="24" rx="2" fill="none" stroke="#E2725B" stroke-width="2" stroke-dasharray="3 2"/></g>`},
  nothing:{layer:"back",  svg:`<rect x="186" y="18" width="110" height="96" rx="6" fill="#DCE8EC" stroke="${INK}" stroke-width="2.4"/><path d="M241 18v96M186 66h110" stroke="${INK}" stroke-width="2.4"/><path d="M200 44c8 -6 18 -6 24 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M14 214h292" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`}
};

/* full static svg (used for cards, passport, share image) */
function rockSVG(a, opts){
  opts = opts || {};
  const scenes = (opts.scenes || []).filter(k => SCENES[k]);
  const back = scenes.filter(k => SCENES[k].layer === "back").map(k => SCENES[k].svg).join("");
  const front = scenes.filter(k => SCENES[k].layer === "front").map(k => SCENES[k].svg).join("");
  const d = smoothPath(bodyPoints(a.shape)), pal = palOf(a), cid = "c" + Math.random().toString(36).slice(2, 8);
  const bg = opts.bg ? `<rect width="320" height="236" fill="${opts.bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 236" ${opts.label ? `role="img" aria-label="${opts.label}"` : 'aria-hidden="true"'}>${bg}${back}
    <ellipse cx="${CX}" cy="${bodyBox(a.shape).bottom + 4}" rx="${RX*0.85}" ry="9" fill="${INK}" opacity=".12"/>
    <defs><clipPath id="${cid}"><path d="${d}"/></clipPath></defs>
    <path d="${d}" fill="${pal.body}"/>
    <g clip-path="url(#${cid})">${partShade(a)}${partSpecks(a)}</g>
    <path d="${d}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    ${partFace(a)}${partAcc(a)}${front}</svg>`;
}


/* ===== Content catalog — storyVersion 1 ===== */
const STORY_VERSION = 1;
const SKILLS = {
  desk:   {title:"Desk companion", line:"Attends every meeting. Adds nothing.", card:"Silent coworker", scene:"desk"},
  paper:  {title:"Paperweight", line:"A natural talent for holding things down.", card:"Holding things down", scene:"paper"},
  secret: {title:"Secret keeper", line:"Tell it everything. Expect no advice.", card:"Professional listener", scene:"secret"} };
const PLANS = {
  coffee: {title:"Coffee break", line:()=>"No coffee. Just company.", card:"Coffee break", scene:"coffee", first:"coffee nearby. Nothing to add."},
  travel: {title:"Travel buddy", line:n=>`You carry the luggage. And ${n}.`, card:"Travel buddy", scene:"travel", first:"a trip in a coat pocket. Window seat, technically."},
  nothing:{title:"Do nothing", line:()=>"Finally, plans you can both keep.", card:"Doing nothing", scene:"nothing", first:"a window, a view, no plans. Perfect."} };
function storyFor(n, skill, plan){
  const s = SKILLS[skill], p = PLANS[plan];
  return [
    {scenes:[], text:`${n} sat by a stream for a very long time. It was in no hurry.`},
    {scenes:[], text:`Then someone gave it a name: ${n}. It took the news calmly.`},
    p ? {scenes:[p.scene], text:`${n}'s first day: ${p.first}`} : {scenes:[], text:`${n}'s first day: arrived. Sat down. Stayed.`},
    s ? {scenes:[s.scene], text:`At work, ${n} is a ${s.title.toLowerCase()}. ${s.line}`} : {scenes:[], text:`${n} has no special skill yet. It is taking its time.`},
    {scenes:p ? [p.scene] : [], text:"Still a rock. Now with a name."} ];
}
const escHTML = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ===== Personalization line (pasted into the shop's personalization box) =====
   Format:  Greg · Paperweight · Do nothing · Note: For your next meeting   */
const SEP = " · ";
function orderLine(name, skill, plan, note){
  const parts = [name, skill ? SKILLS[skill].title : "-", plan ? PLANS[plan].title : "-"];
  const nt = String(note || "").trim().replace(/\s+/g, " ");
  if (nt) parts.push("Note: " + nt);
  return parts.join(SEP);
}
function parseLine(line){
  const raw = String(line || "").trim(); if (!raw) return null;
  const parts = raw.split(/\s*[·|]\s*/);
  const name = (parts.shift() || "").trim(); if (!name) return null;
  const find = (cat, t) => { const k = Object.keys(cat).find(k => cat[k].title.toLowerCase() === String(t || "").trim().toLowerCase()); return k || null; };
  let skill = null, plan = null, note = "";
  for (const p of parts){
    if (/^note:/i.test(p)) { note = p.replace(/^note:\s*/i, ""); continue; }
    skill = skill || find(SKILLS, p); plan = plan || find(PLANS, p);
  }
  return {name, skill, plan, note};
}
/* ===== Public rock page link (no customer data, only the rock) ===== */
function siteBase(){
  const c = (window.ROCK_CONFIG || {}).siteUrl;
  if (c) return c.replace(/\/+$/, "");
  return location.href.replace(/[#?].*$/, "").replace(/\/[^\/]*$/, "");
}
function rockLink(name, skill, plan){
  return `${siteBase()}/rock.html#n=${encodeURIComponent(name)}&s=${skill || ""}&p=${plan || ""}&v=${DESIGN_VERSION}`;
}
function readRockHash(){
  const q = new URLSearchParams(location.hash.replace(/^#/, ""));
  const name = (q.get("n") || "").slice(0, 60);
  if (!name) return null;
  const skill = SKILLS[q.get("s")] ? q.get("s") : null, plan = PLANS[q.get("p")] ? q.get("p") : null;
  return {name, skill, plan, v: Number(q.get("v")) || 1};
}
/* ===== Share card (PNG) ===== */
function svgImg(svg){ return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }); }
function _rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function _fit(c, text, x, y, max, size, family, weight){ let s = size; do { c.font = `${weight || 600} ${s}px ${family}`; s -= 2; } while (c.measureText(text).width > max && s > 20); c.fillText(text, x, y); }
async function shareCardCanvas(o, linkText){
  try { await document.fonts.ready; } catch(e) {}
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1350; const c = cv.getContext("2d");
  c.fillStyle = "#F6EFE2"; c.fillRect(0, 0, 1080, 1350);
  c.fillStyle = "#FBF5EA"; _rr(c, 60, 60, 960, 700, 48); c.fill();
  const scenes = [o.plan && PLANS[o.plan].scene, o.skill && SKILLS[o.skill].scene].filter(Boolean);
  try { const img = await svgImg(rockSVG(deriveAppearance(o.name), {scenes})); c.drawImage(img, 90, 70, 900, 664); } catch(e) {}
  c.fillStyle = "#2C2724";
  _fit(c, `THIS IS ${o.name.toUpperCase()}.`, 80, 870, 920, 84, "Fraunces, Georgia, serif", 600);
  c.font = "700 40px 'Courier Prime', monospace"; c.fillText("OCCUPATION: ROCK.", 80, 940);
  if (o.skill) _fit(c, `SPECIAL SKILL: ${SKILLS[o.skill].card.toUpperCase()}.`, 80, 995, 920, 40, "'Courier Prime', monospace", 700);
  c.fillStyle = "#4A433D"; _fit(c, o.skill ? SKILLS[o.skill].line : "Still a rock. Now with a name.", 80, 1090, 920, 48, "Fraunces, Georgia, serif", "italic 600");
  c.fillStyle = "#C95A43"; c.font = "800 44px Nunito, sans-serif"; c.fillText("What would yours do?", 80, 1200);
  c.fillStyle = "#6B6158"; _fit(c, linkText || "", 80, 1262, 920, 30, "'Courier Prime', monospace", 700);
  return cv;
}
