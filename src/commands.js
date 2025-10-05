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
  type: 1,
  "options": [
      {
        "name": "genre",
        "description": "Which genre tag should the writing prompt have?",
        "type": 3,
        "required": false,
        "autocomplete": true
      },
      {
        "name": "id",
        "description": "Which ID should the writing prompt have?",
        "type": 4,
        "required": false
      }
    ]
};

export const PROMPT_DELETE_COMMAND = {
  name: 'delete',
  description: 'Delete a prompt',
  type: 1,
  "options": [
      {
        "name": "id",
        "description": "ID of the writing prompt you wish to delete",
        "type": 4,
        "required": true
      }
    ]
};

export const PROMPT_ADD_COMMAND = {
  name: 'add',
  description: 'Add a prompt',
  type: 1,
  "options": [
      {
        "name": "content",
        "description": "Main text of the prompt",
        "type": 3,
        "required": true
      },
      {
        "name": "genres",
        "description": "List of genres, separated by commas",
        "type": 3,
        "required": true
      },
      {
        "name": "id",
        "description": "ID of the writing prompt (automatically assigned if left blank!)",
        "type": 4,
        "required": false
      },
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
