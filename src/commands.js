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
            "type": 3,
            "choices":[
              {
                "name": "option 1",
                "value": "animal_dog"
              },
              {
                "name": "option 2",
                "value": "animal_cat"
              }
            ],
            "required": False
        },
        {
            "name": "role",
            "description": "Get or edit permissions for a role",
            "type": 2,
            "options":[]
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
