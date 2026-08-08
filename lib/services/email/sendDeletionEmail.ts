import { getSendgridClient } from "@/services/email/sendgrid";

const FROM_ADDRESS = "noreply@busybee.app";

export const sendDeletionEmail = async (email: string, url: string): Promise<void> => {
  // TODO: swap in real SendGrid call once SENDGRID_API_KEY exists
  // await getSendgridClient().send({
  //   to: email,
  //   from: FROM_ADDRESS,
  //   subject: "Confirm your busybee account deletion",
  //   text: `Tap to confirm deletion of your busybee account: ${url}\n\nThis link expires in 45 minutes. If you didn't request this, you can ignore this email.`,
  // });
  console.log(url);
};
