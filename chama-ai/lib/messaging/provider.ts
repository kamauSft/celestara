export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsProvider {
  sendSms(message: SmsMessage): Promise<{ providerMessageId: string }>;
}

export type MessagingProvider = SmsProvider;

export class MemoryMessagingProvider implements SmsProvider {
  readonly sent: SmsMessage[] = [];

  async sendSms(message: SmsMessage): Promise<{ providerMessageId: string }> {
    this.sent.push(message);
    return { providerMessageId: `mem_${this.sent.length}` };
  }
}

/** Logs the code on the server. The login screen shows it only in demo mode. */
export class DevSmsProvider extends MemoryMessagingProvider {
  override async sendSms(message: SmsMessage): Promise<{ providerMessageId: string }> {
    const result = await super.sendSms(message);
    if (process.env.NODE_ENV !== "test") {
      console.info(`[Smart Kikapu demo SMS] to ${message.to}: ${message.body}`);
    }
    return result;
  }
}

export const devMessaging = new DevSmsProvider();
