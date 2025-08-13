// index.js
import "npm:dotenv/config";
import { Client, GatewayIntentBits, REST, Routes } from "npm:discord.js@14.21.0";

const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const CLIENT_ID = Deno.env.get("CLIENT_ID");
const GUILD_IDS = Deno.env.get("GUILD_IDS")?.split(","); // 複数サーバー対応

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_IDS?.length) {
  console.error("環境変数 DISCORD_TOKEN / CLIENT_ID / GUILD_IDS を設定してください");
  Deno.exit(1);
}

// KVストア接続
const kv = await Deno.openKv();

// コマンド定義
const commands = [
  {
    name: "dps",
    description: "自分のDPSを登録します",
    options: [
      { name: "value", description: "DPSの数値", type: 10, required: true },
      { name: "unit", description: "単位 (例: K, M, B, ud)", type: 3, required: true }
    ]
  },
  {
    name: "ranking",
    description: "このサーバーのDPSランキングを表示します"
  }
];

// 起動時にコマンド登録
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  console.log("🚨 グローバルコマンド全削除中...");
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });

  for (const guildId of GUILD_IDS) {
    console.log(`📌 ギルド(${guildId})コマンド登録中...`);
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, guildId),
      { body: commands }
    );
  }
  console.log("✅ コマンド登録完了");
}

// DPS保存
async function saveUserDps(guildId, userId, value, unit) {
  await kv.set(["dps", guildId, userId], { value, unit });
}

// DPS取得
async function getAllDps(guildId) {
  const results = [];
  for await (const entry of kv.list({ prefix: ["dps", guildId] })) {
    const userId = entry.key[2];
    results.push({ userId, ...entry.value });
  }
  return results;
}

// Botクライアント
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`✅ ログイン完了: ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "dps") {
    const value = interaction.options.getNumber("value");
    const unit = interaction.options.getString("unit");
    await saveUserDps(interaction.guildId, interaction.user.id, value, unit);
    await interaction.reply(`💾 DPSを登録しました: **${value}${unit}**`);
  }

  if (interaction.commandName === "ranking") {
    const data = await getAllDps(interaction.guildId);
    if (data.length === 0) {
      await interaction.reply("ランキングデータがありません。");
      return;
    }
    const sorted = data.sort((a, b) => b.value - a.value);
    const text = sorted
      .map((d, i) => `${i + 1}. <@${d.userId}> — ${d.value}${d.unit}`)
      .join("\n");
    await interaction.reply(`🏆 DPSランキング\n${text}`);
  }
});

// 起動
await registerCommands();
client.login(DISCORD_TOKEN);

Deno.cron("Continuous Request", "*/2 * * * *", () => {
    console.log("running...");
});


