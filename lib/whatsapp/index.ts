import type { WhatsAppProvider, WhatsAppSendResult } from '@/lib/whatsapp/provider';
import { EvolutionWhatsAppProvider } from '@/lib/whatsapp/providers/evolution';
import { ZApiWhatsAppProvider } from '@/lib/whatsapp/providers/zapi';

// Fallback final — nunca lança erro, sempre 'skipped'. As classes
// Evolution/Z-API já devolvem 'skipped' sozinhas quando faltam envs, então
// este Noop é redundante na prática, mas fica disponível para uso explícito
// (ex: testes, ou um WHATSAPP_PROVIDER desconhecido).
export class NoopWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'noop';

  async sendText(): Promise<WhatsAppSendResult> {
    return { status: 'skipped', reason: 'Nenhum provider de WhatsApp configurado' };
  }
}

export const noopWhatsAppProvider = new NoopWhatsAppProvider();

// Factory — nunca deixa o app quebrar por falta de credencial. As
// implementações concretas já tratam ausência de env var devolvendo
// 'skipped' em sendText().
export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = (process.env.WHATSAPP_PROVIDER || 'evolution').toLowerCase();

  if (provider === 'zapi') return new ZApiWhatsAppProvider();
  if (provider === 'evolution') return new EvolutionWhatsAppProvider();

  return noopWhatsAppProvider;
}

export * from '@/lib/whatsapp/provider';
