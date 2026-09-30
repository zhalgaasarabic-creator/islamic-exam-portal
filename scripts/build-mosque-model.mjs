// Мәсжід әл-Харамның (Қағба және айналасы) жеңілдетілген 3D макетін құрастырып,
// models/masjid-al-haram.glb файлына экспорттайды.
//
// Іске қосу (three пакеті тек осы скриптке керек, серверге қажет емес):
//   npm install --no-save three@0.169.0
//   node scripts/build-mosque-model.mjs
//
// Координаттар метрмен беріледі (Қағба — центрде, −Z = солтүстік, +X = шығыс),
// ал түбір түйін 1:300 масштабқа кішірейтіледі — AR-да үстелге сыятын макет (~1 м).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// GLTFExporter binary режимінде FileReader қолданады — Node үшін шағын полифилл.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => { this.result = buf; this.onloadend && this.onloadend(); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`;
      this.onloadend && this.onloadend();
    });
  }
};

const SCALE = 1 / 300;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'models', 'masjid-al-haram.glb');

// ---------------------------------------------------------------- материалдар
const MATERIALS = {
  ground:  new THREE.MeshStandardMaterial({ name: 'Plaza',        color: 0xd9d5cc, roughness: 0.8 }),
  marble:  new THREE.MeshStandardMaterial({ name: 'Marble',       color: 0xf1eee7, roughness: 0.35 }),
  mataf:   new THREE.MeshStandardMaterial({ name: 'MatafMarble',  color: 0xfbfaf6, roughness: 0.25 }),
  stone:   new THREE.MeshStandardMaterial({ name: 'Stone',        color: 0xdccfb4, roughness: 0.85 }),
  stone2:  new THREE.MeshStandardMaterial({ name: 'StoneLight',   color: 0xe9e1cf, roughness: 0.8 }),
  ottoman: new THREE.MeshStandardMaterial({ name: 'OttomanStone', color: 0xcdbf9f, roughness: 0.9 }),
  dome:    new THREE.MeshStandardMaterial({ name: 'LeadDome',     color: 0xa9a79f, roughness: 0.55, metalness: 0.35 }),
  floor:   new THREE.MeshStandardMaterial({ name: 'InnerFloor',   color: 0x8d8576, roughness: 0.9 }),
  kaaba:   new THREE.MeshStandardMaterial({ name: 'Kiswa',        color: 0x0b0b0b, roughness: 0.92 }),
  gold:    new THREE.MeshStandardMaterial({ name: 'Gold',         color: 0xd8b04a, roughness: 0.28, metalness: 1.0 }),
  bronze:  new THREE.MeshStandardMaterial({ name: 'BronzeDoor',   color: 0x8a6a2f, roughness: 0.4, metalness: 0.8 }),
  granite: new THREE.MeshStandardMaterial({ name: 'Granite',      color: 0x8f8f8f, roughness: 0.5 }),
  silver:  new THREE.MeshStandardMaterial({ name: 'Silver',       color: 0xd9d9d9, roughness: 0.25, metalness: 1.0 }),
  stoneBk: new THREE.MeshStandardMaterial({ name: 'BlackStone',   color: 0x2a1f1a, roughness: 0.3 }),
  pilgrim: new THREE.MeshStandardMaterial({ name: 'Ihram',        color: 0xffffff, roughness: 0.9 }),
};

// Әр материал бойынша геометрияларды жинап, соңында біріктіреміз (draw call аз болу үшін).
function makeBuckets() {
  const b = {};
  for (const k of Object.keys(MATERIALS)) b[k] = [];
  return b;
}

function prep(geom) {
  let g = geom.index ? geom.toNonIndexed() : geom;
  g.deleteAttribute('uv');
  if (g.getAttribute('uv1')) g.deleteAttribute('uv1');
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  return g;
}

function put(buckets, mat, geom, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  const g = prep(geom.clone());
  g.applyMatrix4(m);
  buckets[mat].push(g);
}

