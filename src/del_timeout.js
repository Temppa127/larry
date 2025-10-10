import server from "./server";

export class DEL_TIMEOUT {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const { interactionToken, applicationId, userId } = await request.json();

    await this.state.storage.put("interactionToken", interactionToken);
    await this.state.storage.put("applicationId", applicationId);
    await this.state.storage.put("userId", userId);

    this.state.storage.setAlarm(Date.now() + 30_000);

    return new Response("Alarm set.");
  }

  async cancel() {
    this.state.storage.deleteAlarm();

    const interactionToken = await this.state.storage.get("interactionToken");
    const applicationId = await this.state.storage.get("applicationId");
    const userId = await this.state.storage.get("userId");
    
    await server.clearDelBuffer(userId)

    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;


    await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bot ${this.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

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
    await server.clearDelBuffer(userId)
    await this.state.storage.deleteAll();
  }
}