// index.js
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// .envからトークンを読み込む
require('dotenv').config();

// Botが起動したら一度だけ実行される
client.once('ready', () => {
    console.log(`✅ ログイン完了: ${client.user.tag}`);
});

// メッセージを受け取ったときの処理
client.on('messageCreate', (message) => {
    // Bot自身のメッセージは無視
    if (message.author.bot) return;

    // "ping"と送られたら"pong"と返信
    if (message.content === 'ping') {
        message.reply('pong!');
    }
});

// BotをDiscordに接続
client.login(process.env.TOKEN);
