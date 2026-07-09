import type { WhatsAppProvider, WhatsAppSendResult } from '@/lib/whatsapp/provider';

// Provider Z-API. Sem ZAPI_INSTANCE_ID/ZAPI_TOKEN configurados, sendText
// devolve 'skipped' — nunca lança exceção (WhatsApp fica abstrato no MVP,
// ver PROMPT.md §0.5).
export class ZApiWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'zapi';

  private readonly instanceId: string | undefined;
  private readonly token: string | undefined;

  constructor() {
    this.instanceId = process.env.ZAPI_INSTANCE_ID;
    this.token = process.env.ZAPI_TOKEN;
  }

  async sendText(to: string, message: string): Promise<WhatsAppSendResult> {
    if (!this.instanceId || !this.token) {
      return { status: 'skipped', reason: 'Z-API não configurada' };
    }

    try {
      const url = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}/send-text`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: to, message }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return { status: 'failed', reason: `Z-API respondeu ${response.status}: ${body}` };
      }

      return { status: 'sent' };
    } catch (err) {
      return { status: 'failed', reason: String(err) };
    }
  }
}
