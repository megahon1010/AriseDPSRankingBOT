// index.js
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "npm:discord.js";
const kv = await Deno.openKv();

// ====== 環境変数 ======
const DISCORD_TOKEN = Deno.env.get("TOKEN");
const CLIENT_ID = Deno.env.get("CLIENT_ID");

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("❌ DISCORD_TOKEN または CLIENT_ID が設定されていません");
  Deno.exit(1);
}

// ====== スラッシュコマンド定義（グローバルのみ） ======
const commands = [
  new SlashCommandBuilder()
    .setName("dps")
    .setDescription("自分のDPSを登録します（例: /dps 700 ud）")
    .addNumberOption(option =>
      option.setName("value").setDescription("DPSの数値").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("unit").setDescription("単位（例: ud, qd, kd）").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("このサーバーのDPSランキングを表示します"),
].map(c => c.toJSON());

// ====== コマンド登録（既存を上書き） ======
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
try {
  console.log("📡 グローバルコマンド登録中...");
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ コマンド登録完了（グローバル）");
} catch (err) {
  console.error("❌ コマンド登録失敗:", err);
}

// ====== Bot起動 ======
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`🤖 ログイン成功: ${client.user.tag}`);
});

// ====== DPS保存 ======
async function saveUserDps(guildId, userId, value, unit) {
  await kv.set(["dps", guildId, userId], { value, unit });
}

// ====== DPS取得 ======
async function getAllDps(guildId) {
  const list = [];
  for await (const entry of kv.list({ prefix: ["dps", guildId] })) {
    list.push({ userId: entry.key[2], ...entry.value });
  }
  return list;
}

// ====== コマンド処理 ======
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  if (interaction.commandName === "dps") {
    const value = interaction.options.getNumber("value");
    const unit = interaction.options.getString("unit");
    await saveUserDps(guildId, userId, value, unit);
    await interaction.reply(`✅ DPSを登録しました: **${value} ${unit}**`);
  }

  if (interaction.commandName === "ranking") {
    const allDps = await getAllDps(guildId);
    if (allDps.length === 0) {
      await interaction.reply("⚠️ まだDPSが登録されていません");
      return;
    }

    // ソート
    allDps.sort((a, b) => b.value - a.value);

    // 表示
    const ranking = allDps
      .map((u, i) => `**${i + 1}位** <@${u.userId}> — ${u.value} ${u.unit}`)
      .join("\n");

    await interaction.reply(`🏆 **${interaction.guild.name} DPSランキング**\n${ranking}`);
  }
});

client.login(DISCORD_TOKEN);




Deno.cron("Continuous Request", "*/2 * * * *", () => {
    console.log("running...");
});

