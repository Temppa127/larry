import { clearDelBuffer } from "./utils.js";

export class DEL_TIMEOUT {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    console.log("Pathname " + pathname)

    const { interactionToken, applicationId, userId } = await request.json();
    if (pathname === "/cancel") {
      console.log("Going into cancel")
      return await this.cancel(interactionToken, applicationId, userId);
    }

    await this.state.storage.put("interactionToken", interactionToken);
    await this.state.storage.put("applicationId", applicationId);
    await this.state.storage.put("userId", userId);

    console.log("Token1 " + interactionToken)
    console.log("Appid1 " + applicationId)
    console.log("User1 " + userId)
   

    this.state.storage.setAlarm(Date.now() + 30_000);

    return new Response("Alarm set.");
  }

  async cancel() { 
  
    console.log("In cancel")
    const interactionToken = await this.state.storage.get("interactionToken");
    const applicationId = await this.state.storage.get("applicationId");
    const userId = await this.state.storage.get("userId");
    
    console.log("Token2 " + interactionToken)
    console.log("Appid2 " + applicationId)
    console.log("User2 " + userId)


    await clearDelBuffer(this.env, userId)

    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;

    console.log("Cancel 1")
    await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `Bot ${this.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: "Interaction finished",
      })
    });
    console.log("Cancel 2")
    await this.state.storage.deleteAlarm();
    await this.state.storage.deleteAll();
    console.log("Cancel 3") 
    return new Response("Cancelled");
  }

  async alarm() {
    const interactionToken = await this.state.storage.get("interactionToken");
    const applicationId = await this.state.storage.get("applicationId");
    const userId = await this.state.storage.get("userId");

    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;

    const disabledComponents = [
      {
        type: 1,
        components: [
          {
            type: 2,
            label: "Yes",
            style: 3,
            custom_id: "confirm_delete",
            disabled: true
          },
          {
            type: 2,
            label: "No",
            style: 4,
            custom_id: "cancel_delete",
            disabled: true
          }
        ]
      }
    ];
  

    await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `Bot ${this.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: "Prompt deletion timed out.",
        components: disabledComponents,
      })
    });

    clearDelBuffer(this.env, userId)
    await this.state.storage.deleteAll();
  }
}