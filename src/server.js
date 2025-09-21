import { AutoRouter } from 'itty-router';
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
  InteractionResponseFlags,
} from 'discord-interactions';
import { AWW_COMMAND, INVITE_COMMAND, PROMPT_COMMAND } from './commands.js';
import { getCuteUrl } from './reddit.js';

// Helper for JSON responses
class JsonResponse extends Response {
  constructor(body, init) {
    const jsonBody = JSON.stringify(body);
    init = init || {};
    init.headers = {
      'content-type': 'application/json;charset=UTF-8',
      ...init.headers,
    };
    super(jsonBody, init);
  }
}

const router = AutoRouter();

// Hello route
router.get('/', (request, env) => {
  return new Response('🦭🦭🦭🦭🦭🦭🦭🦭🦭🦭🦭🦭🦭🦭');
});

// Main Discord interaction route
router.post('/', async (request, env) => {
  const { isValid, interaction } = await verifyDiscordRequest(request, env);
  if (!isValid || !interaction) {
    return new Response('Bad request signature.', { status: 401 });
  }

  if (interaction.type === InteractionType.PING) {
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    switch (interaction.data.name.toLowerCase()) {
      case AWW_COMMAND.name.toLowerCase(): {
        const cuteUrl = await getCuteUrl();
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: cuteUrl },
        });
      }
      case INVITE_COMMAND.name.toLowerCase(): {
        const applicationId = env.DISCORD_APPLICATION_ID;
        const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=applications.commands`;
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: INVITE_URL,
            flags: InteractionResponseFlags.EPHEMERAL,
          },
        });
      }
      case PROMPT_COMMAND.name.toLowerCase(): {
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              "You are stuck on the toilet, and there is no toilet paper... Even if you scream, the nearest human being is too far away to hear you",
          },
        });
      }
      default:
        return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
    }
  }

  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
});

router.all('*', () => new Response('Not Found.', { status: 404 }));

// Discord signature verification
async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();
  const isValidRequest =
    signature &&
    timestamp &&
    (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
  if (!isValidRequest) {
    return { isValid: false };
  }
  return { interaction: JSON.parse(body), isValid: true };
}

// Function to send the prompt to Discord via webhook
async function sendPromptToDiscord(env) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  const content =
    "You are stuck on the toilet, and there is no toilet paper... Even if you scream, the nearest human being is too far away to hear you";
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

// Cloudflare Cron Trigger handler (must be a named export!)
export async function scheduled(event, env, ctx) {
  await sendPromptToDiscord(env);
}


// Cloudflare Worker fetch handler
export default {
  fetch: router.fetch,
};


