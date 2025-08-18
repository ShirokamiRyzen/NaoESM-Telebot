// Don't delete this credit!!!
// Script by ShirokamiRyzen

import fetch from 'node-fetch'

function getDisplayName(m, conn) {
	const from =
		m.from ||
		m.fakeObj?.message?.from ||
		m.message?.from ||
		m.quoted?.fakeObj?.message?.from ||
		null

	if (from?.username) return `@${from.username}`
	if (from?.first_name && from?.last_name) return `${from.first_name} ${from.last_name}`
	if (from?.first_name) return from.first_name

	try {
		const n = conn?.getName?.(m.sender)
		if (n) return n
	} catch {}
	return 'nya~'
}

function sanitizeTitle(name = '') {
	const cleaned = String(name)
		.replace(/[^\w\s()\-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	return cleaned.replace(/\s+/g, '_')
}

function bytesToSize(bytes) {
	if (!Number.isFinite(bytes) || bytes <= 0) return ''
	const units = ['B', 'KB', 'MB', 'GB']
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
	return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
	if (!args[0]) {
		return m.reply(
			`Usage:\n${usedPrefix + command} <soundcloud url>\n` +
			`Example: ${usedPrefix + command} https://soundcloud.com/abady-gamer-773760806/nightcore-sweet-little-bumblebee-lyric-video`
		)
	}

	try {
		await m.reply(wait)

		const url = args[0]
		const api = `${APIs.ryzumi}/api/downloader/soundcloud?url=${encodeURIComponent(url)}`
		const res = await fetch(api, { headers: { accept: 'application/json' } })
		if (!res.ok) throw new Error(`API request failed (${res.status})`)

		const json = await res.json()
		const title = json?.title || 'SoundCloud Audio'
		const thumb = json?.thumbnail || ''
		const size = Number(json?.filesize || 0)
		const audioUrl = json?.download_url

		if (!audioUrl) throw new Error('Failed to fetch audio URL')

		const uname = getDisplayName(m, conn)
		const captionParts = [
			`Here’s your audio, ${uname} ~ ✨`,
			`Title: ${title}`,
		]
		const sizeStr = bytesToSize(size)
		if (sizeStr) captionParts.push(`Filesize: ${sizeStr}`)
		const caption = captionParts.join('\n')

		const fileName = `${sanitizeTitle(title)}.mp3`

		if (thumb) {
			try {
				await conn.sendMessage(
					m.chat,
					{ image: { url: thumb }, caption },
					{ quoted: m }
				)
			} catch {}
		}

		await conn.sendMessage(
			m.chat,
			{
				audio: { url: audioUrl },
				mimetype: 'audio/mpeg',
				fileName,
				caption,
				title,
			},
			{ quoted: m }
		)

	} catch (err) {
		console.error('SoundCloud Download Error:', err)
		await conn.reply(m.chat, `An error occurred: ${err?.message || err}`, m)
	}
}

handler.help = ['soundcloud']
handler.tags = ['downloader']
handler.command = /^(soundcloud|sc|scdl)$/i

handler.limit = 2
handler.register = true

export default handler
