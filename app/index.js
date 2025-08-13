import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "npm:discord.js@14";

const TOKEN = Deno.env.get("DISCORD_TOKEN")!;
const CLIENT_ID = Deno.env.get("CLIENT_ID")!;
const GUILD_ID = Deno.env.get("GUILD_ID")!;

// ===== Botクライアント =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// ===== スラッシュコマンド登録 =====
const commands = [
  new SlashCommandBuilder()
    .setName("dps")
    .setDescription("DPSを登録します（例: /dps 700 ud）")
    .addNumberOption((option) =>
      option.setName("数値").setDescription("DPSの数値部分（例: 700）").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("単位").setDescription("単位（例: ud, dc）").setRequired(true)
    ),
  new SlashCommandBuilder().setName("ranking").setDescription("DPSランキングを表示します"),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
  body: commands.map((cmd) => cmd.toJSON()),
});

// ===== KVストア操作 =====
const kv = globalThis.__DENO_KV;

// ユーザーデータを保存
async function saveUserDps(userId: string, data: { value: number; unit: string; name: string }) {
  await kv.set(["dps", userId], data);
}

// すべてのDPSデータを取得
async function getAllDps() {
  const list: { key: string; value: { value: number; unit: string; name: string } }[] = [];
  for await (const entry of kv.list({ prefix: ["dps"] })) {
    list.push({ key: entry.key[1], value: entry.value });
  }
  return list;
}

// ===== コマンド処理 =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "dps") {
    const value = interaction.options.getNumber("数値", true);
    const unit = interaction.options.getString("単位", true);

    await saveUserDps(interaction.user.id, {
      value,
      unit,
      name: interaction.user.username,
    });

    await interaction.reply(`✅ ${interaction.user.username} さんのDPSを **${value}${unit}** で登録しました！`);

    await updateRoles(interaction.guild!);
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

// ===== ロール更新処理 =====
async function updateRoles(guild) {
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
    const userData = userEntry.value;

    const member = guild.members.cache.get(userId);
    if (!member) continue;

    // 既存トップロール削除
    for (const r of Object.values(topRoles)) {
      const role = guild.roles.cache.find((role) => role.name === r);
      if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
      }
    }
    const role10 = guild.roles.cache.find((role) => role.name === top10Role);
    if (role10 && member.roles.cache.has(role10.id)) {
      await member.roles.remove(role10);
    }

    // 新しいロール付与
    if (topRoles[index]) {
      const roleName = topRoles[index];
      const role = guild.roles.cache.find((role) => role.name === roleName);
      if (role) await member.roles.add(role);
    } else if (index < 10) {
      const role = guild.roles.cache.find((role) => role.name === top10Role);
      if (role) await member.roles.add(role);
    }
  }
}

client.login(TOKEN);

Deno.cron("Continuous Request", "*/2 * * * *", () => {
    console.log("running...");
});



