import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de uso do Radar Milhas & Viagens.',
  alternates: { canonical: '/termos' },
  openGraph: {
    title: 'Termos de Uso — Radar Milhas & Viagens',
    description: 'Termos de uso do Radar Milhas & Viagens.',
    url: '/termos',
  },
};

export default function TermosPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-primary">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Termos de Uso</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: julho de 2026. Ao criar uma conta ou usar o Radar Milhas &amp;
          Viagens, você concorda com os termos abaixo.
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90 sm:text-base">
          <section>
            <h2 className="text-lg font-semibold sm:text-xl">1. Objeto do serviço</h2>
            <p className="mt-3 text-muted-foreground">
              O Radar Milhas &amp; Viagens (&ldquo;Radar&rdquo;, &ldquo;nós&rdquo;) é uma
              assinatura de comparação de preços e alertas de viagem. Nossa função é vigiar preços
              de passagens aéreas e hotéis — em dinheiro ou em pontos de programas de
              fidelidade — e notificar o usuário quando identificamos uma oportunidade dentro dos
              critérios que ele configurou.
            </p>
            <p className="mt-3 text-muted-foreground">
              <strong className="text-foreground">O Radar não é uma agência de viagens.</strong>{' '}
              Não vendemos passagens, não emitimos bilhetes, não fazemos reservas de hotel e não
              somos intermediários de nenhuma transação entre o usuário e companhias aéreas,
              hotéis, plataformas de reserva ou programas de fidelidade. Toda compra ou emissão é
              feita pelo próprio usuário, diretamente no site ou aplicativo oficial do fornecedor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">2. Conta e cadastro</h2>
            <p className="mt-3 text-muted-foreground">
              Para usar o Radar é necessário criar uma conta com e-mail válido. Você é responsável
              por manter a confidencialidade da sua senha e por todas as atividades realizadas na
              sua conta. Informações de perfil (aeroporto de origem, saldo de pontos informado,
              preferências de viagem) devem ser verdadeiras, pois são usadas para calcular
              recomendações — dados incorretos podem gerar recomendações imprecisas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">3. Planos e cobrança</h2>
            <p className="mt-3 text-muted-foreground">
              Oferecemos um plano gratuito com funcionalidades limitadas e planos pagos com
              cobrança recorrente mensal, processados via Stripe. Ao assinar um plano pago, você
              autoriza a cobrança automática do valor vigente na data de renovação, até que a
              assinatura seja cancelada.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Você pode cancelar sua assinatura a qualquer momento, direto no seu painel.</li>
              <li>
                O cancelamento interrompe as cobranças futuras, mas o acesso ao plano pago
                permanece ativo até o fim do período já pago.
              </li>
              <li>
                Não há reembolso proporcional de período já iniciado, salvo quando exigido pela
                legislação brasileira aplicável (por exemplo, direito de arrependimento em até 7
                dias após a primeira contratação, nos termos do Código de Defesa do Consumidor).
              </li>
              <li>Reajustes de preço, quando houver, serão comunicados com antecedência razoável.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">4. Uso aceitável</h2>
            <p className="mt-3 text-muted-foreground">Ao usar o Radar, você concorda em não:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Tentar acessar contas, dados ou funcionalidades de outros usuários;</li>
              <li>
                Utilizar engenharia reversa, raspagem automatizada (scraping) ou qualquer meio
                automatizado para extrair dados do serviço fora dos recursos oferecidos;
              </li>
              <li>Revender, redistribuir ou sublicenciar o acesso à plataforma sem autorização;</li>
              <li>
                Utilizar o serviço para fins ilícitos ou para violar direitos de terceiros,
                incluindo companhias aéreas, hotéis e programas de fidelidade.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">5. Limitação de responsabilidade</h2>
            <p className="mt-3 text-muted-foreground">
              As informações de preço, disponibilidade e pontuação exibidas no Radar têm caráter
              informativo e podem mudar a qualquer momento — inclusive entre o instante em que
              você recebe um alerta e o instante em que tenta concluir a compra no site oficial.
              Não garantimos:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>A disponibilidade de qualquer preço, tarifa ou classe promocional exibida;</li>
              <li>Que a compra ou emissão será concluída com sucesso pelo fornecedor;</li>
              <li>A precisão contínua de valores, taxas e regras de programas de pontos, que são definidos por terceiros;</li>
              <li>Resultado financeiro específico decorrente do uso das recomendações do Radar.</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              Veja também nosso{' '}
              <Link href="/aviso-precos" className="font-medium text-primary underline underline-offset-4">
                Aviso de Não Garantia de Preço
              </Link>
              . Na máxima extensão permitida pela lei, o Radar não se responsabiliza por perdas
              decorrentes de decisões de compra tomadas com base nas informações da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">6. Propriedade intelectual</h2>
            <p className="mt-3 text-muted-foreground">
              A marca, o layout, o código, os textos e a lógica de cálculo de score do Radar são
              de nossa propriedade ou de nossos licenciadores e são protegidos por lei. Você recebe
              uma licença limitada, pessoal e não exclusiva para usar a plataforma conforme estes
              termos — nenhuma outra licença é concedida.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">7. Alterações nestes termos</h2>
            <p className="mt-3 text-muted-foreground">
              Podemos atualizar estes Termos de Uso periodicamente para refletir mudanças no
              serviço ou na legislação. Alterações relevantes serão comunicadas por e-mail ou
              aviso na plataforma. O uso continuado do Radar após uma alteração significa
              concordância com os novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">8. Contato</h2>
            <p className="mt-3 text-muted-foreground">
              Dúvidas sobre estes termos podem ser enviadas para nosso canal de suporte indicado
              dentro da plataforma, na área de perfil da sua conta.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
