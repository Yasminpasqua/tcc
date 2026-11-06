// Libras por pedido: pessoas pedem a tradução de um texto, tradutores de Libras gravam um vídeo
// na página /requisicao e o vídeo fica disponível para quem pediu (e para quem pedir o mesmo texto depois).
//
// Armazenamento simples em arquivos (servidor/data). Atenção: em hospedagens com disco temporário
// (ex.: plano gratuito do Render) esses arquivos se perdem quando o servidor reinicia.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const VIDEO_DIR = path.join(DATA_DIR, 'libras-videos');
const DB_FILE = path.join(DATA_DIR, 'libras-requests.json');
const KEY_FILE = path.join(DATA_DIR, 'libras-admin-key.txt');

const MAX_TEXT = 1000;
const MIN_TEXT = 3;
const MAX_PENDING = 500;
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const VIDEO_TYPES = { 'video/webm': 'webm', 'video/mp4': 'mp4', 'video/quicktime': 'mov' };

function ensureDirs() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

function loadDb() {
  try {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return Array.isArray(raw.requests) ? raw.requests : [];
  } catch {
    return [];
  }
}

function saveDb(requests) {
  ensureDirs();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ requests }, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function textKey(text) {
  return crypto.createHash('sha1').update(normalizeText(text)).digest('hex');
}

