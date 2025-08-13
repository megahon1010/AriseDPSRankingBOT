// index.js
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// データ保存用ファイル
const DATA_FILE = "./dpsData.json";

// 保存されているデータを読み込み
let dpsData = new Map();
if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE);
    const json = JSON.parse(raw);
    dpsData = new Map(Object.entries(json)); // {id: dps} → Map
}

// ロール名（サーバーに作成しておく）
const ROLE_TOP1 = "TOP 1";
const ROLE_TOP2 = "TOP 2";
const ROLE_TOP3 = "TOP 3";
const ROLE_TOP10 = "TOP 10";

// Botクライアント
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 起動時
client.once("ready", () => {
    console.log(`✅ ログイン完了: ${client.user.tag}`);
});

// メッセージ受信
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();

    // ---------------------------
    // DPS登録
    // ---------------------------
    if (command === "!dps") {
        if (!args[1] || isNaN(args[1])) {
            return message.reply("⚠️ 数値を入力してください。\n例: `!dps 12345`");
        }

        const dpsValue = parseFloat(args[1]);
        dpsData.set(message.author.id, dpsValue);

        saveData();
        await updateRankingRoles(message.guild);

        message.reply(`✅ あなたのDPSを **${dpsValue}** に更新しました！`);
    }

    // ---------------------------
    // ランキング表示
    // ---------------------------
    if (command === "!rank") {
        const sorted = [...dpsData.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (sorted.length === 0) return message.reply("📊 登録者がまだいません。");

        const rankText = sorted
            .map(([userId, dps], index) => `#${index + 1} <@${userId}> - **${dps}** DPS`)
            .join("\n");

        message.channel.send(`🏆 **DPSランキング（上位10位）**\n${rankText}`);
    }
});

// ---------------------------
// データ保存
// ---------------------------
function saveData() {
    const obj = Object.fromEntries(dpsData);
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
}

// ---------------------------
// ロール更新処理
// ---------------------------
async function updateRankingRoles(guild) {
    const sorted = [...dpsData.entries()].sort((a, b) => b[1] - a[1]);

    const top1 = sorted[0]?.[0];
    const top2 = sorted[1]?.[0];
    const top3 = sorted[2]?.[0];
    const top10 = sorted.slice(0, 10).map(([id]) => id);

    const role1 = guild.roles.cache.find(r => r.name === ROLE_TOP1);
    const role2 = guild.roles.cache.find(r => r.name === ROLE_TOP2);
    const role3 = guild.roles.cache.find(r => r.name === ROLE_TOP3);
    const role10 = guild.roles.cache.find(r => r.name === ROLE_TOP10);

    if (!role1 || !role2 || !role3 || !role10) {
        console.error("❌ ロールが見つかりません。");
        return;
    }

    // 一旦全員からロール削除
    for (const member of guild.members.cache.values()) {
        await member.roles.remove([role1, role2, role3, role10]).catch(() => {});
    }

    // 順位ごとにロール付与
    if (top1) guild.members.cache.get(top1)?.roles.add(role1).catch(() => {});
    if (top2) guild.members.cache.get(top2)?.roles.add(role2).catch(() => {});
    if (top3) guild.members.cache.get(top3)?.roles.add(role3).catch(() => {});
    for (const id of top10) {
        guild.members.cache.get(id)?.roles.add(role10).catch(() => {});
    }
}

// Bot起動
client.login(process.env.TOKEN);


Deno.cron("Continuous Request", "*/2 * * * *", () => {
    console.log("running...");
});