function flush(buckets, name) {
  const group = new THREE.Group();
  group.name = name;
  for (const [key, list] of Object.entries(buckets)) {
    if (!list.length) continue;
    const merged = mergeVertices(mergeGeometries(list, false), 1e-4);
    const mesh = new THREE.Mesh(merged, MATERIALS[key]);
    mesh.name = `${name}_${key}`;
    group.add(mesh);
  }
  return group;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// ---------------------------------------------------------------- күмбездер, аркалар
function archNotch(p, x0, x1, spring) {
  const w = x1 - x0, xm = (x0 + x1) / 2;
  p.lineTo(x0, 0);
  p.lineTo(x0, spring);
  p.quadraticCurveTo(x0, spring + w * 0.55, xm, spring + w * 0.78);
  p.quadraticCurveTo(x1, spring + w * 0.55, x1, spring);
  p.lineTo(x1, 0);
}

function archHole(x0, x1, y0, spring) {
  const w = x1 - x0, xm = (x0 + x1) / 2;
  const h = new THREE.Path();
  h.moveTo(x0, y0);
  h.lineTo(x1, y0);
  h.lineTo(x1, spring);
  h.quadraticCurveTo(x1, spring + w * 0.55, xm, spring + w * 0.78);
  h.quadraticCurveTo(x0, spring + w * 0.55, x0, spring);
  h.lineTo(x0, y0);
  return h;
}

function centers(L, spacing, margin) {
  const n = Math.max(1, Math.floor((L - 2 * margin) / spacing));
  const out = [];
  for (let i = 0; i < n; i++) out.push(-((n - 1) * spacing) / 2 + i * spacing);
  return out;
}

// XY жазықтығындағы қабырға: төменгі жағында аркалы галерея, жоғарыда терезелер қатары.
function facadeWall(L, H, T, { arcade, windows = [] } = {}) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, 0);
  if (arcade) {
    for (const c of centers(L, arcade.spacing, arcade.spacing * 0.4)) {
      archNotch(s, c - arcade.w / 2, c + arcade.w / 2, arcade.spring);
    }
  }
  s.lineTo(L / 2, 0);
  s.lineTo(L / 2, H);
  s.lineTo(-L / 2, H);
  s.lineTo(-L / 2, 0);
  for (const row of windows) {
    for (const c of centers(L, row.spacing, row.spacing * 0.5)) {
      s.holes.push(archHole(c - row.w / 2, c + row.w / 2, row.y, row.y + row.h - row.w * 0.78));
    }
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 5 });
  g.translate(0, 0, -T / 2);
  return g;
}

// Тіктөртбұрыш периметрі бойымен қабырғалар (центрі cx,cz; жарты өлшемдері a,b).
function wallRing(bk, mat, cx, cz, a, b, H, T, opts, sides = ['n', 's', 'e', 'w']) {
  const ns = facadeWall(2 * a + T, H, T, opts);
  const ew = facadeWall(2 * b - T, H, T, opts);
  if (sides.includes('n')) put(bk, mat, ns, { x: cx, z: cz - b });
  if (sides.includes('s')) put(bk, mat, ns, { x: cx, z: cz + b, ry: Math.PI });
  if (sides.includes('e')) put(bk, mat, ew, { x: cx + a, z: cz, ry: -Math.PI / 2 });
  if (sides.includes('w')) put(bk, mat, ew, { x: cx - a, z: cz, ry: Math.PI / 2 });
}

function slabRing(bk, mat, ai, bi, ao, bo, y, t) {
  put(bk, mat, box(2 * ao, t, bo - bi), { y, z: -(bi + bo) / 2 });
  put(bk, mat, box(2 * ao, t, bo - bi), { y, z: (bi + bo) / 2 });
  put(bk, mat, box(ao - ai, t, 2 * bi), { y, x: -(ai + ao) / 2 });
  put(bk, mat, box(ao - ai, t, 2 * bi), { y, x: (ai + ao) / 2 });
}

function perimeterPoints(a, b, step) {
  const pts = [];
  const per = 4 * (a + b);
  const n = Math.round(per / step);
  for (let i = 0; i < n; i++) {
    let d = (i / n) * per;
    if (d < 2 * a) { pts.push([-a + d, -b]); continue; } d -= 2 * a;
    if (d < 2 * b) { pts.push([a, -b + d]); continue; } d -= 2 * b;
    if (d < 2 * a) { pts.push([a - d, b]); continue; } d -= 2 * a;
    pts.push([-a, b - d]);
  }
  return pts;
}

