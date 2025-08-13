// .envは不要（Deno Deployの「Settings → Environment Variables」でTOKENを設定してください）

import "https://deno.land/std@0.224.0/dotenv/load.ts"; // ローカル開発用（Deno Deployでは無視される）
import { Client, GatewayIntentBits } from "npm:discord.js@14.15.3";

// Deno KV 初期化
const kv = await Deno.openKv();

// ロール名（事前にDiscordサーバーで作成しておく）
const ROLE_TOP1 = "TOP 1";
const ROLE_TOP2 = "TOP 2";
const ROLE_TOP3 = "TOP 3";
const ROLE_TOP10 = "TOP 10";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once("ready", () => {
    console.log(`✅ ログイン完了: ${client.user.tag}`);
});

// メッセージ処理
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();

    // DPS登録コマンド
    if (command === "!dps") {
        if (!args[1] || isNaN(args[1])) {
            return message.reply("⚠️ 数値を入力してください。\n例: `!dps 12345`");
        }
        const dpsValue = parseFloat(args[1]);
        await kv.set(["dps", message.author.id], dpsValue);
        await updateRankingRoles(message.guild);
        message.reply(`✅ あなたのDPSを **${dpsValue}** に更新しました！`);
    }

    // ランキング表示
    if (command === "!rank") {
        const allEntries = [];
        for await (const entry of kv.list({ prefix: ["dps"] })) {
            allEntries.push([entry.key[1], entry.value]); // [userId, dps]
        }

        const sorted = allEntries.sort((a, b) => b[1] - a[1]).slice(0, 10);

        if (sorted.length === 0) return message.reply("📊 登録者がまだいません。");

        const rankText = sorted
            .map(([userId, dps], index) => `#${index + 1} <@${userId}> - **${dps}** DPS`)
            .join("\n");

        message.channel.send(`🏆 **DPSランキング（上位10位）**\n${rankText}`);
    }
});

// ロール更新処理
async function updateRankingRoles(guild) {
    const allEntries = [];
    for await (const entry of kv.list({ prefix: ["dps"] })) {
        allEntries.push([entry.key[1], entry.value]);
    }

    const sorted = allEntries.sort((a, b) => b[1] - a[1]);

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

    // 全員のロールを初期化
    for (const member of guild.members.cache.values()) {
        await member.roles.remove([role1, role2, role3, role10]).catch(() => {});
    }

    // 上位にロール付与
    if (top1) guild.members.cache.get(top1)?.roles.add(role1).catch(() => {});
    if (top2) guild.members.cache.get(top2)?.roles.add(role2).catch(() => {});
    if (top3) guild.members.cache.get(top3)?.roles.add(role3).catch(() => {});
    for (const id of top10) {
        guild.members.cache.get(id)?.roles.add(role10).catch(() => {});
    }
}

client.login(Deno.env.get("TOKEN"));

Deno.cron("Continuous Request", "*/2 * * * *", () => {
    console.log("running...");
});