// Chave dos tradutores: LIBRAS_ADMIN_KEY no .env; se não existir, gera uma e guarda em servidor/data
function getAdminKey() {
  if (process.env.LIBRAS_ADMIN_KEY) return process.env.LIBRAS_ADMIN_KEY;
  ensureDirs();
  try {
    const saved = fs.readFileSync(KEY_FILE, 'utf8').trim();
    if (saved) return saved;
  } catch { /* ainda não existe */ }
  const generated = crypto.randomBytes(9).toString('base64url');
  fs.writeFileSync(KEY_FILE, generated);
  return generated;
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function publicView(r, baseVideoPath = '/libras/video/') {
  return {
    id: r.id,
    status: r.status,
    videoUrl: r.status === 'done' && r.video ? baseVideoPath + r.id : null
  };
}

function registerLibrasRoutes(app, { express, rateLimitMiddleware }) {
  ensureDirs();
  let requests = loadDb();
  const adminKey = getAdminKey();
  console.log(`🤟 Libras por pedido: página dos tradutores em /requisicao (chave: ${adminKey})`);

  const find = (id) => requests.find(r => r.id === id);

  // ---------- Público ----------

  // Cria um pedido (ou devolve o vídeo, se esse texto já foi traduzido)
  app.post('/libras/requests', rateLimitMiddleware, (req, res) => {
    const { text, pageUrl } = req.body || {};
    if (typeof text !== 'string' || text.trim().length < MIN_TEXT)
      return res.status(400).json({ error: 'Selecione um texto para pedir a tradução.' });
    if (text.trim().length > MAX_TEXT)
      return res.status(400).json({ error: `Texto muito longo (máximo ${MAX_TEXT} caracteres). Selecione um trecho menor.` });

    const clean = text.trim().replace(/\s+/g, ' ');
    const key = textKey(clean);
    const existing = requests.find(r => r.key === key);

    if (existing) {
      if (existing.status === 'pending') {
        existing.count = (existing.count || 1) + 1; // mais uma pessoa pediu o mesmo texto
        saveDb(requests);
      }
      return res.json({ ...publicView(existing), already: existing.status === 'done' });
    }

    if (requests.filter(r => r.status === 'pending').length >= MAX_PENDING)
      return res.status(503).json({ error: 'Há muitos pedidos aguardando no momento. Tente mais tarde.' });

    let page = '';
    try { page = new URL(String(pageUrl || '')).origin + new URL(String(pageUrl)).pathname; } catch { /* sem página */ }

    const item = {
      id: crypto.randomUUID(),
      key,
      text: clean,
      pageUrl: page.slice(0, 300),
      status: 'pending',
      count: 1,
      createdAt: new Date().toISOString(),
      doneAt: null,
      video: null
    };
    requests.push(item);
    saveDb(requests);
    console.log(`🤟 Novo pedido de Libras (${clean.length} caracteres)`);
    res.status(201).json(publicView(item));
  });

  // Situação de vários pedidos de uma vez (os ids são secretos, de quem pediu)
  app.get('/libras/status', (req, res) => {
    const ids = String(req.query.ids || '').split(',').filter(id => ID_RE.test(id)).slice(0, 40);
    res.json({ requests: ids.map(id => find(id)).filter(Boolean).map(r => publicView(r)) });
  });

  app.get('/libras/video/:id', (req, res) => {
    const r = ID_RE.test(req.params.id) ? find(req.params.id) : null;
    if (!r || r.status !== 'done' || !r.video) return res.sendStatus(404);
    const file = path.join(VIDEO_DIR, r.video);
    if (!fs.existsSync(file)) return res.sendStatus(404);
    res.sendFile(file); // aceita Range (pular/rebobinar o vídeo)
  });

  // ---------- Tradutores (exigem a chave) ----------

  const requireKey = (req, res, next) => {
    const header = req.get('authorization') || '';
    const given = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!given || !safeEqual(given, adminKey)) return res.status(401).json({ error: 'Chave inválida.' });
    next();
  };

  app.get('/libras/admin/requests', requireKey, (req, res) => {
    const view = (r) => ({
      id: r.id, text: r.text, pageUrl: r.pageUrl, status: r.status, count: r.count || 1,
      createdAt: r.createdAt, doneAt: r.doneAt, videoUrl: r.status === 'done' && r.video ? '/libras/video/' + r.id : null
    });
    const pending = requests.filter(r => r.status === 'pending')
      .sort((a, b) => (b.count || 1) - (a.count || 1) || a.createdAt.localeCompare(b.createdAt));
    const done = requests.filter(r => r.status === 'done')
      .sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt))).slice(0, 100);
    res.json({ pending: pending.map(view), done: done.map(view) });
  });

  app.post('/libras/admin/requests/:id/video', requireKey,
    express.raw({ type: Object.keys(VIDEO_TYPES), limit: MAX_VIDEO_BYTES }),
    (req, res) => {
      const r = ID_RE.test(req.params.id) ? find(req.params.id) : null;
      if (!r) return res.status(404).json({ error: 'Pedido não encontrado.' });

      const mime = (req.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const ext = VIDEO_TYPES[mime];
      if (!ext) return res.status(415).json({ error: 'Formato não aceito. Envie vídeo em WebM, MP4 ou MOV.' });
      if (!Buffer.isBuffer(req.body) || req.body.length < 1000)
        return res.status(400).json({ error: 'O vídeo veio vazio.' });

      // Se já havia um vídeo (regravação), apaga o antigo
      if (r.video) { try { fs.unlinkSync(path.join(VIDEO_DIR, r.video)); } catch { /* já não existe */ } }
      const filename = `${r.id}.${ext}`;
      fs.writeFileSync(path.join(VIDEO_DIR, filename), req.body);
      r.video = filename;
      r.status = 'done';
      r.doneAt = new Date().toISOString();
      saveDb(requests);
      console.log(`🤟 Vídeo de Libras recebido (${(req.body.length / 1024 / 1024).toFixed(1)}MB)`);
      res.json(publicView(r));
    });

  app.delete('/libras/admin/requests/:id', requireKey, (req, res) => {
    const r = ID_RE.test(req.params.id) ? find(req.params.id) : null;
    if (!r) return res.status(404).json({ error: 'Pedido não encontrado.' });
    if (r.video) { try { fs.unlinkSync(path.join(VIDEO_DIR, r.video)); } catch { /* já não existe */ } }
    requests = requests.filter(x => x.id !== r.id);
    saveDb(requests);
    res.json({ ok: true });
  });
}

module.exports = { registerLibrasRoutes };