const hemi = (r, seg = 14) => new THREE.SphereGeometry(r, seg, Math.ceil(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);

function dome(bk, x, y, z, r, drumH = r * 0.35) {
  put(bk, 'stone2', new THREE.CylinderGeometry(r * 1.02, r * 1.05, drumH, 16, 1), { x, y: y + drumH / 2, z });
  put(bk, 'dome', hemi(r, 16), { x, y: y + drumH, z });
  put(bk, 'gold', new THREE.CylinderGeometry(0.04 * r, 0.1 * r, 0.45 * r, 6), { x, y: y + drumH + r + 0.2 * r, z });
}

// ---------------------------------------------------------------- мұнара
function minaret(bk, x, z, top = 96) {
  put(bk, 'stone', box(7, 30, 7), { x, y: 15, z });
  put(bk, 'stone2', box(8.2, 1.6, 8.2), { x, y: 30.8, z });
  const tiers = [
    [3.0, 31.6, top * 0.6, 4.3],
    [2.6, top * 0.6, top * 0.79, 3.7],
    [2.2, top * 0.79, top * 0.9, 3.1],
  ];
  for (const [r, y0, y1, br] of tiers) {
    put(bk, 'stone2', new THREE.CylinderGeometry(r, r, y1 - y0, 8), { x, y: (y0 + y1) / 2, z });
    put(bk, 'stone', new THREE.CylinderGeometry(br, r, 1.4, 8), { x, y: y1 + 0.7, z });
    put(bk, 'stone2', new THREE.CylinderGeometry(br, br, 0.9, 8, 1, true), { x, y: y1 + 1.85, z });
  }
  const y2 = top * 0.9 + 1.4;
  put(bk, 'stone2', new THREE.CylinderGeometry(1.8, 1.8, 5, 8), { x, y: y2 + 2.5, z });
  put(bk, 'gold', new THREE.ConeGeometry(2.0, 5, 12), { x, y: y2 + 7.5, z });
  put(bk, 'gold', new THREE.CylinderGeometry(0.15, 0.3, 4, 6), { x, y: y2 + 11.5, z });
  put(bk, 'gold', new THREE.TorusGeometry(1.1, 0.18, 6, 16, Math.PI * 1.5), { x, y: y2 + 14.4, z, rz: -Math.PI * 0.25 });
}

// ---------------------------------------------------------------- қақпа
function gate(bk, x, z, ry, w = 26, h = 40) {
  const d = 8;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  archNotch(s, -w * 0.26, w * 0.26, h * 0.5);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -d / 2);
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const at = (lx, lz) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos });
  put(bk, 'stone2', g, { ...at(0, 0), ry });
  put(bk, 'bronze', box(w * 0.52, h * 0.5 + w * 0.3, 0.6), { ...at(0, -d / 2 + 0.2), y: (h * 0.5 + w * 0.3) / 2, ry });
  put(bk, 'gold', box(w + 1, 1.2, d + 1), { ...at(0, 0), y: h + 0.6, ry });
  dome(bk, at(0, 0).x, h + 1.2, at(0, 0).z, w * 0.22);
  minaret(bk, at(-w / 2 - 5, 0).x, at(-w / 2 - 5, 0).z);
  minaret(bk, at(w / 2 + 5, 0).x, at(w / 2 + 5, 0).z);
}

// ================================================================= САХНА
const root = new THREE.Group();
root.name = 'MasjidAlHaram';
root.scale.setScalar(SCALE);

// ---- Жер, ишан аула, матаф
{
  const bk = makeBuckets();
  put(bk, 'ground', box(360, 3, 340), { x: -15, y: -1.5, z: -40 });
  put(bk, 'marble', box(2 * 68, 0.1, 2 * 62), { y: 0.05 });
  put(bk, 'mataf', new THREE.CylinderGeometry(42, 42, 0.1, 96), { y: 0.12 });
  root.add(flush(bk, 'Mataf'));
}

