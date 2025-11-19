import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(cors())

const CONNECTION_STRING = process.env.DATABASE_URL
if (!CONNECTION_STRING) {
  console.warn('DATABASE_URL is not set. Please set it before starting the server.')
}

const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
})

const TABLES = ['contracts', 'users', 'audit_log', 'contract_types', 'system_settings']

const SEGMENTS = 96
const SEGMENT_MS = 15_000
const connectivitySegments = Array(SEGMENTS).fill(false)
const opsSegments = Array(SEGMENTS).fill(false)
const apiSegments = Array(SEGMENTS).fill(false)
const dbLatencySegments = Array(SEGMENTS).fill(0)
const apiLatencySegments = Array(SEGMENTS).fill(0)

function currentIndex() {
  return Math.floor(Date.now() / SEGMENT_MS) % SEGMENTS
}

async function initSchema() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id BIGINT PRIMARY KEY,
        data JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        data JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGINT PRIMARY KEY,
        data JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS contract_types (
        id BIGINT PRIMARY KEY,
        data JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS system_settings (
        id BIGINT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `)
  } finally {
    client.release()
  }
}

function ensureTable(name) {
  if (!TABLES.includes(name)) {
    const err = new Error('Invalid table')
    // @ts-ignore
    err.status = 400
    throw err
  }
}

app.use((req, res, next) => {
  const idx = currentIndex()
  const start = Date.now()
  res.on('finish', () => {
    try {
      apiSegments[idx] = true
      apiLatencySegments[idx] = Date.now() - start
    } catch {}
  })
  next()
})

app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

const MAX_DB_BYTES = 536870912 // 0.5 GB

app.get('/api/db-metrics', async (req, res) => {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT pg_database_size(current_database()) AS size')
    client.release()
    const sizeBytes = Number(result.rows?.[0]?.size ?? 0)
    res.json({ connected: true, sizeBytes, maxBytes: MAX_DB_BYTES })
  } catch (e) {
    res.status(500).json({ connected: false, sizeBytes: 0, maxBytes: MAX_DB_BYTES, error: e.message })
  }
})

app.get('/api/status-metrics', async (req, res) => {
  try {
    const mem = process.memoryUsage()
    const now = Date.now()
    const end = now
    const start = end - SEGMENT_MS * SEGMENTS
    res.json({
      segments: SEGMENTS,
      period: { start, end },
      connectivity: connectivitySegments,
      operations: opsSegments,
      api: apiSegments,
      dbLatency: dbLatencySegments,
      apiLatency: apiLatencySegments,
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/:table', async (req, res) => {
  try {
    const table = req.params.table
    ensureTable(table)
    const client = await pool.connect()
    const result = await client.query(`SELECT data FROM ${table}`)
    client.release()
    res.json(result.rows.map(r => r.data))
  } catch (e) {
    const status = e.status || 500
    res.status(status).json({ error: e.message })
  }
})

app.get('/api/contracts/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const client = await pool.connect()
    const result = await client.query('SELECT data FROM contracts WHERE id = $1', [id])
    client.release()
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0].data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/verify/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const client = await pool.connect()
    const result = await client.query('SELECT data FROM contracts WHERE id = $1', [id])
    const settingsRes = await client.query('SELECT data FROM system_settings ORDER BY id DESC LIMIT 1')
    client.release()
    if (!result.rows.length) {
      const settings = settingsRes.rows?.[0]?.data || {}
      const showLicense = settings.showLicenseNumber !== false
      const licenseNumber = settings.licenseNumber || 'LIC-9821-LY'
      const officeTitle = (settings?.officeTitle && String(settings.officeTitle).trim()) || 'محرر عقود'
      const notFoundHtml = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>الإيصال غير موجود #${id}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
      @page{size:A4;margin:8mm}
      body{font-family:Tajawal,Arial,sans-serif;background:#ffffff;color:#0f172a;padding:0}
      .card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:auto;max-width:210mm;min-height:297mm;box-sizing:border-box}
      .muted{color:#64748b;font-size:12px}
      .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;background:#fff7ed;color:#b45309;font-weight:700;font-size:12px;border:1px solid #fde68a}
      .sep{margin:6px 0;border-top:1px dashed #cbd5e1}
      .mono{font-family:monospace}
    </style>
  </head>
  <body>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h1 style="display:flex;align-items:center;gap:8px;font-weight:800;margin:0">
          <i class="bi bi-x-circle-fill" style="color:#dc2626"></i>
          <span>الإيصال غير موجود</span>
        </h1>
        <span class="badge">
          <i class="bi bi-shield-exclamation" style="color:#b45309"></i>
          <span>تعذر التوثيق</span>
        </span>
      </div>
      <div class="muted mono">REF: #${id}</div>
      <div class="muted"><strong>${officeTitle}</strong></div>
      ${showLicense ? `<div class="muted">رقم الترخيص: <strong class="mono">${licenseNumber}</strong></div>` : ''}
      <div class="sep"></div>
      <div style="padding:8px;border:1px dashed #fecaca;background:#fef2f2;color:#991b1b;border-radius:8px;font-weight:700">
        <i class="bi bi-info-circle-fill" style="margin-left:6px"></i>
        لم يتم العثور على هذا الإيصال في قاعدة البيانات.
      </div>
      <div class="sep"></div>
      <div class="muted">حقوق المطور تنفيذ وبرمجة 3bdo 092-8102731</div>
    </div>
  </body>
</html>`
      return res.set('Content-Type', 'text/html; charset=utf-8').status(404).send(notFoundHtml)
    }
    const c = result.rows[0].data
    const settings = settingsRes.rows?.[0]?.data || {}
    const showLicense = settings.showLicenseNumber !== false
    const licenseNumber = settings.licenseNumber || 'LIC-9821-LY'
    const P = '▍▍▍▍▍▍▍▍▍▍'
    const officeTitle = 'محرر عقود'
    const responsible = (settings?.responsibleEditorName && String(settings.responsibleEditorName).trim()) || 'فتحي عبد الجواد'
    const responsibleDisplay = responsible || P
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>تحقق من الإيصال #${id}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
      @page{size:A4;margin:8mm}
      body{font-family:Tajawal,Arial,sans-serif;background:#ffffff;color:#0f172a;padding:0}
      p{margin:0;line-height:1.35}
      .card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:auto;max-width:210mm;min-height:297mm;box-sizing:border-box}
      .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .h{font-weight:700;margin:6px 0}
      .mono{font-family:monospace}
      .muted{color:#64748b;font-size:12px}
      .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;background:#ecfeff;color:#0e7490;font-weight:700;font-size:12px}
      .sep{margin:6px 0;border-top:1px dashed #cbd5e1}
      .warn{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:8px;border-radius:8px;font-weight:700;margin:8px 0}
      .a4{width:210mm;max-width:100%;margin:0 auto}
    </style>
  </head>
  <body>
    <div class="card a4">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h1 class="h" style="display:flex;align-items:center;gap:8px">
          <i class="bi bi-patch-check-fill" style="color:#16a34a"></i>
          <span>تحقق من الإيصال</span>
        </h1>
        <span class="badge">
          <i class="bi bi-shield-check" style="color:#16a34a"></i>
          <span>موثق من قاعدة البيانات</span>
        </span>
      </div>
      <div class="muted mono">REF: #${id}</div>
      <div class="muted"><strong>${officeTitle}</strong></div>
      ${showLicense ? `<div class="muted">رقم الترخيص: <strong class="mono">${licenseNumber}</strong></div>` : ''}
      <div class="muted">المحرر المسؤول: <strong>${responsibleDisplay}</strong></div>
      <div class="warn">تحذير: أي شطب أو تعديل باليد يلغي هذه الوثيقة</div>
      <div class="sep"></div>
      <div class="row">
        <div>
          <div class="muted">العنوان</div>
          <div class="h">${c.title || P}</div>
        </div>
        <div>
          <div class="muted">نوع العقد</div>
          <div class="h">${c.type || P}</div>
        </div>
      </div>
      <div class="row">
        <div>
          <div class="muted">تاريخ التحرير</div>
          <div class="h mono">${c.creationDate ? new Date(c.creationDate).toLocaleDateString('en-GB') : P}</div>
        </div>
        <div>
          <div class="muted">الحالة</div>
          <div class="h">${c.status || P}</div>
        </div>
      </div>
      <div class="sep"></div>
      <div class="row">
        <div>
          <div class="muted">الطرف الأول</div>
          <div>
            <div>الاسم: <strong>${c.party1?.name || P}</strong></div>
            <div>نوع الهوية: <strong>${c.party1?.idType || P}</strong></div>
            <div>رقم الهوية: <strong class="mono">${c.party1?.idNumber || P}</strong></div>
            <div>الرقم الوطني: <strong class="mono">${c.party1?.nationalId || P}</strong></div>
            <div>رقم الهاتف: <strong class="mono">${c.party1?.phone || P}</strong></div>
          </div>
        </div>
        <div>
          <div class="muted">الطرف الثاني</div>
          <div>
            <div>الاسم: <strong>${c.party2?.name || P}</strong></div>
            <div>نوع الهوية: <strong>${c.party2?.idType || P}</strong></div>
            <div>رقم الهوية: <strong class="mono">${c.party2?.idNumber || P}</strong></div>
            <div>الرقم الوطني: <strong class="mono">${c.party2?.nationalId || P}</strong></div>
            <div>رقم الهاتف: <strong class="mono">${c.party2?.phone || P}</strong></div>
          </div>
        </div>
      </div>
      <div class="sep"></div>
      <div class="muted">حقوق المطور تنفيذ وبرمجة 3bdo 092-8102731</div>
    </div>
  </body>
</html>`
    res.set('Content-Type', 'text/html; charset=utf-8').send(html)
  } catch (e) {
    res.status(500).send('<h1>خطأ داخلي</h1>')
  }
})

app.get('/api/verify-qr/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const url = `${req.protocol}://${req.get('host')}/api/verify/${id}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`
    res.redirect(qrUrl)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/:table', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : []
  try {
    const table = req.params.table
    ensureTable(table)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`DELETE FROM ${table}`)
      for (const item of items) {
        const id = typeof item?.id === 'number' ? item.id : Math.floor(Date.now() + Math.random() * 1000)
        await client.query(`INSERT INTO ${table} (id, data) VALUES ($1, $2::jsonb)`, [id, JSON.stringify(item)])
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    res.json({ ok: true, count: items.length })
  } catch (e) {
    const status = e.status || 500
    res.status(status).json({ error: e.message })
  }
})

app.get('/api/backup', async (req, res) => {
  try {
    const client = await pool.connect()
    const backup = {}
    for (const t of TABLES) {
      const result = await client.query(`SELECT data FROM ${t}`)
      backup[t] = result.rows.map(r => r.data)
    }
    client.release()
    res.json(backup)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/restore', async (req, res) => {
  try {
    const payload = req.body || {}
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      for (const t of TABLES) {
        if (Array.isArray(payload[t])) {
          await client.query(`DELETE FROM ${t}`)
          for (const item of payload[t]) {
            const id = typeof item?.id === 'number' ? item.id : Math.floor(Date.now() + Math.random() * 1000)
            await client.query(`INSERT INTO ${t} (id, data) VALUES ($1, $2::jsonb)`, [id, JSON.stringify(item)])
          }
        }
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 4000

async function sampleStatus() {
  const idx = currentIndex()
  let connOk = false
  let opsOk = true
  try {
    const client = await pool.connect()
    try {
      const t0 = Date.now()
      await client.query('SELECT 1')
      dbLatencySegments[idx] = Date.now() - t0
      connOk = true
      for (const t of TABLES) {
        try {
          await client.query(`SELECT COUNT(*) FROM ${t}`)
        } catch (e) {
          opsOk = false
          break
        }
      }
    } finally {
      client.release()
    }
  } catch (e) {
    connOk = false
    opsOk = false
  }
  connectivitySegments[idx] = connOk
  opsSegments[idx] = opsOk
}

initSchema()
  .then(async () => {
    await sampleStatus()
    setInterval(sampleStatus, SEGMENT_MS)
    app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('Failed to initialize schema', err)
    process.exit(1)
  })
