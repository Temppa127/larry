import { AutoRouter, json } from 'itty-router';
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
  InteractionResponseFlags,
} from 'discord-interactions';
import {INVITE_COMMAND, PROMPT_COMMAND, CHANNEL_COMMAND, TEST_COMMAND, PROMPT_ADD_COMMAND, PROMPT_DELETE_COMMAND} from './commands.js';
import { clearDelBuffer } from './utils.js';

const PERM_LEVELS = {
  "ADMIN": 1000,
  "MAKEPROMPT": 10,
  "DEFAULT": 0
}




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

  // if (interaction.type === InteractionType.APPLICATION_COMMAND) {
  //   return new JsonResponse({
  //     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  //     data: {
  //       content: JSON.stringify(request.data.options)
  //     }
  //   });
  // }

  if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
    const focusedOption = interaction.data.options.find(opt => opt.focused);
    if (focusedOption?.name === "genre") {
      const userInput = focusedOption.value.toLowerCase();

      
      const genreResults = await env.PROMPTS
        .prepare("SELECT DISTINCT genre FROM genresTable WHERE genre LIKE ? LIMIT 25")
        .bind(`%${userInput}%`)
        .all();

      const choices = genreResults.results.map(row => ({
        name: row.genre,
        value: row.genre
      }));


      return new JsonResponse({
        type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
        data: {
          choices
        }
      });
    }
}



  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    switch (interaction.data.name.toLowerCase()) {
      
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
      
      case TEST_COMMAND.name.toLowerCase(): {
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "test"
          }
        })
      }



      case PROMPT_COMMAND.name.toLowerCase(): {

        
        const genreOption = interaction.data.options?.find(opt => opt.name === "genre");
        const selectedGenre = genreOption?.value;

        const idOption = interaction.data.options?.find(opt => opt.name === "id");
        const selectedID = idOption?.value;

        let row

        if(selectedID) {
          row = await getPromptByID(env, selectedID)
        } else {
          row = await getRandomPrompt(env, selectedGenre)
        }

        

        if(!row) {return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "Could not return a prompt! If choosing a genre or id, make sure you've typed it correctly. If issues persist, contact devs.", 
            flags: InteractionResponseFlags.EPHEMERAL,
          },
          
        });}

        const embed = {
          title: "Your prompt:",
          description: row.mainText,
          color: 0x5865F2, // Discord blurple
          footer: {
            text: "Genres: " + row.genres + "\n" + "ID: " + row.numberID,
          },
          //timestamp: new Date().toISOString(),
        };

        return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data:{
              embeds: [embed],
            }
          })
        }
      
      case PROMPT_DELETE_COMMAND.name.toLowerCase(): {

        const userId = interaction.member.user.id;
        if (!userId) {return new JsonResponse({ error: 'Invalid User' }, { status: 400 });}

        let notEnoughPerms = await checkPermissions(env, userId, "MAKEPROMPT");

        if(notEnoughPerms) {return notEnoughPerms;}

        let invalidIdResp = new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Invalid ID",
            flags: InteractionResponseFlags.EPHEMERAL
          }
        });

        const idOption = interaction.data.options?.find(opt => opt.name === "id").value;
        if(!idOption){return invalidIdResp}

        let res = await getPromptByID(env, idOption)
        if(!res){return invalidIdResp}

        
        let row = await getRowFromBuffer(env, userId)
        if(row) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "Resolve previous deletion command before starting a new one",
              flags: InteractionResponseFlags.EPHEMERAL
            }
          });
        }

        const id = env.DEL_TIMEOUT.newUniqueId();
        const obj = env.DEL_TIMEOUT.get(id);

        await insertIntoBuffer(env, userId, id, idOption);

        await obj.fetch("https://dummy", {
          method: "POST",
          body: JSON.stringify({
            interactionToken: interaction.token,
            applicationId: env.DISCORD_APPLICATION_ID,
            userId: userId
          })
        });
        
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Are you sure you want to delete the prompt with ID: **" + idOption + "**?",
            components: [
              {
                type: 1, // Action row
                components: [
                  {
                    type: 2, // Button
                    label: "Yes",
                    style: 3, // Green
                    custom_id: "confirm_delete"
                  },
                  {
                    type: 2,
                    label: "No",
                    style: 4, // Red
                    custom_id: "cancel_delete"
                  }
                ]
              }
            ],
            flags: InteractionResponseFlags.EPHEMERAL
          }
        });
      }

      case PROMPT_ADD_COMMAND.name.toLowerCase(): {
        const userId = interaction.member.user.id;
        if (!userId) {return new JsonResponse({ error: 'Invalid User' }, { status: 400 });}

        let notEnoughPerms = await checkPermissions(env, userId, "MAKEPROMPT");

        if(notEnoughPerms) {return notEnoughPerms;}

        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "test success" },
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

  
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
  const userId = interaction.member.user.id;
  const customId = interaction.data.custom_id;

  switch (customId) {
    case "confirm_delete": {
      // Perform deletion logic here
      
      const row = await getRowFromBuffer(env, userId)

      if(!row) {return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Unknown error",
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });}

      const promptID = row.deletingPromptId;

      await delPromptByID(env, promptID);

      const id = row.currStubId;
      const obj = env.DEL_TIMEOUT.get(id);


      await obj.cancel() //.fetch("https://dummy/cancel", {method: "POST"});


      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Prompt deleted.",
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }

    case "cancel_delete": {


      const row = await getRowFromBuffer(env, userId)

      if(!row) {return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Unknown error",
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });}

      const id = env.DEL_TIMEOUT.idFromName(row.currStubId);
      const obj = env.DEL_TIMEOUT.getByName(id);
    
      
      await obj.fetch("https://dummy/cancel", {
          method: "POST",
          body: JSON.stringify({
            interactionToken: interaction.token,
            applicationId: env.DISCORD_APPLICATION_ID,
            userId: userId
          })
        });

      
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Deletion cancelled.",
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }

    default:
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Unknown action.",
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
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