// ---- Қағба
const HX = 5.85, HZ = 5.05, KH = 13.1; // есік қабырғасы +Z жақта (~11.7 м), Хижр қабырғасы +X жақта (~10.1 м)
{
  const bk = makeBuckets();
  put(bk, 'granite', box(2 * HX + 0.9, 0.35, 2 * HZ + 0.9), { y: 0.17 + 0.12 });
  put(bk, 'kaaba', box(2 * HX, KH, 2 * HZ), { y: KH / 2 + 0.12 });
  // Хизам — Құран аяттары тоқылған алтын белдеу
  put(bk, 'gold', box(2 * HX + 0.08, 0.95, 2 * HZ + 0.08), { y: 9.1 });
  put(bk, 'gold', box(2 * HX + 0.06, 0.12, 2 * HZ + 0.06), { y: 8.35 });
  put(bk, 'gold', box(2 * HX + 0.06, 0.12, 2 * HZ + 0.06), { y: 9.85 });
  // Есік (жерден ~2.2 м биіктікте) және оның пердесі
  put(bk, 'gold', box(1.9, 3.3, 0.2), { x: -1.9, y: 2.25 + 1.65, z: HZ + 0.06 });
  put(bk, 'gold', box(2.6, 0.25, 0.25), { x: -1.9, y: 2.2, z: HZ + 0.1 });
  // Хажар әл-Асуад — шығыс бұрыш
  put(bk, 'silver', new THREE.TorusGeometry(0.32, 0.1, 8, 20), { x: -HX - 0.05, y: 1.5, z: HZ + 0.05, ry: -Math.PI / 4 });
  put(bk, 'stoneBk', new THREE.SphereGeometry(0.26, 12, 8), { x: -HX, y: 1.5, z: HZ, sz: 0.6, ry: -Math.PI / 4 });
  // Мизаб ар-рахма — Хижр жағындағы алтын науа
  put(bk, 'gold', box(2.4, 0.3, 0.35), { x: HX + 1.1, y: KH + 0.1, z: 0 });
  root.add(flush(bk, 'Kaaba'));
}

// ---- Хижр Исмаил (Хатым)
{
  const bk = makeBuckets();
  const cx = HX + 1.2, R = 7.2, t = 1.5, a0 = -THREE.MathUtils.degToRad(80), a1 = -a0;
  const s = new THREE.Shape();
  s.absarc(0, 0, R + t / 2, a0, a1, false);
  s.absarc(0, 0, R - t / 2, a1, a0, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: false, curveSegments: 40 });
  // Пішін XY жазықтығында → көлденең жатқызамыз
  put(bk, 'marble', g, { x: cx, y: 1.3 + 0.12, z: 0, rx: Math.PI / 2 });
  root.add(flush(bk, 'HijrIsmail'));
}

// ---- Мақам Ибраһим
const MAQAM = { x: -1.2, z: HZ + 10.5 };
{
  const bk = makeBuckets();
  put(bk, 'granite', new THREE.CylinderGeometry(0.95, 1.05, 0.45, 8), { ...MAQAM, y: 0.35 });
  put(bk, 'gold', new THREE.CylinderGeometry(0.62, 0.62, 1.7, 16, 1, true), { ...MAQAM, y: 0.57 + 0.85 });
  put(bk, 'gold', new THREE.CylinderGeometry(0.7, 0.7, 0.18, 16), { ...MAQAM, y: 2.36 });
  put(bk, 'gold', hemi(0.62, 16), { ...MAQAM, y: 2.45, sy: 1.25 });
  put(bk, 'gold', new THREE.ConeGeometry(0.08, 0.5, 6), { ...MAQAM, y: 3.45 });
  put(bk, 'granite', new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12), { ...MAQAM, y: 0.8 });
  root.add(flush(bk, 'MaqamIbrahim'));
}

