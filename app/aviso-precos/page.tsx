import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Aviso de Não Garantia de Preço — Radar Milhas & Viagens',
  description:
    'Preços, pontos e disponibilidade podem mudar rapidamente. Entenda por que o Radar Milhas & Viagens não garante preço ou disponibilidade.',
};

export default function AvisoPrecosPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-primary">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Aviso de Não Garantia de Preço
        </h1>

        <Card className="mt-8 border-warning/40 bg-warning/10">
          <CardContent className="flex gap-4 p-6">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-warning" />
            <p className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
              Preços, pontos e disponibilidade podem mudar rapidamente. O Radar Milhas &amp;
              Viagens não garante disponibilidade, emissão ou manutenção dos valores exibidos.
              Sempre confirme no site oficial da companhia, hotel ou parceiro antes de comprar ou
              emitir.
            </p>
          </CardContent>
        </Card>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-foreground/90 sm:text-base">
          <p className="text-muted-foreground">
            Sabemos que ver um preço no Radar e não conseguir o mesmo valor na hora de comprar é
            frustrante. Isso acontece por três motivos que fogem do nosso controle:
          </p>

          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-foreground">Tarifas dinâmicas</h2>
              <p className="mt-1 text-muted-foreground">
                Companhias aéreas, hotéis e programas de fidelidade ajustam preços em tempo real,
                muitas vezes a cada poucos minutos, com base em demanda, ocupação e outros
                fatores internos ao fornecedor. O valor que capturamos em uma verificação pode já
                ter mudado quando você acessa o site oficial.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Assentos e quartos limitados em classes promocionais</h2>
              <p className="mt-1 text-muted-foreground">
                Tarifas promocionais e resgates com pontos geralmente têm um número muito pequeno
                de assentos ou quartos disponíveis. Uma oportunidade pode se esgotar em minutos,
                mesmo que ainda apareça como disponível em nossa última verificação.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Pontos sujeitos à disponibilidade do programa</h2>
              <p className="mt-1 text-muted-foreground">
                Resgates em pontos dependem diretamente das regras e do estoque de assentos ou
                diárias que cada programa de fidelidade libera para resgate — regras que os
                próprios programas podem alterar sem aviso prévio.
              </p>
            </div>
          </div>

          <p className="text-muted-foreground">
            Por isso, reforçamos: o Radar Milhas &amp; Viagens é uma ferramenta de comparação e
            alerta — não uma garantia de compra, reserva ou emissão. Nosso papel é ajudar você a
            identificar quando uma oportunidade parece boa e explicar por quê; a confirmação final
            de preço, disponibilidade e condições é sempre feita por você, diretamente no site ou
            aplicativo oficial do fornecedor, antes de qualquer pagamento ou emissão.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
