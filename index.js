import { Client, GatewayIntentBits, Routes, REST, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import express from "express";
import axios from "axios";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const TOKEN = "SEU_TOKEN_DO_BOT";
const CLIENT_ID = "1471306563795943506";
const CLIENT_SECRET = "SEU_CLIENT_SECRET";
const REDIRECT_URI = "https://SEU-SITE/callback";

let config = {
  canalId: null,
  cargoId: null,
  titulo: "Verifique sua conta",
  descricao: "Clique no botão abaixo para se verificar",
  imagem: null,
  miniimagem: null,
  cor: "#00ff88",
  nomebotao: "Verificar",
  corbotao: "verde"
};

const commands = [
  new SlashCommandBuilder()
    .setName("canalecargo")
    .setDescription("Define canal e cargo")
    .addChannelOption(o => o.setName("canal").setDescription("Canal de verificação").setRequired(true))
    .addRoleOption(o => o.setName("cargo").setDescription("Cargo de verificado").setRequired(true)),

  new SlashCommandBuilder()
    .setName("configurar")
    .setDescription("Configura a mensagem de verificação")
    .addStringOption(o => o.setName("titulo").setRequired(true))
    .addStringOption(o => o.setName("descricao").setRequired(true))
    .addStringOption(o => o.setName("imagem"))
    .addStringOption(o => o.setName("miniimagem"))
    .addStringOption(o => o.setName("cor"))
    .addStringOption(o => o.setName("nomebotao"))
    .addStringOption(o => o.setName("corbotao"))
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "canalecargo") {
    config.canalId = interaction.options.getChannel("canal").id;
    config.cargoId = interaction.options.getRole("cargo").id;
    return interaction.reply({ content: "Canal e cargo configurados!", ephemeral: true });
  }

  if (interaction.commandName === "configurar") {
    config.titulo = interaction.options.getString("titulo");
    config.descricao = interaction.options.getString("descricao");
    config.imagem = interaction.options.getString("imagem");
    config.miniimagem = interaction.options.getString("miniimagem");
    config.cor = interaction.options.getString("cor") || config.cor;
    config.nomebotao = interaction.options.getString("nomebotao") || "Verificar";
    config.corbotao = interaction.options.getString("corbotao") || "verde";

    const canal = await client.channels.fetch(config.canalId);

    const embed = new EmbedBuilder()
      .setTitle(config.titulo)
      .setDescription(config.descricao)
      .setColor(config.cor);

    if (config.imagem) embed.setImage(config.imagem);
    if (config.miniimagem) embed.setThumbnail(config.miniimagem);

    const botao = new ButtonBuilder()
      .setLabel(config.nomebotao)
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&integration_type=0&scope=bot`);

    const row = new ActionRowBuilder().addComponents(botao);

    await canal.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: "Mensagem de verificação enviada!", ephemeral: true });
  }
});

client.login(TOKEN);

// 🌐 Site para callback OAuth2
const app = express();

app.get("/callback", async (req, res) => {
  const code = req.query.code;

  const token = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI
  }), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  const user = await axios.get("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.data.access_token}` }
  });

  const guild = client.guilds.cache.first();
  const member = await guild.members.fetch(user.data.id);
  await member.roles.add(config.cargoId);

  res.send("Verificação concluída! Você já pode voltar pro Discord.");
});

app.listen(3000, () => console.log("Site de verificação ligado"));
