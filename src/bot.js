const { Telegraf } = require('telegraf');
const config = require('./config');
const { defaultQueue: queue } = require('./queue');
const { checkAccount, decodeRank } = require('./steam');
const { createHealthServer } = require('./health');
const logger = require('./logger');

config.validate();

const bot = new Telegraf(config.BOT_TOKEN);
const activeGuardRequests = {};
const state = {
  botReady: false,
  queueLength: 0,
};

createHealthServer({
  port: config.HEALTH_PORT,
  getState: () => ({
    botReady: state.botReady,
    queueLength: queue.getLength(),
  }),
});

bot.start((ctx) => {
  ctx.reply(
    `👋 **Добро пожаловать в Dota 2 Account Checker Bot!**\n\n` +
      `Отправьте данные аккаунта в формате:\n` +
      `\`login:password\`\n` +
      `или\n` +
      `\`login:password:proxy_url\`\n\n` +
      `Прокси формат: \`socks5://user:pass@ip:port\`\n\n` +
      `⚠️ Бот запросит Steam Guard код, если он включен.\n` +
      `🔒 Пароли не сохраняются — используются только для одноразовой сессии.`,
    { parse_mode: 'Markdown' }
  );
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();

  if (activeGuardRequests[ctx.chat.id]) {
    const resolve = activeGuardRequests[ctx.chat.id];
    delete activeGuardRequests[ctx.chat.id];
    resolve(text);
    return;
  }

  if (!text.includes(':')) {
    return ctx.reply('❌ Неверный формат. Используйте `login:password`', { parse_mode: 'Markdown' });
  }

  const parts = text.split(':');
  const login = parts[0];
  const password = parts[1];
  const proxyUrl = parts.length > 2 ? parts.slice(2).join(':') : null;

  const statusMsg = await ctx.reply('⏳ Добавляю в очередь...');

  queue.add(async () => {
    try {
      await bot.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        '🔄 Логин в Steam...'
      );

      const data = await checkAccount(
        login,
        password,
        proxyUrl,
        (domain, callback, lastWrong) => {
          const msg = lastWrong
            ? '❌ Неверный код. Введите снова:'
            : `🔐 Введите Steam Guard код (отправлен на ${domain || 'Email/App'}):`;

          bot.telegram.sendMessage(ctx.chat.id, msg).then(() => {
            activeGuardRequests[ctx.chat.id] = (code) => {
              callback(code);
            };
          });
        },
        () => {}
      );

      const report = `
📊 **ПОЛНЫЙ ОТЧЕТ DOTA 2**
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
👤 **Аккаунт:** ${login}
🏆 **Ранг:** ${decodeRank(data.rank_tier)}
🎭 **Порядочность:** ${data.behavior_score}
🤝 **Вежливость:** ${data.commends}${data.commends === 0 ? ' (Скрыто/0)' : ''}

🕹 **Матчи:** ${data.match_count || 'Н/Д'}
⚖️ **Low Priority:** ${data.low_priority ? '⚠️ ДА' : '✅ Нет'}

💎 **Dota Plus:** ${data.dota_plus ? '✅ Активен' : '❌ Нет'}
🎟 **Жетоны ролей:** ${data.role_tokens} шт.
📈 **Double Down:** ${data.double_down} шт.
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
`;
      await ctx.reply(report, { parse_mode: 'Markdown' });
      bot.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
    } catch (err) {
      logger.error('Check failed', { error: err.message, login });
      await ctx.reply(`❌ Ошибка: ${err.message}`);
    }
  });
});

bot
  .launch()
  .then(() => {
    state.botReady = true;
    logger.info('Bot started');
  })
  .catch((err) => {
    logger.error('Bot failed to start', { error: err.message });
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
