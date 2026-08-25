import type { WhatsAppProvider, WhatsAppSendResult } from '@/lib/whatsapp/provider';
import { logger } from '@/lib/logger';

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
        const reason = `Z-API respondeu ${response.status}: ${body}`;
        logger.error('integration', 'Falha ao enviar WhatsApp via Z-API', { status: response.status, reason });
        return { status: 'failed', reason };
      }

      logger.info('integration', 'WhatsApp enviado via Z-API');
      return { status: 'sent' };
    } catch (err) {
      const reason = String(err);
      logger.error('integration', 'Exceção ao enviar WhatsApp via Z-API', { reason });
      return { status: 'failed', reason };
    }
  }
}
