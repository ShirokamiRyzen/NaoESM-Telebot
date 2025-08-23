// Don't delete this credit!!!
// Script by ShirokamiRyzen

import fetch from 'node-fetch'

// Session store for pending quality selections
if (!global.__ytmp4Sessions) global.__ytmp4Sessions = {}
function newSessionId() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 12)
}
function pruneYtSessions(maxAgeMs = 10 * 1000) { // 10s TTL
  const now = Date.now()
  for (const [id, s] of Object.entries(global.__ytmp4Sessions)) {
    if (!s || (now - (s.created || 0)) > maxAgeMs) delete global.__ytmp4Sessions[id]
  }
}

function getDisplayName(m, conn) {
  const from =
    m.from ||
    m.fakeObj?.message?.from ||
    m.message?.from ||
    m.quoted?.fakeObj?.message?.from ||
    null;

  if (from?.username) return `@${from.username}`;
  if (from?.first_name && from?.last_name) return `${from.first_name} ${from.last_name}`;
  if (from?.first_name) return from.first_name;

  try {
    const n = conn?.getName?.(m.sender);
    if (n) return n;
  } catch {}
  return 'nya~';
}

function getUserMention(m, conn) {
  const from =
    m.from ||
    m.fakeObj?.message?.from ||
    m.message?.from ||
    m.quoted?.fakeObj?.message?.from ||
    null;
  if (from?.username) return `@${from.username}`
  const name = getDisplayName(m, conn).replace(/([*_`\[\]()~>#+\-=|{}.!])/g, '\\$1')
  return `[${name}](tg://user?id=${m.sender})`
}

function sanitizeTitle(name = '') {
  const cleaned = String(name)
    .replace(/[^\w\s()\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.replace(/\s+/g, '_');
}

function parseQuality(input) {
  const fallback = 720
  if (!input) return fallback
  const m = String(input).match(/\d{2,4}/)
  const q = m ? parseInt(m[0], 10) : NaN
  const allowed = [144, 240, 360, 480, 720, 1080, 1440, 2160]
  return allowed.includes(q) ? q : fallback
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return m.reply(
      `Usage:\n${usedPrefix + command} <youtube url> [quality]\n` +
      `Example: ${usedPrefix + command} https://youtu.be/Hy9s13hWsoc 720p\n` +
      `If only a URL is sent, I’ll ask you to pick a resolution via buttons.`
    );
  }

  const url = args[0]
  // If user supplied quality explicitly -> direct download
  if (args[1]) {
    return downloadAndSend(m, conn, url, parseQuality(args[1]))
  }

  // Show buttons to pick resolution
  pruneYtSessions()
  const sessionId = newSessionId()
  global.__ytmp4Sessions[sessionId] = { url, user: m.sender, created: Date.now() }
  const qualities = [144, 360, 480, 720, 1080, 2160]
  const row1 = qualities.slice(0, 3).map(q => ({ text: `${q}p`, callback_data: `ytv:${sessionId}:${q}` }))
  const row2 = qualities.slice(3).map(q => ({ text: `${q}p`, callback_data: `ytv:${sessionId}:${q}` }))
  const mention = getUserMention(m, conn)
  await conn.sendButt(m.chat, `Hi ${mention}~ Choose a video resolution (timeout 10s):\n${url}`, [row1, row2], m, { parse_mode: 'Markdown' })
}

async function downloadAndSend(m, conn, url, qualityNum) {
  try {
    await m.reply(wait)
    const fetchInfo = async (q) => {
      const api = `${APIs.ryzumi}/api/downloader/ytmp4?url=${encodeURIComponent(url)}&quality=${q}`
      const res = await fetch(api, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error(`API request failed (${res.status})`)
      return res.json()
    }

    const tryQualities = [qualityNum, 480, 360, 240, 144].filter((v, i, a) => a.indexOf(v) === i)
    const TELEGRAM_MAX_MB = typeof global.telegramMaxUploadMb === 'number' ? global.telegramMaxUploadMb : 49
    const TELEGRAM_MAX_BYTES = TELEGRAM_MAX_MB * 1024 * 1024
    let lastErr = null
    for (const q of tryQualities) {
      try {
        const json = await fetchInfo(q)
        const videoDirectUrl = json?.url
        if (!videoDirectUrl) throw new Error('Failed to fetch video URL')
        const title = json?.title || 'YouTube Video'
        const author = json?.author || ''
        const lengthSeconds = Number(json?.lengthSeconds || 0) || undefined
        const thumb = json?.thumbnail || ''
        const qualityStr = json?.quality || `${q}p`
        const fileName = `${sanitizeTitle(title)}_${qualityStr}.mp4`

        // Check size via HEAD; if too large, continue to lower quality
        try {
          const head = await fetch(videoDirectUrl, { method: 'HEAD' })
          const len = Number(head.headers.get('content-length') || 0)
          if (len && len > TELEGRAM_MAX_BYTES) {
            lastErr = new Error(`Video too large (${(len/1024/1024).toFixed(1)}MB > ${TELEGRAM_MAX_MB}MB) at ${qualityStr}`)
            continue
          }
        } catch (_) { /* ignore HEAD failures; try send anyway */ }

        const uname = getDisplayName(m, conn)
        const captionParts = [`Here’s your video, ${uname} ~ ✨`, `Title: ${title}`]
        if (author) captionParts.push(`Author: ${author}`)
        if (lengthSeconds) captionParts.push(`Duration: ${lengthSeconds}s`)
        if (qualityStr) captionParts.push(`Quality: ${qualityStr}`)
        const caption = captionParts.join('\n')

        if (thumb) { try { await conn.sendMessage(m.chat, { image: { url: thumb }, caption }, { quoted: m }) } catch { } }
        await conn.sendMessage(m.chat, { video: { url: videoDirectUrl }, mimetype: 'video/mp4', fileName, caption }, { quoted: m })
        return true
      } catch (e) {
        lastErr = e
        // try next quality
      }
    }
    // If all fails or too large, send link fallback
    await conn.reply(m.chat, `Maaf, ukuran video terlalu besar untuk dikirim via Telegram. Silakan unduh sendiri: ${url}\n${lastErr ? '(' + (lastErr.message || lastErr) + ')' : ''}`, m)
    return false
  } catch (err) {
    console.error('YTMP4 Download Error:', err)
    await conn.reply(m.chat, `An error occurred: ${err?.message || err}`, m)
    return false
  }
}

// Before hook to intercept quality selection callback
handler.before = async function (m) {
  try {
    if (!m.callbackQuery) return
    if (!m.text || !/^ytv:/.test(m.text)) return
    pruneYtSessions()
    const parts = m.text.split(':')
    if (parts.length !== 3) return
    const sessionId = parts[1]
    const quality = parseInt(parts[2], 10)
    const session = global.__ytmp4Sessions[sessionId]
    if (!session) {
      await m.reply('Resolution selection session has expired. Please send the URL again.')
      return false
    }
    delete global.__ytmp4Sessions[sessionId]
    const ok = await downloadAndSend(m, this, session.url, parseQuality(quality))
    // mark success for handler to charge limit later (generic)
    if (ok) {
      m._actionSuccess = true
      m._ytmp4Success = true // legacy
    }
  return false
  } catch (e) {
    console.error('ytmp4 before hook error:', e)
  }
}

handler.help = ['ytmp4']
handler.tags = ['downloader']
handler.command = /^(ytmp4|ytv|ytvideo)$/i

handler.limit = 4
handler.register = true

export default handler
