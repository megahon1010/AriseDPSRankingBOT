// index.js

import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} from "npm:discord.js";

// ==== 環境変数（Deno DeployのSettings > Environment variablesに設定） ====
// DISCORD_TOKEN: Botのトークン
// CLIENT_ID: DiscordアプリのアプリケーションID
// ============================================
const TOKEN = Deno.env.get("TOKEN");
const CLIENT_ID = Deno.env.get("CLIENT_ID");

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ DISCORD_TOKEN または CLIENT_ID が設定されていません。");
  Deno.exit(1);
}

const kv = await Deno.openKv();

// ==== スラッシュコマンド定義 ====
const commands = [
  new SlashCommandBuilder()
    .setName("dps")
    .setDescription("自分のDPSを登録します")
    .addNumberOption(opt =>
      opt.setName("value")
        .setDescription("DPSの数値")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("unit")
        .setDescription("単位（例: ud, M, B など）")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("このサーバーのDPSランキングを表示します")
].map(cmd => cmd.toJSON());

// ==== コマンド登録（グローバル） ====
const rest = new REST({ version: "10" }).setToken(TOKEN);
try {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("✅ スラッシュコマンドを登録しました（グローバル）");
} catch (err) {
  console.error("❌ コマンド登録エラー:", err);
}

// ==== Bot起動 ====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.on("ready", () => {
  console.log(`🤖 ログイン成功: ${client.user.tag}`);
});

// ==== KV保存 ====
async function saveUserDps(guildId, userId, data) {
  await kv.set(["dps", guildId, userId], data);
}

// ==== KV取得（ランキング用） ====
async function getDpsRanking(guildId) {
  const ranking = [];
  for await (const entry of kv.list({ prefix: ["dps", guildId] })) {
    ranking.push({
      userId: entry.key[2],
      value: entry.value.value,
      unit: entry.value.unit
    });
  }
  return ranking.sort((a, b) => b.value - a.value);
}

// ==== コマンド処理 ====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "dps") {
    const value = interaction.options.getNumber("value");
    const unit = interaction.options.getString("unit");

    await saveUserDps(interaction.guildId, interaction.user.id, { value, unit });

    await interaction.reply({
      content: `✅ ${interaction.user.username} さんのDPSを **${value} ${unit}** に登録しました`,
      ephemeral: true // 自分だけ見える
    });
  }

  if (interaction.commandName === "ranking") {
    const ranking = await getDpsRanking(interaction.guildId);
    if (ranking.length === 0) {
      await interaction.reply("📭 このサーバーにはまだ記録がありません");
      return;
    }
    const msg = ranking
      .map((r, i) => `${i + 1}位 🏆 <@${r.userId}> — ${r.value} ${r.unit}`)
      .join("\n");

    await interaction.reply(`**🏆 DPSランキング（このサーバー）**\n${msg}`);
  }
});

client.login(TOKEN);



Deno.cron("Continuous Request", "*/2 * * * *", () => {
    console.log("running...");
});