async function checkPermissions(env, userID, checkAgainst) {

  let lvl = await env.PERMISSION_LEVELS.get(userID)
  if (!lvl) {
    lvl = "DEFAULT"
  }

  if (PERM_LEVELS[lvl] < PERM_LEVELS[checkAgainst]) {
      return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Error: Permission level not high enough to execute this command",
        flags: InteractionResponseFlags.EPHEMERAL,
       },
      
  });
  }
  return null;
}

async function sendPromptToAllChannels(env) {

  const row = await getRandomPrompt(env)

  // List all guilds/channels
  const list = await env.PROMPT_CHANNELS.list();
  for (const entry of list.keys) {
    const guildId = entry.name;
    const channelId = await env.PROMPT_CHANNELS.get(guildId);
    await sendPromptToDiscordChannel(env, channelId, row);
  }
}

async function sendPromptToDiscordChannel(env, channelId, row) {
  const botToken = env.DISCORD_TOKEN;
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

  const embed = {
    title: "WRITING PROMPT OF THE WEEK:",
    description: row.mainText,
    color: 0x5865F2, // Discord blurple
    footer: {
      text: "Genres: " + row.genres + "\n" + "ID: " + row.numberID,
    },
    //timestamp: new Date().toISOString(),
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

async function delPromptByID(env, ID) {
  
  let query;
  let stmt;
  query = "DELETE FROM generalPrompts WHERE numberID LIKE ? LIMIT 1";
  stmt = env.PROMPTS.prepare(query).bind(`${ID}`);

  await stmt.run();

  return true; 

}


async function getRowFromBuffer(env,ID) {

  let query;
  let stmt;

  query = "SELECT * FROM del_buffer WHERE userId = ?";
  stmt = env.TEMP_DATA.prepare(query).bind(`${ID}`);

  const results = await stmt.run();

  if (results.success && results.results.length > 0) {
    return results.results[0];
  }
  return null;

}

async function insertIntoBuffer(env, userId, stubId, promptId){
  let query;
  let stmt;

  query = "INSERT INTO del_buffer (userId, currStubId, deletingPromptId) VALUES (?, ?, ?)";
  stmt = env.TEMP_DATA.prepare(query).bind(`${userId}`,`${stubId}`,`${promptId}`);
  
  await stmt.run();

}


async function getPromptByID(env, ID) {

  let query;
  let stmt;

  query = "SELECT * FROM generalPrompts WHERE numberID = ? LIMIT 1";
  stmt = env.PROMPTS.prepare(query).bind(`${ID}`);

  const results = await stmt.run();

  if (results.results.length > 0) {
    return results.results[0];
  }
  return null;

}



async function getRandomPrompt(env, genre) {
  let query;
  let stmt;

  if (genre) {
    query = "SELECT * FROM generalPrompts WHERE genres LIKE ? ORDER BY RANDOM() LIMIT 1";
    stmt = env.PROMPTS.prepare(query).bind(`%${genre}%`);
  } else {
    query = "SELECT * FROM generalPrompts ORDER BY RANDOM() LIMIT 1";
    stmt = env.PROMPTS.prepare(query);
  }

  const results = await stmt.run();

  if (results.results.length > 0) {
    return results.results[0];
  }
  return null;
}





// Cloudflare Worker fetch handler
export default {
  async scheduled(controller, env, ctx) {
  await sendPromptToAllChannels(env);
},
  fetch: router.fetch,
};

export { DEL_TIMEOUT } from './del_timeout.js';


