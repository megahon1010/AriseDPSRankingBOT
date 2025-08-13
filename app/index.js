// index.js (ESM形式対応・Discord.js v14対応)
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

// .env読み込み
dotenv.config();

// Botクライアント作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // サーバーイベント
        GatewayIntentBits.GuildMessages, // メッセージイベント
        GatewayIntentBits.MessageContent // メッセージ内容取得
    ]
});

// 起動時の処理
client.once("ready", () => {
    console.log(`✅ ログイン完了: ${client.user.tag}`);
});

// メッセージ受信イベント
client.on("messageCreate", (message) => {
    // Bot自身のメッセージは無視
    if (message.author.bot) return;

    if (message.content === "ping") {
        message.reply("🏓 pong!");
    }
});

// ログイン
client.login(process.env.TOKEN);

