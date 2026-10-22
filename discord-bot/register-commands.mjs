const { DISCORD_APPLICATION_ID, DISCORD_GUILD_ID, DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_APPLICATION_ID || !DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) {
  console.error("Set DISCORD_APPLICATION_ID, DISCORD_GUILD_ID, and DISCORD_BOT_TOKEN.");
  process.exit(1);
}

const SUB_COMMAND = 1;

const commands = [
  {
    name: "foundry",
    description: "Control the Foundry VTT server",
    type: 1,
    options: [
      { type: SUB_COMMAND, name: "start", description: "Boot the server so you can log in" },
      { type: SUB_COMMAND, name: "status", description: "Check whether the server is running" },
      { type: SUB_COMMAND, name: "stop", description: "Shut the server down now" },
    ],
  },
];

const response = await fetch(
  `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  },
);

if (!response.ok) {
  console.error(`Failed to register commands: ${response.status} ${await response.text()}`);
  process.exit(1);
}

console.log("Registered /foundry start | status | stop");
