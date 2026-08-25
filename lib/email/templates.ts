// Templates de e-mail — funções puras que devolvem { subject, html } em
// pt-BR. HTML simples com estilos inline (sem framework de e-mail), sempre
// com o rodapé padrão de aviso de preços.

export interface EmailTemplate {
  subject: string;
  html: string;
}

const BRAND_COLOR = '#0f766e';
const TEXT_COLOR = '#1f2937';
const MUTED_COLOR = '#6b7280';

function layout(params: { preheader?: string; title: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }): string {
  const { preheader, title, bodyHtml, ctaLabel, ctaUrl } = params;
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
            <tr>
              <td style="background-color:${BRAND_COLOR};padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">Radar Milhas &amp; Viagens</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:${TEXT_COLOR};font-size:15px;line-height:1.6;">
                <h1 style="font-size:20px;margin:0 0 16px 0;color:${TEXT_COLOR};">${escapeHtml(title)}</h1>
                ${bodyHtml}
                ${
                  ctaLabel && ctaUrl
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0 0;">
                        <tr>
                          <td style="border-radius:6px;background-color:${BRAND_COLOR};">
                            <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;">${escapeHtml(ctaLabel)}</a>
                          </td>
                        </tr>
                      </table>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;color:${MUTED_COLOR};font-size:12px;line-height:1.5;">
                  Radar Milhas &amp; Viagens — preços e disponibilidade podem mudar, confirme antes de comprar.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

export function welcomeEmail(name: string): EmailTemplate {
  const firstName = name.trim().split(' ')[0] || 'viajante';
  return {
    subject: `Bem-vindo(a) ao Radar Milhas & Viagens, ${firstName}!`,
    html: layout({
      title: `Bem-vindo(a), ${escapeHtml(firstName)}!`,
      preheader: 'Sua conta foi criada — hora de configurar seu primeiro alerta.',
      bodyHtml: `
        <p>Sua conta no Radar Milhas &amp; Viagens foi criada com sucesso.</p>
        <p>A partir de agora nós vigiamos preços de passagem e hotel por você — em dinheiro ou em pontos — e avisamos só quando vale a pena.</p>
        <p>Para começar, configure um alerta com sua rota ou destino favorito e deixe o resto com a gente.</p>
      `,
      ctaLabel: 'Criar meu primeiro alerta',
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/alertas`,
    }),
  };
}

export function alertFoundEmail(params: {
  alertName: string;
  routeOrCity: string;
  cashPrice: number | null;
  pointsPrice: number | null;
  taxes: number;
  program: string | null;
  score: number;
  recommendationText: string;
  detailsUrl: string;
}): EmailTemplate {
  const { alertName, routeOrCity, cashPrice, pointsPrice, taxes, program, score, recommendationText, detailsUrl } = params;

  const priceLines: string[] = [];
  if (cashPrice != null) {
    priceLines.push(`<li>Preço em dinheiro: <strong>R$ ${cashPrice.toFixed(2)}</strong></li>`);
  }
  if (pointsPrice != null) {
    priceLines.push(
      `<li>Preço em pontos: <strong>${pointsPrice.toLocaleString('pt-BR')} pontos</strong>${program ? ` (${escapeHtml(program)})` : ''} + R$ ${taxes.toFixed(2)} de taxas</li>`
    );
  }

  return {
    subject: `Encontramos algo para o seu alerta "${alertName}" (score ${score})`,
    html: layout({
      title: `Oportunidade encontrada: ${escapeHtml(alertName)}`,
      preheader: `${routeOrCity} — score ${score}/100`,
      bodyHtml: `
        <p>Seu alerta <strong>${escapeHtml(alertName)}</strong> (${escapeHtml(routeOrCity)}) encontrou uma oportunidade com score <strong>${score}/100</strong>.</p>
        <ul style="padding-left:18px;margin:16px 0;">
          ${priceLines.join('')}
        </ul>
        <p style="background-color:#f0fdfa;border-left:3px solid ${BRAND_COLOR};padding:12px 16px;border-radius:4px;">${escapeHtml(recommendationText)}</p>
      `,
      ctaLabel: 'Ver detalhes',
      ctaUrl: detailsUrl,
    }),
  };
}

export function newPromotionEmail(params: { title: string; bonusPercentage: number | null; program: string | null; url: string | null }): EmailTemplate {
  const { title, bonusPercentage, program, url } = params;
  return {
    subject: `Nova promoção: ${title}`,
    html: layout({
      title: `Nova promoção: ${escapeHtml(title)}`,
      preheader: program ? `Programa ${program}` : undefined,
      bodyHtml: `
        <p>Uma nova promoção acabou de ser cadastrada${program ? ` para o programa <strong>${escapeHtml(program)}</strong>` : ''}.</p>
        ${bonusPercentage != null ? `<p>Bônus: <strong>${bonusPercentage}%</strong></p>` : ''}
        <p>Confira as regras antes de aproveitar — promoções costumam ter prazo curto.</p>
      `,
      ctaLabel: url ? 'Ver promoção' : undefined,
      ctaUrl: url ?? undefined,
    }),
  };
}

export function subscriptionActiveEmail(params: { planName: string }): EmailTemplate {
  const { planName } = params;
  return {
    subject: `Sua assinatura ${planName} está ativa`,
    html: layout({
      title: `Assinatura ${escapeHtml(planName)} ativada`,
      bodyHtml: `
        <p>Sua assinatura do plano <strong>${escapeHtml(planName)}</strong> foi ativada com sucesso.</p>
        <p>Agora você tem acesso a todos os benefícios do plano, incluindo alertas e buscas ampliadas.</p>
      `,
      ctaLabel: 'Ir para o painel',
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard`,
    }),
  };
}

export function trialEndingEmail(params: { daysLeft: number }): EmailTemplate {
  const { daysLeft } = params;
  const diasTexto = daysLeft === 1 ? '1 dia' : `${daysLeft} dias`;
  return {
    subject: `Seu período de teste termina em ${diasTexto}`,
    html: layout({
      title: `Seu teste termina em ${diasTexto}`,
      bodyHtml: `
        <p>Seu período de teste gratuito termina em <strong>${diasTexto}</strong>.</p>
        <p>Para continuar recebendo alertas e usando os recursos do plano, confirme sua forma de pagamento.</p>
      `,
      ctaLabel: 'Gerenciar assinatura',
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/assinatura`,
    }),
  };
}

export function opportunityExpiredEmail(params: { title: string }): EmailTemplate {
  const { title } = params;
  return {
    subject: `Oportunidade expirada: ${title}`,
    html: layout({
      title: `Essa oportunidade expirou`,
      bodyHtml: `
        <p>A oportunidade <strong>${escapeHtml(title)}</strong> que você acompanhava expirou e não está mais disponível.</p>
        <p>Fique de olho — sempre há novas oportunidades chegando.</p>
      `,
      ctaLabel: 'Ver outras oportunidades',
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard`,
    }),
  };
}

// Disparado quando uma assinatura paga é cancelada de vez (Stripe
// customer.subscription.deleted) — ver ETAPA 7 (comercialização) e
// GROWTH.md. Recuperação de assinante cancelado: lembra o que ele perde e
// convida a voltar, sem ser insistente (um e-mail só, não uma sequência).
export function winBackEmail(params: { planName: string }): EmailTemplate {
  const { planName } = params;
  return {
    subject: `Sentimos sua falta no ${planName}`,
    html: layout({
      title: `Sua assinatura ${escapeHtml(planName)} foi cancelada`,
      preheader: 'Você pode voltar quando quiser — seus dados continuam aqui.',
      bodyHtml: `
        <p>Sua assinatura do plano <strong>${escapeHtml(planName)}</strong> foi cancelada e você
        voltou pro plano Free.</p>
        <p>Isso significa que você deixou de receber alertas ilimitados, comparação avançada de
        dinheiro vs pontos e os canais extras do seu plano — mas seus alertas, favoritos e
        histórico continuam salvos, prontos pra quando você quiser voltar.</p>
        <p>Se cancelou por algum problema específico (preço, funcionalidade, bug), responda este
        e-mail — a gente lê de verdade.</p>
      `,
      ctaLabel: 'Ver planos',
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/assinatura`,
    }),
  };
}

// Alerta operacional interno (lib/alerts/notify-ops.ts) — não é e-mail pra
// usuário do clube, é pro Igor quando algo crítico acontece no sistema
// (falha de pagamento, falha sistêmica de autenticação, erro não tratado).
export function opsAlertEmail(params: {
  category: string;
  message: string;
  fields?: Record<string, unknown>;
}): EmailTemplate {
  const { category, message, fields } = params;
  const fieldsHtml =
    fields && Object.keys(fields).length > 0
      ? `<pre style="background:#f4f4f5;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;white-space:pre-wrap;">${escapeHtml(
          JSON.stringify(fields, null, 2)
        )}</pre>`
      : '';

  return {
    subject: `[Radar Milhas] Alerta crítico — ${category}`,
    html: layout({
      title: `Alerta crítico: ${escapeHtml(category)}`,
      preheader: message,
      bodyHtml: `
        <p><strong>${escapeHtml(message)}</strong></p>
        ${fieldsHtml}
        <p style="color:${MUTED_COLOR};font-size:13px;">Categoria: ${escapeHtml(category)} · ${new Date().toLocaleString('pt-BR')}</p>
      `,
    }),
  };
}
