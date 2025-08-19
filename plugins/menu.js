import fs from "fs"
import path from "path"
import { pathToFileURL, fileURLToPath } from "url"

// Recreate __filename/__dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let loadedCategories = {};
let totalLoadedCommands = 0;

const loadBotPlugins = async () => {
  const pluginDir = path.join(__dirname);
  const plugins = [];
  const categories = {};
  let totalCommands = 0;

  const files = fs.readdirSync(pluginDir)
  for (const file of files) {
    if (file.endsWith('.js') && file !== 'menu.js') {
      try {
        const full = path.join(pluginDir, file)
        const mod = await import(pathToFileURL(full).href + `?v=${Date.now()}`)
        const plugin = mod.default || mod
        if (plugin.help && plugin.tags) plugins.push(plugin)
      } catch (e) {
        console.error(`Error loading ${file}:`, e)
      }
    }
  }

  plugins.forEach((plugin) => {
    if (plugin.tags && plugin.help) {
      plugin.tags.forEach((tag) => {
        if (!categories[tag]) categories[tag] = [];
        plugin.help.forEach((help) => {
          if (!categories[tag].includes(help)) {
            categories[tag].push(help);
            totalCommands++;
          }
        });
      });
    }
  });

  loadedCategories = categories;
  totalLoadedCommands = totalCommands;
};

await loadBotPlugins();

const categoryNames = {
  main: "🎯 MAIN",
  ai: "🤖 AI",
  tools: "⚙️ TOOLS",
  downloader: "💫 DOWNLOADER",
  stalk: "🔍 STALK",
  internet: "🌐 INTERNET",
  // fun: "🎪 FUN",
  group: "👾 GROUP",
  owner: "👤 OWNER",
  admin: "🛡️ ADMIN",
  premium: "⭐ PREMIUM",
  info: "🎐 INFO",
  advanced: "⚡ ADVANCED",
};

const menuTemplate = {
  header: '╭─『 %category 』',
  body: '│ ⌬ %cmd %islimit %ispremium',
  footer: '╰────────࿐\n',
};

const handler = async (m, { conn, args }) => {
  const user = global.db.data.users[m.sender];
  const isOwner = global.ownerid.includes(m.sender.toString());
  const isPrems = global.premid.includes(m.sender.toString()) || user.premium || (user.premiumTime > Date.now());

  let d = new Date();
  let locale = 'en';
  let date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  let time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: 'numeric' });
  let uptime = clockString(process.uptime() * 1000);

  const menuImage = "https://telegra.ph/file/14a7745f434cd21e900d6.jpg";

  if (args[0]) {
    const categoryArg = args[0].toLowerCase();
    const foundCategory = Object.keys(loadedCategories).find(cat => cat.toLowerCase() === categoryArg);

    if (foundCategory) {
      const categoryDisplayName = categoryNames[foundCategory] || `${foundCategory.toUpperCase()} (✿^‿^)`;
      let categoryMenuText = menuTemplate.header.replace(/%category/g, categoryDisplayName) + '\n';

      loadedCategories[foundCategory].forEach(cmd => {
        categoryMenuText += menuTemplate.body
          .replace(/%cmd/g, cmd)
          .replace(/%islimit/g, '')
          .replace(/%ispremium/g, '') + '\n';
      });

      categoryMenuText += menuTemplate.footer;
      categoryMenuText += '\n*Note:* Back to the main menu with */menu* (o^▽^o)';

      return conn.sendMessage(m.chat, {
        image: { url: menuImage },
        caption: categoryMenuText,
        parse_mode: 'Markdown'
      }, { quoted: { message_id: m.id } })
    } else {
      return conn.sendMessage(m.chat, {
        text: `Category *"${args[0]}"* not found (｡•́︿•̀｡)\n\nType */menu* to see available categories.`,
        parse_mode: 'Markdown'
      }, { quoted: { message_id: m.id } })
    }
  }

  let mainMenuText =
    `*${global.botname}*\n\n` +
    `Hi %name! (｡•‿•｡)ﾉ♡ I'm a Telegram bot that can help with many things.\n\n` +
    `◦ *Uptime:* %uptime\n` +
    `◦ *Date:* %date\n` +
    `◦ *Time:* %time WIB\n\n`;

  mainMenuText = mainMenuText
    .replace(/%name/g, m.name)
    .replace(/%uptime/g, uptime)
    .replace(/%date/g, date)
    .replace(/%time/g, time);

  mainMenuText += '╭─『 *Command Categories* 』\n';

  const arrayMenu = Object.keys(categoryNames);

  Object.keys(loadedCategories)
    .sort((a, b) => {
      const indexA = arrayMenu.indexOf(a);
      const indexB = arrayMenu.indexOf(b);
      if (indexA === -1 || indexB === -1) return 0;
      return indexA - indexB;
    })
    .forEach(category => {
      const categoryDisplayName = categoryNames[category] || `${category.toUpperCase()} (☆▽☆)`;
      mainMenuText += `│ ⌬ ${categoryDisplayName}\n`;
    });

  mainMenuText += '╰─────────────࿐\n\n';
  mainMenuText += '┌───『 *Statistics* 』───࿐\n';
  mainMenuText += `│ • Users: ${Object.keys(global.db.data.users).length}\n`;
  mainMenuText += `│ • Commands: ${totalLoadedCommands}\n`;
  mainMenuText += '└────────────࿐\n\n';
  mainMenuText += '*Note:* Type */menu <category>* for detailed commands.\nExample: */menu downloader* (≧◡≦) ♡';

  await conn.sendMessage(m.chat, {
    image: { url: menuImage },
    caption: mainMenuText,
    parse_mode: 'Markdown'
  }, { quoted: { message_id: m.id } })
};

handler.help = ["menu", "help"];
handler.tags = ["main"];
handler.command = /^(menu|help|\?)$/i;

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}

export default handler
