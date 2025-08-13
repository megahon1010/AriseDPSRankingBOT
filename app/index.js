import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "npm:discord.js@14";

const TOKEN = Deno.env.get("TOKEN");
const CLIENT_ID = Deno.env.get("CLIENT_ID");
const GUILD_ID = Deno.env.get("GUILD_ID");

// 環境変数チェック
if (!TOKEN) throw new Error("DISCORD_TOKEN is not set");
if (!CLIENT_ID) throw new Error("CLIENT_ID is not set");
if (!GUILD_ID) throw new Error("GUILD_ID is not set");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const commands = [
  new SlashCommandBuilder()
    .setName("dps")
    .setDescription("DPSを登録します（例: /dps 700 ud）")
    .addNumberOption(option =>
      option.setName("数値").setDescription("DPSの数値部分（例: 700）").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("単位").setDescription("単位（例: ud, dc）").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("DPSランキングを表示します"),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

console.log("Bot起動中...");

await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
  body: commands.map(cmd => cmd.toJSON()),
})
  .then(() => console.log("スラッシュコマンド登録成功"))
  .catch(err => console.error("スラッシュコマンド登録失敗:", err));

const kv = globalThis.__DENO_KV;

async function saveUserDps(userId, data) {
  await kv.set(["dps", userId], data);
}

async function getAllDps() {
  const list = [];
  for await (const entry of kv.list({ prefix: ["dps"] })) {
    list.push({ key: entry.key[1], value: entry.value });
  }
  return list;
}

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`コマンド${interaction.commandName}が${interaction.user.username}によって呼ばれました`);

  if (interaction.commandName === "dps") {
    const value = interaction.options.getNumber("数値", true);
    const unit = interaction.options.getString("単位", true);

    await saveUserDps(interaction.user.id, {
      value,
      unit,
      name: interaction.user.username,
    });

    await interaction.reply(`✅ ${interaction.user.username} さんのDPSを **${value}${unit}** で登録しました！`);

    await updateRoles(interaction.guild);
  }

  if (interaction.commandName === "ranking") {
    const allDps = await getAllDps();
    const sorted = allDps.sort((a, b) => b.value.value - a.value.value);

    let msg = "🏆 **DPSランキング** 🏆\n";
    sorted.forEach((user, i) => {
      let medal = "";
      if (i === 0) medal = "🥇";
      else if (i === 1) medal = "🥈";
      else if (i === 2) medal = "🥉";
      msg += `${i + 1}位 ${medal} **${user.value.name}** — ${user.value.value}${user.value.unit}\n`;
    });

    await interaction.reply(msg);
  }
});

async function updateRoles(guild) {
  if (!guild) {
    console.warn("guildがundefinedです。");
    return;
  }

  console.log("ロール更新処理開始");

  const allDps = await getAllDps();
  const sorted = allDps.sort((a, b) => b.value.value - a.value.value);

  const topRoles = {
    0: "Top 1 🥇",
    1: "Top 2 🥈",
    2: "Top 3 🥉",
  };
  const top10Role = "Top 10";

  await guild.roles.fetch();
  await guild.members.fetch();

  for (const [index, userEntry] of sorted.entries()) {
    const userId = userEntry.key;
    const member = guild.members.cache.get(userId);
    if (!member) continue;

    // 既存トップロール削除
    for (const roleName of Object.values(topRoles)) {
      const role = guild.roles.cache.find(r => r.name === roleName);
      if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
      }
    }
    const role10 = guild.roles.cache.find(r => r.name === top10Role);
    if (role10 && member.roles.cache.has(role10.id)) {
      await member.roles.remove(role10);
    }

    // 新しいロール付与
    if (topRoles[index]) {
      const role = guild.roles.cache.find(r => r.name === topRoles[index]);
      if (role) await member.roles.add(role);
    } else if (index < 10) {
      const role = guild.roles.cache.find(r => r.name === top10Role);
      if (role) await member.roles.add(role);
    }
  }

  console.log("ロール更新処理完了");
}

client.login(TOKEN);


Deno.cron("Continuous Request", "*/2 * * * *", () => {
    console.log("running...");
});







