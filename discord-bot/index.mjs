import crypto from "node:crypto";
import http from "node:http";

const {
  DISCORD_PUBLIC_KEY,
  DISCORD_GUILD_ID,
  GCP_PROJECT,
  GCP_ZONE,
  GCP_INSTANCE,
  FOUNDRY_URL,
  PORT = "8080",
} = process.env;

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
const ResponseType = { PONG: 1, CHANNEL_MESSAGE: 4, DEFERRED_CHANNEL_MESSAGE: 5 };
const EPHEMERAL = 64;

const READY_POLL_INTERVAL_MS = 10_000;
const READY_TIMEOUT_MS = 5 * 60_000;

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const discordKey = crypto.createPublicKey({
  key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(DISCORD_PUBLIC_KEY, "hex")]),
  format: "der",
  type: "spki",
});

const INSTANCE_URL =
  `https://compute.googleapis.com/compute/v1/projects/${GCP_PROJECT}/zones/${GCP_ZONE}/instances/${GCP_INSTANCE}`;

function isVerified(req, body) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  if (!signature || !timestamp) return false;
  try {
    return crypto.verify(
      null,
      Buffer.concat([Buffer.from(timestamp), body]),
      discordKey,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

async function accessToken() {
  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } },
  );
  if (!response.ok) throw new Error(`Metadata token request failed: ${response.status}`);
  return (await response.json()).access_token;
}

async function compute(method, action = "") {
  const response = await fetch(`${INSTANCE_URL}${action}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (!response.ok) {
    throw new Error(`Compute API ${method} ${action || "get"} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function vmStatus() {
  return (await compute("GET")).status;
}

async function isFoundryReady() {
  try {
    const response = await fetch(FOUNDRY_URL, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    // Cloudflare answers 530 when the tunnel is down.
    return response.status < 500;
  } catch {
    return false;
  }
}

async function editReply(interaction, content) {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  if (!response.ok) console.error(`Failed to edit reply: ${response.status} ${await response.text()}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntilReady(interaction) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isFoundryReady()) {
      await editReply(interaction, `Foundry is up! ${FOUNDRY_URL}`);
      return;
    }
    await sleep(READY_POLL_INTERVAL_MS);
  }
  await editReply(
    interaction,
    "The server is still starting up. Give it another minute, then check with `/foundry status`.",
  );
}

async function handleStart(interaction) {
  const status = await vmStatus();

  if (status === "RUNNING" && (await isFoundryReady())) {
    await editReply(interaction, `Foundry is already running: ${FOUNDRY_URL}`);
    return;
  }
  if (status === "STOPPING" || status === "SUSPENDING") {
    await editReply(interaction, "The server is shutting down right now. Try again in a minute.");
    return;
  }
  if (status === "TERMINATED" || status === "STOPPED") {
    await compute("POST", "/start");
  } else if (status === "SUSPENDED") {
    await compute("POST", "/resume");
  }

  await editReply(interaction, "Starting the Foundry server. This usually takes about 2 minutes...");
  await waitUntilReady(interaction);
}

async function handleStatus(interaction) {
  const status = await vmStatus();
  let message;
  if (status === "RUNNING") {
    message = (await isFoundryReady())
      ? `Foundry is online: ${FOUNDRY_URL}`
      : "The server is booting. Foundry should be ready shortly.";
  } else if (status === "TERMINATED" || status === "STOPPED" || status === "SUSPENDED") {
    message = "The server is asleep. Use `/foundry start` to wake it up.";
  } else if (status === "STOPPING" || status === "SUSPENDING") {
    message = "The server is shutting down.";
  } else {
    message = `The server is ${status.toLowerCase()}.`;
  }
  await editReply(interaction, message);
}

async function handleStop(interaction) {
  const status = await vmStatus();
  if (status !== "RUNNING") {
    await editReply(interaction, "The server isn't running.");
    return;
  }
  await compute("POST", "/stop");
  await editReply(interaction, "Shutting the Foundry server down.");
}

const handlers = { start: handleStart, status: handleStatus, stop: handleStop };

function sendJson(res, payload) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function reply(res, content) {
  sendJson(res, { type: ResponseType.CHANNEL_MESSAGE, data: { content, flags: EPHEMERAL } });
}

http
  .createServer(async (req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    if (!isVerified(req, body)) {
      res.writeHead(401).end("invalid request signature");
      return;
    }

    const interaction = JSON.parse(body);

    if (interaction.type === InteractionType.PING) {
      sendJson(res, { type: ResponseType.PONG });
      return;
    }

    if (interaction.type !== InteractionType.APPLICATION_COMMAND || interaction.data?.name !== "foundry") {
      reply(res, "Unknown command.");
      return;
    }
    if (interaction.guild_id !== DISCORD_GUILD_ID) {
      reply(res, "This command only works in the campaign's Discord server.");
      return;
    }

    const subcommand = interaction.data.options?.[0]?.name;
    const handler = handlers[subcommand];
    if (!handler) {
      reply(res, "Unknown command.");
      return;
    }
    // Discord requires a response within 3 seconds; the real answer is edited in afterwards.
    sendJson(res, { type: ResponseType.DEFERRED_CHANNEL_MESSAGE });

    try {
      await handler(interaction);
    } catch (error) {
      console.error(error);
      await editReply(interaction, "Something went wrong talking to Google Cloud. Check the bot's logs.");
    }
  })
  .listen(Number(PORT), () => console.log(`Listening on port ${PORT}`));
