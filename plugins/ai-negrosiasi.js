import fetch from 'node-fetch'
import uploadImage from '../lib/uploadImage.js'
import { getMimeType } from '../lib/getMime.js'

const validFilters = ['coklat', 'hitam', 'nerd', 'piggy', 'carbon', 'botak']

async function handler(m, { conn, usedPrefix, command, text }) {
  try {
    const base = m.fakeObj?.message || m.message
    const replied = base?.reply_to_message || m.quoted?.fakeObj?.message
    const msg = replied || base

    const photos = msg?.photo
    const filter = (text || '').trim().toLowerCase()

    // If missing photo or filter, show usage help
    if (!Array.isArray(photos) || photos.length === 0 || !filter) {
      const list = validFilters.map(f => `- ${f}`).join('\n')
      return m.reply(
        `Send or reply to a photo and add a filter, nya~ 📷✨\n` +
          `Usage: *${usedPrefix + command} <filter>* (reply to a photo)\n` +
          `Available filters:\n${list}`
      )
    }

    if (!validFilters.includes(filter)) {
      const list = validFilters.map(f => `- ${f}`).join('\n')
      return m.reply(
        `Unknown filter: "${filter}"\n` +
          `Available filters:\n${list}`
      )
    }

    const fileId = photos[photos.length - 1]?.file_id
    if (!fileId) return m.reply(`The photo is not valid (｡•́︿•̀｡)\nPlease send it again~`)

    // Download from Telegram
    const fileLink = await conn.telegram.getFileLink(fileId)
    const tgRes = await fetch(fileLink.href)
    const media = Buffer.from(await tgRes.arrayBuffer())

    // Safety check
    const mime = await getMimeType(media)
    if (!/^image\//.test(mime)) {
      return m.reply(`That's not a valid image file~ (≧ヘ≦ )`)
    }

    await m.reply(wait)

    // Upload to CDN to get URL
    const srcUrl = await uploadImage(media)

    // Call Negro filter (PNG)
    const apiUrl = `${APIs.ryzumi}/api/ai/negro?url=${encodeURIComponent(srcUrl)}&filter=${encodeURIComponent(filter)}`
    const apiRes = await fetch(apiUrl, { method: 'GET', headers: { accept: 'image/png' } })
    if (!apiRes.ok) {
      const body = await apiRes.text().catch(() => '')
      throw new Error(`Negro filter failed (${apiRes.status}): ${body || 'no body'}`)
    }

    const outBuf = Buffer.from(await apiRes.arrayBuffer())
    await conn.sendFile(
      m.chat,
      outBuf,
      `negrosiasi-${filter}.png`,
      `Done~ ✨\nFilter: ${filter}`,
      m
    )
  } catch (e) {
    console.error(e)
    m.reply(`Processing failed... gomen~ (╥﹏╥)`)
  }
}

handler.help = ['negrosiasi']
handler.tags = ['ai']
handler.command = ['negrosiasi']

handler.register = true
handler.premium = false
handler.limit = 3

export default handler
