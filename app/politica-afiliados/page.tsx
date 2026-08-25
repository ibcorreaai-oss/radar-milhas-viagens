import type { Metadata } from 'next';
import { Tag } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Política de Afiliados',
  description: 'Como funcionam os links de afiliado exibidos no Radar Milhas & Viagens.',
};

export default function PoliticaAfiliadosPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-primary">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Política de Afiliados
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: julho de 2026. Transparência sobre como o Radar Milhas &amp; Viagens
          pode ganhar comissão por indicação — e por que isso nunca muda o que recomendamos.
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90 sm:text-base">
          <section>
            <h2 className="text-lg font-semibold sm:text-xl">1. O que são links de afiliado</h2>
            <p className="mt-3 text-muted-foreground">
              Algumas oportunidades, promoções e parceiros exibidos na plataforma podem conter
              links de afiliado — links rastreados que, quando você clica e realiza uma ação (como
              contratar um serviço ou fazer uma compra), podem gerar uma comissão para o Radar
              Milhas &amp; Viagens, paga pelo parceiro. Isso pode acontecer, por exemplo, em
              indicações relacionadas a:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Reservas de hospedagem (ex.: Booking.com);</li>
              <li>Seguros de viagem;</li>
              <li>Chip internacional / e-SIM;</li>
              <li>Cartões de crédito com programas de pontos;</li>
              <li>Clubes de assinatura de pontos e milhas;</li>
              <li>Compra de pontos e milhas junto a programas ou plataformas parceiras;</li>
              <li>Aluguel de carro;</li>
              <li>Plataformas de cashback;</li>
              <li>Serviços de consultoria de emissão de passagens por terceiros.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">2. Sem custo adicional para você</h2>
            <p className="mt-3 text-muted-foreground">
              O uso de um link de afiliado não altera o preço que você paga ao parceiro. A
              comissão, quando existe, é paga pelo parceiro ao Radar como forma de remunerar a
              indicação — não é um valor somado à sua compra.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">
              3. Comissão não influencia recomendação
            </h2>
            <p className="mt-3 text-muted-foreground">
              Esta é a regra mais importante desta política:{' '}
              <strong className="text-foreground">
                o score e a recomendação calculados pelo nosso motor de oportunidades
                (OpportunityEngine) são sempre baseados em dados — preço, taxas, valor do
                milheiro, flexibilidade de datas e urgência — nunca em comissão de afiliado.
              </strong>{' '}
              Um parceiro pagar comissão maior ou menor não faz com que uma oportunidade suba ou
              desça no ranking, nem muda a classificação (imperdível, excelente, bom, normal ou
              não recomendado) atribuída a ela.
            </p>
            <p className="mt-3 text-muted-foreground">
              Oportunidades sem nenhum vínculo de afiliado são exibidas e pontuadas exatamente com
              os mesmos critérios que as demais.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
              <Tag className="h-4 w-4 text-primary" />
              4. Como identificar um link de afiliado
            </h2>
            <p className="mt-3 text-muted-foreground">
              Sempre que uma oportunidade ou promoção exibida na plataforma contiver um link de
              afiliado, ela traz uma indicação visual de parceria próxima ao link ou botão de
              acesso. Se tiver dúvida sobre se um link específico é de afiliado, você pode
              perguntar pelo canal de suporte dentro da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">5. Responsabilidade sobre o parceiro</h2>
            <p className="mt-3 text-muted-foreground">
              O Radar não é parte na relação entre você e o parceiro afiliado. Preço, condições,
              disponibilidade, política de cancelamento e atendimento de qualquer serviço
              contratado através de um link de afiliado são de responsabilidade exclusiva do
              parceiro — confirme sempre as condições diretamente com ele antes de contratar.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
