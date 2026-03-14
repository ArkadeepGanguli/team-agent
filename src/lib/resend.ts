import { Resend } from "resend";

export async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY missing" };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: "TeamAgent <onboarding@resend.dev>",
      to,
      subject,
      text: body
    });

    return { success: true, id: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
