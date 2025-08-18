// Don't delete this credit!!!
// Script by ShirokamiRyzen

import fetch from 'node-fetch'

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

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return m.reply(
      `Usage:\n${usedPrefix + command} <facebook video url>\n` +
      `Example: ${usedPrefix + command} https://www.facebook.com/share/v/15s6xj1thL/`
    );
  }

  try {
    await m.reply(wait);

    const apiUrl = `${APIs.ryzumi}/api/downloader/fbdl?url=${encodeURIComponent(args[0])}`;
    const res = await fetch(apiUrl, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`API request failed (${res.status})`);

    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json?.result) ? json.result : []);
    if (!list.length) throw new Error('No available video found');

    // Prioritize 720p (HD) and fallback to 360p (SD)
    const video =
      list.find(v => v.resolution === '720p (HD)') ||
      list.find(v => v.resolution === '360p (SD)');

    if (!video?.url) throw new Error('No downloadable URL found');

    const uname = getDisplayName(m, conn);
    const caption = `Here's your video, ${uname} ~ ✨\nQuality: ${video.resolution}`;

    await conn.sendMessage(
      m.chat,
      {
        video: { url: video.url },
        mimetype: 'video/mp4',
        fileName: 'facebook-video.mp4',
        caption
      },
      { quoted: m }
    );

  } catch (err) {
    console.error('FB Download Error:', err);
    m.reply(`Error: ${err.message || err}`);
  }
};

handler.help = ['facebook'];
handler.tags = ['downloader'];
handler.command = /^(fbdownload|facebook|fb(dl)?)$/i;

handler.limit = true
handler.register = true

export default handler
