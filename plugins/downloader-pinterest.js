// Don't delete this credit!!!
// Script by ShirokamiRyzen

import fetch from 'node-fetch'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

const toNum = (q) => {
	if (!q) return 0
	const m = String(q).match(/(\d{2,4})/)
	return m ? parseInt(m[1], 10) : 0
}

const isVideo = (m) => {
	const ext = String(m?.extension || '').toLowerCase()
	const url = String(m?.url || '')
	return /mp4|m4v|mov/.test(ext) || /\.mp4(\b|$)/i.test(url)
}

const isImage = (m) => {
	const ext = String(m?.extension || '').toLowerCase()
	const url = String(m?.url || '')
	return /jpe?g|png|webp/.test(ext) || /\.(jpe?g|png|webp)(\b|$)/i.test(url)
}

const pickBestVideo = (media) => {
	const vids = media.filter(isVideo)
	if (!vids.length) return null
	const ranked = vids
		.map(v => ({ ...v, _score: toNum(v.quality) || (Number(v.size) || 0) }))
		.sort((a, b) => (b._score - a._score))
	return ranked[0] || null
}

const pickOriginalImage = (media) => {
	const originals = media.filter(m => isImage(m) && String(m.quality).toLowerCase() === 'original')
	if (originals.length) return originals[0]
	// Heuristic fallback if API omits the label but URL hints 'originals'
	const byUrl = media.find(m => isImage(m) && /\/originals\//i.test(String(m.url)))
	return byUrl || null
}

const downloadBuffer = async (url) => {
	const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' } })
	if (!r.ok) throw new Error(`Fetch failed ${r.status}`)
	return Buffer.from(await r.arrayBuffer())
}

const safe = (s) => String(s || '').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()

let handler = async (m, { conn, args, usedPrefix, command }) => {
	if (!args[0]) {
		return m.reply(
			`Usage:\n${usedPrefix + command} <pinterest url>\n` +
			`Example: ${usedPrefix + command} https://id.pinterest.com/pin/320811173487461784/`
		)
	}

	try {
		await m.reply(wait)

		const url = args[0]
		const api = `${APIs.ryzumi}/api/downloader/pinterest?url=${encodeURIComponent(url)}`
		const res = await fetch(api, { headers: { accept: 'application/json' } })
		if (!res.ok) throw new Error(`API request failed (${res.status})`)
		const json = await res.json()

		const media = Array.isArray(json?.media) ? json.media : []
		if (!media.length) throw new Error('No media found for that link')

		const bestVideo = pickBestVideo(media)
		const origImage = pickOriginalImage(media)

		if (!bestVideo && !origImage) throw new Error('No suitable video or original image found')

		const base = safe(url.split('/pin/')[1] || 'pinterest')
		const tasks = []

		if (bestVideo?.url) {
			tasks.push({ kind: 'video', url: bestVideo.url, filename: `${base || 'pinterest'}_${toNum(bestVideo.quality) || 'video'}.mp4` })
		}
		if (origImage?.url) {
			const ext = (origImage.extension && String(origImage.extension).toLowerCase()) || (String(origImage.url).match(/\.([a-z0-9]+)(?:$|\?)/i)?.[1] || 'jpg')
			tasks.push({ kind: 'image', url: origImage.url, filename: `${base || 'pinterest'}_original.${ext}` })
		}

		for (const t of tasks) {
			try {
				const buff = await downloadBuffer(t.url)
				await conn.sendMessage(
					m.chat,
					{ document: { source: buff, filename: t.filename }, caption: `Pinterest ${t.kind === 'video' ? 'Video' : 'Image'}` },
					{ quoted: m }
				)
			} catch (e) {
				console.error('Send Pinterest doc failed:', e?.message || e)
			}
		}

	} catch (e) {
		console.error('Pinterest Downloader Error:', e)
		m.reply(`Error: ${e?.message || e}`)
	}
}

handler.help = ['pinterestdl']
handler.tags = ['downloader']
handler.command = /^(pindl|pinterestdl|pin(dl)?)$/i

handler.limit = true
handler.register = true

export default handler

