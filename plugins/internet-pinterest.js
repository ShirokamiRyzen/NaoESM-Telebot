// Don't remove credits
// Script by ShirokamiRyzen

import fetch from 'node-fetch'

function sleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function pickExt(url = '') {
    try {
        const u = new URL(url)
        const pathname = u.pathname.toLowerCase()
        const m = pathname.match(/\.([a-z0-9]+)$/)
        if (m) return m[1]
    } catch { }
    return 'jpg'
}

function shuffle(array) {
    const a = array.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`Usage:\n${usedPrefix + command} <query>\nExample: ${usedPrefix + command} nao tomori`)
    }

    try {
        await m.reply(wait)

        const apiUrl = `${APIs.ryzumi}/api/search/pinterest?query=${encodeURIComponent(text)}`
        const res = await fetch(apiUrl, { headers: { accept: 'application/json' } })
        if (!res.ok) throw new Error(`API request failed (${res.status})`)

        const json = await res.json()
        const list = Array.isArray(json)
            ? json
            : (Array.isArray(json?.result) ? json.result : [])

        const images = list
            .map(v => v?.directLink || v?.url || v?.image || null)
            .filter(Boolean)

        if (!images.length) throw new Error('No images found for that query')

        const picks = shuffle(images).slice(0, Math.min(10, images.length))

        for (let i = 0; i < picks.length; i++) {
            const url = picks[i]
            const ext = pickExt(url)
            const fileName = `pinterest-${text.replace(/[^a-z0-9]+/gi, '_').slice(0, 32)}-${i + 1}.${ext}`

            try {
                const r = await fetch(url)
                if (!r.ok) throw new Error(`Failed to fetch image (${r.status})`)
                const buff = Buffer.from(await r.arrayBuffer())

                await conn.sendMessage(
                    m.chat,
                    {
                        document: { source: buff, filename: fileName },
                        caption: `Pinterest • ${text}`,
                    },
                    { quoted: m }
                )
            } catch (e) {
                // Skip this item and continue
                console.error('Send doc failed:', e?.message || e)
            }

            if (i < picks.length - 1) await sleep(1000)
        }

    } catch (err) {
        console.error('Pinterest Error:', err)
        m.reply(`Error: ${err?.message || err}`)
    }
}

handler.help = ['pinterest']
handler.tags = ['internet']
handler.command = /^(pinterest|pin)$/i

handler.limit = true
handler.register = true

export default handler

