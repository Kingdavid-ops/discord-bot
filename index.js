if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing in environment variables");
}
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  PresenceUpdateStatus,
  REST,
  Routes,
} = require("discord.js");

const deployComands = async () => {
  try {
    const comands = [];
    const commandsFiles = fs
      .readdirSync(path.join(__dirname, "commands"))
      .filter((file) => file.endsWith(".js"));
    for (const file of commandsFiles) {
      const comand = require(`./commands/${file}`);

      if ("data" in comand && "execute" in comand) {
        comands.push(comand.data.toJSON());
      } else {
        console.log(
          `[WARNING] The command at ./commands/${file} is missing a required "data" or "execute" property.`
        );
      }
    }

    const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
    console.log(
      `started refreshin ${comands.length} application slash comands globally`
    );

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: comands }
    );
    console.log(
      `successfully reloaded ${data.length} application (/) comands.`
    );
  } catch (error) {
    console.error("Error deploying comands", error);
  }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
  ],
});

client.comands = new Collection();

const comandsPath = path.join(__dirname, "commands");
const comandsFiles = fs
  .readdirSync(comandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of comandsFiles) {
  const filePath = path.join(comandsPath, file);
  const comand = require(filePath);

  if ("data" in comand && "execute" in comand) {
    client.comands.set(comand.data.name, comand);
  } else {
    console.log(
      `[WARNING] The comand at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await deployComands();
  console.log("commands deployed globally");

  const statusType = process.env.BOT_STATUS || "online";
  const activityType = process.env.ACTIVITY_TYPE || "PLAYING";
  const activityName = process.env.ACTIVITY_NAME || "Discord";

  const activityTypeMap = {
    PLAYING: ActivityType.Playing,
    WATCHING: ActivityType.Watching,
    LISTENING: ActivityType.Listening,
    COMPETING: ActivityType.Competing,
    STREAMING: ActivityType.Streaming,
  };

  const statusMap = {
    online: PresenceUpdateStatus.Online,
    idle: PresenceUpdateStatus.Idle,
    dnd: PresenceUpdateStatus.DoNotDisturb,
    invisible: PresenceUpdateStatus.Invisible,
  };

  client.user.setPresence({
    status: statusMap[statusType],
    activities: [
      {
        name: activityName,
        type: activityTypeMap[activityType],
      },
    ],
  });

  console.log(`bot status set to ${statusType}`);
  console.log(`activity set to ${activityType} in ${activityName}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const comand = client.comands.get(interaction.commandName);

  if (!comand) {
    //   console.error(`No comand matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await comand.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}`);
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});
client.login(process.env.BOT_TOKEN);
