/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

export const INVITE_COMMAND = {
  name: 'invite',
  description: 'Get an invite link to add the bot to your server',
};

export const PROMPT_COMMAND = {
  name: 'prompt',
  description: 'Get a random writing prompt',
  "options": [
      {
            "name": "genre",
            "description": "Which genre tag should the writing prompt contain?",
            "type": 2, // 2 is type SUB_COMMAND_GROUP
            "options":[
              {
                "name": "option 1"
              },
              {
                "name": "option 2"
              }
            ],
            "required": False
        },
        {
            "name": "role",
            "description": "Get or edit permissions for a role",
            "type": 2
        }
    ]
};

export const CHANNEL_COMMAND = {
  name: 'setchannel',
  description: 'Set weekly prompt channel',
};

export const TEST_COMMAND = {
    "name": "permissions",
    "description": "Get or edit permissions for a user or a role",
}
