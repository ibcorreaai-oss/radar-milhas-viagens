// Interface abstrata de provider de WhatsApp — o app nunca depende
// diretamente de Evolution API ou Z-API, só desta interface. Sem credencial
// configurada, a implementação concreta deve devolver 'skipped', nunca
// lançar exceção.

export type WhatsAppSendStatus = 'sent' | 'failed' | 'skipped';

export interface WhatsAppSendResult {
  status: WhatsAppSendStatus;
  reason?: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendText(to: string, message: string): Promise<WhatsAppSendResult>;
}
