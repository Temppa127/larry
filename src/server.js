import { AutoRouter } from 'itty-router';
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
  InteractionResponseFlags,
} from 'discord-interactions';
import { AWW_COMMAND, INVITE_COMMAND, PROMPT_COMMAND, CHANNEL_COMMAND } from './commands.js';
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

        const poo = "poo"

        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              JSON.stringify(poo)
          },
        });
      }
      case CHANNEL_COMMAND.name.toLowerCase(): {
       
        const guildId = interaction.guild_id;
        const channelId = interaction.channel_id;
        await env.PROMPT_CHANNELS.put(guildId, channelId);

        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "This channel is now set for weekly prompts!" },
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


async function sendPromptToAllChannels(env) {
  
  

  const row = getRandomPrompt(env)
  const mainText = row.mainText
  const genres = row.genres




  // List all guilds/channels
  const list = await env.PROMPT_CHANNELS.list();
  for (const entry of list.keys) {
    const guildId = entry.name;
    const channelId = await env.PROMPT_CHANNELS.get(guildId);
    await sendPromptToDiscordChannel(env, channelId, mainText, genres);
  }
}

async function sendPromptToDiscordChannel(env, channelId, mainText, genres) {
  const botToken = env.DISCORD_TOKEN;
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

  // Example embed structure
  const embed = {
    title: "WRITING PROMPT OF THE WEEK:",
    description: toString(mainText),
    color: 0x5865F2, // Discord blurple
    footer: {
      text: toString(genres),
    },
    timestamp: new Date().toISOString(),
    // You can add more fields, images, author, etc. as needed
  };

  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [embed],
    }),
  });
}


async function getRandomPrompt(env) {
  const results = await env.PROMPTS
    .prepare("SELECT * FROM generalPrompts ORDER BY RANDOM() LIMIT 1")
    .run();    
    return results.results[0];
}




// Cloudflare Worker fetch handler
export default {
  async scheduled(controller, env, ctx) {
  await sendPromptToAllChannels(env);
},
  fetch: router.fetch,
};


