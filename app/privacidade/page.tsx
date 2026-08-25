import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como o Radar Milhas & Viagens coleta, usa e protege seus dados pessoais.',
};

export default function PrivacidadePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-primary">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: julho de 2026. Esta política explica como tratamos seus dados
          pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90 sm:text-base">
          <section>
            <h2 className="text-lg font-semibold sm:text-xl">1. Quais dados coletamos</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Dados de cadastro:</strong> nome, e-mail,
                telefone (quando informado) e senha (armazenada de forma criptografada).
              </li>
              <li>
                <strong className="text-foreground">Preferências de viagem:</strong> aeroporto de
                origem, destinos favoritos, classe de cabine preferida, orçamento mensal e
                flexibilidade de datas.
              </li>
              <li>
                <strong className="text-foreground">Programas e saldo de pontos:</strong> os
                programas de fidelidade que você participa e o saldo de pontos que você mesmo
                informa — não temos acesso direto à sua conta em nenhum programa de milhas.
              </li>
              <li>
                <strong className="text-foreground">Dados de uso:</strong> buscas realizadas,
                alertas criados, páginas acessadas e interações com a plataforma.
              </li>
              <li>
                <strong className="text-foreground">Dados de pagamento:</strong> processados
                diretamente pelo Stripe — não armazenamos número de cartão de crédito em nossos
                servidores.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">2. Para que usamos seus dados</h2>
            <p className="mt-3 text-muted-foreground">Usamos os dados coletados para:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Gerar buscas, cálculos de score e recomendações personalizadas;</li>
              <li>Disparar alertas de oportunidade por e-mail ou WhatsApp, conforme sua configuração;</li>
              <li>Processar pagamentos e gerenciar sua assinatura;</li>
              <li>Melhorar a plataforma e a precisão das recomendações;</li>
              <li>Cumprir obrigações legais e responder a solicitações das autoridades competentes.</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              Não usamos seus dados para tomar decisões que afetem terceiros nem os utilizamos
              para finalidade incompatível com as descritas acima sem seu consentimento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">3. Com quem compartilhamos dados</h2>
            <p className="mt-3 text-muted-foreground">
              <strong className="text-foreground">Nós não vendemos seus dados.</strong>{' '}
              Compartilhamos informações apenas com operadores que nos ajudam a prestar o serviço,
              sempre limitado ao necessário para a finalidade de cada um:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Stripe</strong> — processamento de pagamentos
                e gestão de assinaturas;
              </li>
              <li>
                <strong className="text-foreground">Resend</strong> — envio de e-mails
                transacionais e de alerta;
              </li>
              <li>
                <strong className="text-foreground">Evolution API / Z-API</strong> — envio de
                alertas por WhatsApp, quando você ativa esse canal;
              </li>
              <li>
                <strong className="text-foreground">Provedores de infraestrutura</strong> (hospedagem
                e banco de dados) — necessários para o funcionamento técnico da plataforma.
              </li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              Esses parceiros atuam como operadores de dados, seguindo nossas instruções e as
              exigências da LGPD, e não estão autorizados a usar seus dados para finalidade
              própria.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">4. Seus direitos como titular</h2>
            <p className="mt-3 text-muted-foreground">
              Nos termos da LGPD, você pode a qualquer momento solicitar:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Confirmação de que tratamos seus dados e acesso a eles;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Exclusão dos seus dados pessoais (ressalvadas obrigações legais de retenção);</li>
              <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
              <li>Revogação do consentimento e informação sobre com quem compartilhamos seus dados.</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              Para exercer qualquer um desses direitos, use o canal de suporte disponível na área
              de perfil da sua conta ou o contato do encarregado indicado abaixo. Respondemos a
              solicitações dentro do prazo legal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">5. Retenção de dados</h2>
            <p className="mt-3 text-muted-foreground">
              Mantemos seus dados enquanto sua conta estiver ativa e pelo período adicional
              necessário para cumprir obrigações legais, fiscais ou regulatórias (por exemplo,
              registros de cobrança). Ao solicitar a exclusão da conta, removemos ou anonimizamos
              os dados que não precisam ser retidos por lei.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">6. Cookies</h2>
            <p className="mt-3 text-muted-foreground">
              Usamos cookies essenciais para manter sua sessão autenticada e cookies de
              desempenho para entender como a plataforma é usada e melhorá-la. Você pode gerenciar
              cookies não essenciais nas configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold sm:text-xl">7. Contato do encarregado (DPO)</h2>
            <p className="mt-3 text-muted-foreground">
              Para questões relacionadas à proteção de dados pessoais, entre em contato pelo canal
              de suporte disponível dentro da plataforma, na área de perfil da sua conta,
              informando o assunto como &ldquo;Privacidade de dados&rdquo;.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