// ---- Осман дәуірінің риуағы (күмбезді галерея)
const OT = { ai: 52, bi: 46, ao: 68, bo: 62, h: 11 };
{
  const bk = makeBuckets();
  wallRing(bk, 'ottoman', 0, 0, OT.ai, OT.bi, OT.h, 1.2, { arcade: { w: 3.2, spring: 6, spacing: 5 } });
  slabRing(bk, 'ottoman', OT.ai, OT.bi, OT.ao, OT.bo, OT.h + 0.5, 1);
  for (const [a, b] of [[56, 50], [64, 58]]) {
    for (const [x, z] of perimeterPoints(a, b, 7)) dome(bk, x, OT.h + 1, z, 3.1, 1.1);
  }
  root.add(flush(bk, 'OttomanPortico'));
}

// ---- Сауд кеңейтуі (үш қабатты сақина ғимарат)
const SA = { ai: 68, bi: 62, ao: 108, bo: 98, h: 28 };
{
  const bk = makeBuckets();
  wallRing(bk, 'stone', 0, 0, SA.ao, SA.bo, SA.h, 1.5, {
    arcade: { w: 4, spring: 6.5, spacing: 6.5 },
    windows: [{ y: 12, h: 5.5, w: 2.6, spacing: 6.5 }, { y: 20, h: 5, w: 2.6, spacing: 6.5 }],
  });
  wallRing(bk, 'stone', 0, 0, SA.ai, SA.bi, SA.h, 1.5, {
    windows: [{ y: 13.5, h: 5, w: 3, spacing: 6 }, { y: 21, h: 4.5, w: 3, spacing: 6 }],
  });
  slabRing(bk, 'floor', SA.ai, SA.bi, SA.ao, SA.bo, 10, 0.6);
  slabRing(bk, 'floor', SA.ai, SA.bi, SA.ao, SA.bo, 19, 0.6);
  slabRing(bk, 'stone2', SA.ai - 0.75, SA.bi - 0.75, SA.ao + 0.75, SA.bo + 0.75, SA.h + 0.5, 1);
  wallRing(bk, 'stone2', 0, 0, SA.ao + 0.5, SA.bo + 0.5, 1.4, 0.5, {}, ['n', 's', 'e', 'w']);
  for (const [x, z] of perimeterPoints(88, 80, 40)) put(bk, 'stone2', box(6, 3, 6), { x, y: SA.h + 2.5, z });
  root.add(flush(bk, 'SaudiExpansion'));
}

// ---- Фаһд патша кеңейтуі (батыс қанат)
const FH = { cx: -136.5, cz: 0, a: 28.5, b: 55, h: 28 };
{
  const bk = makeBuckets();
  wallRing(bk, 'stone', FH.cx, FH.cz, FH.a, FH.b, FH.h, 1.5, {
    arcade: { w: 4, spring: 6.5, spacing: 6.5 },
    windows: [{ y: 12, h: 5.5, w: 2.6, spacing: 6.5 }, { y: 20, h: 5, w: 2.6, spacing: 6.5 }],
  }, ['n', 's', 'w']);
  for (const y of [10, 19]) put(bk, 'floor', box(2 * FH.a, 0.6, 2 * FH.b), { x: FH.cx, y, z: FH.cz });
  put(bk, 'stone2', box(2 * FH.a + 1.5, 1, 2 * FH.b + 1.5), { x: FH.cx, y: FH.h + 0.5, z: FH.cz });
  for (const z of [-30, 0, 30]) dome(bk, FH.cx, FH.h + 1, z, 9, 3);
  root.add(flush(bk, 'KingFahdExpansion'));
}

// ---- Масъа (Сафа мен Марва арасы)
const MS = { cx: 119, cz: -55, a: 11, b: 115, h: 24 };
{
  const bk = makeBuckets();
  wallRing(bk, 'stone', MS.cx, MS.cz, MS.a, MS.b, MS.h, 1.5, {
    arcade: { w: 3.6, spring: 6, spacing: 6 },
    windows: [{ y: 12.5, h: 6, w: 2.6, spacing: 6 }],
  });
  put(bk, 'floor', box(2 * MS.a, 0.6, 2 * MS.b), { x: MS.cx, y: 11, z: MS.cz });
  put(bk, 'stone2', box(2 * MS.a + 1.5, 1, 2 * MS.b + 1.5), { x: MS.cx, y: MS.h + 0.5, z: MS.cz });
  dome(bk, MS.cx, MS.h + 1, MS.cz + MS.b - 10, 7.5, 2.5); // Сафа
  dome(bk, MS.cx, MS.h + 1, MS.cz - MS.b + 10, 7.5, 2.5); // Марва
  minaret(bk, MS.cx + MS.a + 5, MS.cz + MS.b - 10);
  root.add(flush(bk, 'Masaa'));
}

