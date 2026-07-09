import type { WhatsAppProvider, WhatsAppSendResult } from '@/lib/whatsapp/provider';

// Provider Evolution API. Sem EVOLUTION_API_URL/API_KEY/INSTANCE configurados,
// sendText devolve 'skipped' — nunca lança exceção (WhatsApp fica abstrato
// no MVP, ver PROMPT.md §0.5).
export class EvolutionWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'evolution';

  private readonly apiUrl: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly instance: string | undefined;

  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.instance = process.env.EVOLUTION_INSTANCE;
  }

  async sendText(to: string, message: string): Promise<WhatsAppSendResult> {
    if (!this.apiUrl || !this.apiKey || !this.instance) {
      return { status: 'skipped', reason: 'Evolution API não configurada' };
    }

    try {
      const url = `${this.apiUrl.replace(/\/$/, '')}/message/sendText/${this.instance}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({ number: to, text: message }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return { status: 'failed', reason: `Evolution API respondeu ${response.status}: ${body}` };
      }

      return { status: 'sent' };
    } catch (err) {
      return { status: 'failed', reason: String(err) };
    }
  }
}
