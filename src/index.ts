require("dotenv").config();

import {
  Client,
  GatewayIntentBits,
  GuildMemberRoleManager,
  REST,
  Routes,
} from "discord.js";
import { deploySapidataCmd } from "./commands/deploySapidata";
import Logger from "./utils/logger";

const { DISCORD_CLIENT_ID, DISCORD_BOT_TOKEN, DEPLOYABLE_ROLE_ID } =
  process.env;

if (!DISCORD_CLIENT_ID || !DISCORD_BOT_TOKEN || !DEPLOYABLE_ROLE_ID) {
  throw new Error("Required environment variable(s) were not provided!");
}

const commands = [
  {
    name: "deploy_sapidata",
    description:
      "現在のsapi-dataスプレッドシートからStationAPI(stg)のデプロイを作成します",
  },
];

const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "deploy_sapidata") {
    const logger = new Logger(interaction.member?.user.username);
    if (
      (interaction.member?.roles as GuildMemberRoleManager).cache.has(
        DEPLOYABLE_ROLE_ID
      )
    ) {
      try {
        await interaction.deferReply();
        await deploySapidataCmd(logger);
        logger.success("Done.");
        await interaction.followUp("ゾス");
      } catch (err) {
        console.error(err);
        logger.failed(err);
        await interaction.followUp("😭内部エラーが発生したゾ😭");
      }
    } else {
      logger.denied();
      await interaction.reply("は？");
    }
  }
});

client.login(DISCORD_BOT_TOKEN);