// ---- Қақпалар мен мұнаралар
{
  const bk = makeBuckets();
  gate(bk, 0, SA.bo + 2, 0);                 // Әбдулазиз патша қақпасы (оңтүстік)
  gate(bk, -20, -SA.bo - 2, Math.PI);         // Әл-Фатх қақпасы (солтүстік)
  gate(bk, -75, -SA.bo - 2, Math.PI);         // Умра қақпасы (солтүстік-батыс)
  gate(bk, FH.cx - FH.a - 2, 0, -Math.PI / 2); // Фаһд патша қақпасы (батыс)
  root.add(flush(bk, 'GatesAndMinarets'));
}

// ---- Тауап етушілер (анимация: сағат тіліне қарсы айналу)
const CLIP_SECONDS = 60;
const tracks = [];
{
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const person = new THREE.CylinderGeometry(0.2, 0.32, 1.55, 6);
  person.translate(0, 0.9, 0);
  const bands = [
    { r0: 16.5, r1: 23, n: 360, laps: 3 },
    { r0: 23, r1: 30, n: 330, laps: 2 },
    { r0: 30, r1: 38, n: 260, laps: 1 },
  ];
  bands.forEach((band, i) => {
    const bk = makeBuckets();
    for (let k = 0; k < band.n; k++) {
      const a = rnd() * Math.PI * 2;
      const r = band.r0 + rnd() * (band.r1 - band.r0);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - MAQAM.x, z - MAQAM.z) < 2.2) continue;
      put(bk, 'pilgrim', person, { x, z, y: 0.12 });
    }
    const g = flush(bk, `Tawaf_${i + 1}`);
    root.add(g);
    // +Y айналасындағы оң бұрыш — жоғарыдан қарағанда сағат тіліне қарсы.
    const steps = band.laps * 4;
    const times = [], values = [];
    for (let s = 0; s <= steps; s++) {
      times.push((s / steps) * CLIP_SECONDS);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (s / 4) * Math.PI * 2);
      values.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${g.name}.quaternion`, times, values));
  });
}
const clip = new THREE.AnimationClip('Tawaf', CLIP_SECONDS, tracks);

// ---------------------------------------------------------------- экспорт
const scene = new THREE.Scene();
scene.add(root);
scene.updateMatrixWorld(true);

let tris = 0;
root.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });

new GLTFExporter().parse(
  scene,
  (glb) => {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, Buffer.from(glb));
    console.log(`✔ ${path.relative(process.cwd(), OUT)} — ${(glb.byteLength / 1024 / 1024).toFixed(2)} MB, ${Math.round(tris)} үшбұрыш`);
    const hs = {
      kaaba: [0, KH + 1.5, 0],
      hajar: [-HX - 0.3, 1.5, HZ + 0.3],
      maqam: [MAQAM.x, 3.6, MAQAM.z],
      hijr: [HX + 8.6, 1.5, 0],
      mataf: [0, 0.2, -32],
      ottoman: [0, OT.h + 5, -(OT.bi + OT.bo) / 2],
      saudi: [-60, SA.h + 2, SA.bo],
      fahd: [FH.cx, FH.h + 13, 0],
      safa: [MS.cx, MS.h + 11, MS.cz + MS.b - 10],
      marwa: [MS.cx, MS.h + 11, MS.cz - MS.b + 10],
      gate: [0, 42, SA.bo + 6],
    };
    console.log('Hotspots (model units):');
    for (const [k, v] of Object.entries(hs)) console.log(`  ${k}: ${v.map((n) => +(n * SCALE).toFixed(4)).join(' ')}`);
  },
  (err) => { console.error(err); process.exit(1); },
  { binary: true, animations: [clip] },
);
