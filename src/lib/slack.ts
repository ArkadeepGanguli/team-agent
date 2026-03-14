import { App } from "@slack/bolt";

let slackApp: App | null = null;

function getSlackApp(): App | null {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET) {
    return null;
  }

  if (!slackApp) {
    slackApp = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET
    });
  }

  return slackApp;
}

export async function sendSlackMessage(userId: string, text: string) {
  const app = getSlackApp();
  if (!app) {
    return { success: false, error: "Slack credentials missing" };
  }

  try {
    const result = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: userId,
      text
    });

    return { success: true, ts: result.ts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}