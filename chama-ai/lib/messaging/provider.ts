export interface SmsMessage {
  to: string;
  body: string;
}

export interface MessagingProvider {
  sendSms(message: SmsMessage): Promise<{ providerMessageId: string }>;
}

export class MemoryMessagingProvider implements MessagingProvider {
  readonly sent: SmsMessage[] = [];

  async sendSms(message: SmsMessage): Promise<{ providerMessageId: string }> {
    this.sent.push(message);
    return { providerMessageId: `mem_${this.sent.length}` };
  }
}

export const devMessaging = new MemoryMessagingProvider();
