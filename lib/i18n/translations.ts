// Traduções da página inicial (ETAPA 12). Escopo deliberadamente limitado à
// home: o site logado (34 telas) segue só em pt-BR — traduzir tudo exigiria
// i18n de rotas do Next (next-intl ou similar) e tocaria praticamente todo
// arquivo do app, um projeto à parte. Aqui é troca de texto client-side via
// Context, só na home, pra visitante decidir o idioma antes de criar conta.
export type Locale = 'pt-BR' | 'en' | 'fr' | 'es';

export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'PT',
  en: 'EN',
  fr: 'FR',
  es: 'ES',
};

export const LOCALE_NAMES: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
  fr: 'Français',
  es: 'Español',
};

export interface HomeDictionary {
  nav: { comoFunciona: string; precos: string; termos: string; contato: string; entrar: string; criarConta: string };
  hero: { badge: string; title: string; subtitle: string; freeNote: string; verPlanos: string };
  steps: {
    title: string;
    subtitle: string;
    items: Array<{ step: string; title: string; description: string }>;
  };
  question: { quote: string; body: string };
  features: {
    title: string;
    subtitle: string;
    items: Array<{ title: string; description: string }>;
  };
  pricing: {
    title: string;
    subtitle: string;
    ilimitadas: string;
    buscasPorDia: (n: number) => string;
    maisEscolhido: string;
    comecar: string;
  };
  trust: { items: Array<{ title: string; description: string }> };
  finalCta: { title: string; subtitle: string; criarConta: string; falarComAGente: string };
  legal: { text: string; link: string };
}

export const HOME_DICTIONARIES: Record<Locale, HomeDictionary> = {
  'pt-BR': {
    nav: {
      comoFunciona: 'Como funciona',
      precos: 'Preços',
      termos: 'Termos',
      contato: 'Contato',
      entrar: 'Entrar',
      criarConta: 'Criar conta grátis',
    },
    hero: {
      badge: 'Clube de alertas de viagem com IA',
      title: 'Viaje mais. Pague menos.',
      subtitle:
        'A inteligência que monitora preços, pontos e milhas e avisa quando aparece uma oportunidade de verdade — em dinheiro ou em pontos. Sem planilha, sem grupo de WhatsApp, sem virar expert em milhas.',
      freeNote: 'Grátis para começar. Sem cartão de crédito.',
      verPlanos: 'Ver planos',
    },
    steps: {
      title: 'Como funciona',
      subtitle: 'Quatro passos entre criar sua conta e parar de perder tempo comparando preço na mão.',
      items: [
        {
          step: 'Passo 1',
          title: 'Conte suas preferências',
          description:
            'Aeroporto de origem, destinos favoritos, orçamento e os programas de pontos que você já tem — Livelo, Esfera, Smiles, LATAM Pass e outros.',
        },
        {
          step: 'Passo 2',
          title: 'O radar compara dinheiro vs. pontos',
          description:
            'A cada verificação, cruzamos o preço em dinheiro com o custo real de usar (ou comprar) pontos e calculamos o que realmente vale mais a pena.',
        },
        {
          step: 'Passo 3',
          title: 'Você recebe alerta só quando vale a pena',
          description:
            'Nada de notificação toda hora. O alerta chega por e-mail (ou WhatsApp, nos planos superiores) apenas quando a oportunidade passa no nosso score.',
        },
        {
          step: 'Passo 4',
          title: 'Decida com confiança',
          description:
            'Você recebe a recomendação em texto simples — pagar em dinheiro, usar pontos, transferir com bônus ou esperar — e confirma a compra direto no site oficial.',
        },
      ],
    },
    question: {
      quote:
        '"Nesta viagem, vale mais a pena pagar em dinheiro, usar pontos, transferir pontos, comprar pontos ou esperar promoção?"',
      body: 'É essa a pergunta que qualquer pessoa que acumula pontos se faz na hora de comprar uma passagem. O Radar responde automaticamente, com um score de 0 a 100 e uma recomendação em texto simples — sem você precisar entender de milheiro, bônus de transferência ou classe promocional.',
    },
    features: {
      title: 'Tudo que você precisa para decidir bem',
      subtitle: 'Uma central única para pesquisar, comparar e ser avisado — em vez de dez abas abertas.',
      items: [
        { title: 'Busca de voos', description: 'Compare preços em dinheiro e em pontos para as rotas que você mais usa.' },
        { title: 'Busca de hotéis', description: 'Veja diárias em dinheiro ou pontos, com café da manhã e política de cancelamento.' },
        { title: 'Calculadora de pontos', description: 'Descubra o valor real do seu milheiro e se vale a pena resgatar, comprar ou esperar.' },
        { title: 'Alertas inteligentes', description: 'Monitoramento contínuo por e-mail ou WhatsApp, avisando só quando o preço cai de verdade.' },
        { title: 'Promoções selecionadas', description: 'Transferências bonificadas, compra de pontos e passagens em promoção, com curadoria.' },
        { title: 'Consultor IA', description: 'Tire dúvidas sobre a melhor forma de usar seus pontos em uma conversa, sem jargão técnico.' },
      ],
    },
    pricing: {
      title: 'Planos para cada tipo de viajante',
      subtitle: 'Comece de graça. Faça upgrade quando quiser mais alertas, WhatsApp e a IA consultora.',
      ilimitadas: 'Buscas ilimitadas',
      buscasPorDia: (n) => `${n} ${n === 1 ? 'busca' : 'buscas'} por dia`,
      maisEscolhido: 'Mais escolhido',
      comecar: 'Começar',
    },
    trust: {
      items: [
        { title: 'Sem letra miúda', description: 'Planos claros, sem taxa escondida e sem pegadinha de contrato.' },
        { title: 'Cancele quando quiser', description: 'Assinatura mês a mês. Cancelou hoje, para de ser cobrado no próximo ciclo.' },
        { title: 'Você decide, nós só avisamos', description: 'Nunca compramos ou emitimos nada por você — a decisão final é sempre sua.' },
      ],
    },
    finalCta: {
      title: 'Pare de virar refém das planilhas de milhas',
      subtitle: 'Crie sua conta grátis em menos de dois minutos e deixe o radar avisar quando valer a pena viajar.',
      criarConta: 'Criar conta grátis',
      falarComAGente: 'Falar com a gente',
    },
    legal: {
      text: 'Radar Milhas & Viagens é uma ferramenta de comparação e alertas. Não somos agência de viagens, não emitimos passagens e não garantimos preço ou disponibilidade.',
      link: 'Leia o aviso completo',
    },
  },
  en: {
    nav: { comoFunciona: 'How it works', precos: 'Pricing', termos: 'Terms', contato: 'Contact', entrar: 'Log in', criarConta: 'Create free account' },
    hero: {
      badge: 'AI-powered travel deal club',
      title: 'Travel more. Pay less.',
      subtitle:
        'The intelligence that tracks flight, hotel and points prices and alerts you when a real deal shows up — in cash or in points. No spreadsheets, no WhatsApp groups, no need to become a points expert.',
      freeNote: 'Free to start. No credit card required.',
      verPlanos: 'See plans',
    },
    steps: {
      title: 'How it works',
      subtitle: 'Four steps between creating your account and never comparing prices by hand again.',
      items: [
        { step: 'Step 1', title: 'Tell us your preferences', description: 'Home airport, favorite destinations, budget and the loyalty programs you already have — Livelo, Esfera, Smiles, LATAM Pass and more.' },
        { step: 'Step 2', title: 'The radar compares cash vs. points', description: 'On every check, we cross the cash price with the real cost of using (or buying) points and calculate what truly pays off more.' },
        { step: 'Step 3', title: "You're alerted only when it's worth it", description: 'No notification spam. The alert arrives by email (or WhatsApp on higher plans) only when the opportunity passes our score.' },
        { step: 'Step 4', title: 'Decide with confidence', description: 'You get a plain-text recommendation — pay cash, use points, transfer with a bonus or wait — and confirm the purchase directly on the official site.' },
      ],
    },
    question: {
      quote: '"On this trip, is it better to pay cash, use points, transfer points, buy points or wait for a promotion?"',
      body: "That's the question anyone who collects points asks when buying a flight. Radar answers it automatically, with a score from 0 to 100 and a plain-text recommendation — no need to understand mile value, transfer bonuses or fare classes.",
    },
    features: {
      title: 'Everything you need to decide well',
      subtitle: 'One place to search, compare and get alerted — instead of ten open tabs.',
      items: [
        { title: 'Flight search', description: 'Compare cash and points prices for the routes you fly most.' },
        { title: 'Hotel search', description: 'See nightly rates in cash or points, with breakfast and cancellation policy.' },
        { title: 'Points calculator', description: "Find out your mile's real value and whether it's worth redeeming, buying or waiting." },
        { title: 'Smart alerts', description: 'Continuous monitoring by email or WhatsApp, notifying you only when the price really drops.' },
        { title: 'Curated deals', description: 'Bonused transfers, point purchases and promotional fares, hand-picked.' },
        { title: 'AI advisor', description: 'Ask questions about the best way to use your points in a conversation, no jargon.' },
      ],
    },
    pricing: {
      title: 'Plans for every kind of traveler',
      subtitle: 'Start for free. Upgrade when you want more alerts, WhatsApp and the AI advisor.',
      ilimitadas: 'Unlimited searches',
      buscasPorDia: (n) => `${n} ${n === 1 ? 'search' : 'searches'} per day`,
      maisEscolhido: 'Most popular',
      comecar: 'Get started',
    },
    trust: {
      items: [
        { title: 'No fine print', description: 'Clear plans, no hidden fees, no contract tricks.' },
        { title: 'Cancel anytime', description: "Month-to-month subscription. Cancel today, you're not charged next cycle." },
        { title: 'You decide, we just notify', description: "We never buy or issue anything on your behalf — the final call is always yours." },
      ],
    },
    finalCta: {
      title: 'Stop being a hostage to points spreadsheets',
      subtitle: 'Create your free account in under two minutes and let the radar tell you when it pays off to travel.',
      criarConta: 'Create free account',
      falarComAGente: 'Talk to us',
    },
    legal: {
      text: "Radar Milhas & Viagens is a comparison and alert tool. We're not a travel agency, we don't issue tickets and we don't guarantee price or availability.",
      link: 'Read the full disclaimer',
    },
  },
  fr: {
    nav: { comoFunciona: 'Comment ça marche', precos: 'Tarifs', termos: 'Conditions', contato: 'Contact', entrar: 'Se connecter', criarConta: 'Créer un compte gratuit' },
    hero: {
      badge: "Club d'alertes voyage propulsé par l'IA",
      title: 'Voyagez plus. Payez moins.',
      subtitle:
        "L'intelligence qui surveille les prix des vols, hôtels et points, et vous alerte dès qu'une vraie bonne affaire apparaît — en argent ou en points. Sans tableur, sans groupe WhatsApp, sans devenir expert en miles.",
      freeNote: 'Gratuit pour commencer. Sans carte bancaire.',
      verPlanos: 'Voir les forfaits',
    },
    steps: {
      title: 'Comment ça marche',
      subtitle: 'Quatre étapes entre la création de votre compte et l\'arrêt de comparer les prix à la main.',
      items: [
        { step: 'Étape 1', title: 'Indiquez vos préférences', description: "Aéroport de départ, destinations favorites, budget et les programmes de fidélité que vous avez déjà — Livelo, Esfera, Smiles, LATAM Pass et d'autres." },
        { step: 'Étape 2', title: 'Le radar compare argent vs. points', description: "À chaque vérification, nous croisons le prix en argent avec le coût réel d'utiliser (ou d'acheter) des points et calculons ce qui vaut vraiment le plus la peine." },
        { step: 'Étape 3', title: "Vous êtes alerté seulement quand ça vaut le coup", description: "Pas de notifications en continu. L'alerte arrive par e-mail (ou WhatsApp sur les forfaits supérieurs) seulement quand l'opportunité passe notre score." },
        { step: 'Étape 4', title: 'Décidez en toute confiance', description: 'Vous recevez la recommandation en texte simple — payer en argent, utiliser des points, transférer avec bonus ou attendre — et confirmez l\'achat directement sur le site officiel.' },
      ],
    },
    question: {
      quote: '« Pour ce voyage, vaut-il mieux payer en argent, utiliser des points, transférer des points, acheter des points ou attendre une promotion ? »',
      body: "C'est la question que se pose toute personne qui accumule des points au moment d'acheter un billet. Radar y répond automatiquement, avec un score de 0 à 100 et une recommandation en texte simple — sans avoir besoin de comprendre la valeur du mile, les bonus de transfert ou les classes tarifaires.",
    },
    features: {
      title: 'Tout ce qu\'il vous faut pour bien décider',
      subtitle: 'Un seul endroit pour rechercher, comparer et être alerté — au lieu de dix onglets ouverts.',
      items: [
        { title: 'Recherche de vols', description: 'Comparez les prix en argent et en points pour les itinéraires que vous utilisez le plus.' },
        { title: "Recherche d'hôtels", description: "Consultez les tarifs par nuit en argent ou en points, avec petit-déjeuner et politique d'annulation." },
        { title: 'Calculateur de points', description: "Découvrez la valeur réelle de votre mile et si ça vaut la peine de l'échanger, l'acheter ou attendre." },
        { title: 'Alertes intelligentes', description: 'Surveillance continue par e-mail ou WhatsApp, vous prévenant seulement quand le prix baisse vraiment.' },
        { title: 'Promotions sélectionnées', description: 'Transferts bonifiés, achats de points et billets en promotion, sélectionnés avec soin.' },
        { title: 'Conseiller IA', description: 'Posez vos questions sur la meilleure façon d\'utiliser vos points dans une conversation, sans jargon.' },
      ],
    },
    pricing: {
      title: 'Des forfaits pour chaque type de voyageur',
      subtitle: "Commencez gratuitement. Passez à un forfait supérieur pour plus d'alertes, WhatsApp et le conseiller IA.",
      ilimitadas: 'Recherches illimitées',
      buscasPorDia: (n) => `${n} recherche${n === 1 ? '' : 's'} par jour`,
      maisEscolhido: 'Le plus choisi',
      comecar: 'Commencer',
    },
    trust: {
      items: [
        { title: 'Sans petits caractères', description: 'Forfaits clairs, sans frais cachés ni piège contractuel.' },
        { title: 'Annulez quand vous voulez', description: "Abonnement mensuel. Annulé aujourd'hui, plus de facturation au prochain cycle." },
        { title: 'Vous décidez, on vous prévient', description: "Nous n'achetons ni n'émettons jamais rien en votre nom — la décision finale vous appartient toujours." },
      ],
    },
    finalCta: {
      title: 'Arrêtez d\'être l\'otage des tableurs de miles',
      subtitle: 'Créez votre compte gratuit en moins de deux minutes et laissez le radar vous dire quand ça vaut le coup de voyager.',
      criarConta: 'Créer un compte gratuit',
      falarComAGente: 'Nous contacter',
    },
    legal: {
      text: "Radar Milhas & Viagens est un outil de comparaison et d'alertes. Nous ne sommes pas une agence de voyage, nous n'émettons pas de billets et ne garantissons ni prix ni disponibilité.",
      link: "Lire l'avertissement complet",
    },
  },
  es: {
    nav: { comoFunciona: 'Cómo funciona', precos: 'Precios', termos: 'Términos', contato: 'Contacto', entrar: 'Iniciar sesión', criarConta: 'Crear cuenta gratis' },
    hero: {
      badge: 'Club de alertas de viaje con IA',
      title: 'Viaja más. Paga menos.',
      subtitle:
        'La inteligencia que monitorea precios de vuelos, hoteles y puntos, y avisa cuando aparece una oportunidad real — en dinero o en puntos. Sin planillas, sin grupos de WhatsApp, sin convertirte en experto en millas.',
      freeNote: 'Gratis para empezar. Sin tarjeta de crédito.',
      verPlanos: 'Ver planes',
    },
    steps: {
      title: 'Cómo funciona',
      subtitle: 'Cuatro pasos entre crear tu cuenta y dejar de perder tiempo comparando precios a mano.',
      items: [
        { step: 'Paso 1', title: 'Cuéntanos tus preferencias', description: 'Aeropuerto de origen, destinos favoritos, presupuesto y los programas de puntos que ya tienes — Livelo, Esfera, Smiles, LATAM Pass y otros.' },
        { step: 'Paso 2', title: 'El radar compara dinero vs. puntos', description: 'En cada verificación, cruzamos el precio en dinero con el costo real de usar (o comprar) puntos y calculamos qué realmente vale más la pena.' },
        { step: 'Paso 3', title: 'Recibes una alerta solo cuando vale la pena', description: 'Nada de notificaciones todo el tiempo. La alerta llega por e-mail (o WhatsApp en los planes superiores) solo cuando la oportunidad pasa nuestro puntaje.' },
        { step: 'Paso 4', title: 'Decide con confianza', description: 'Recibes la recomendación en texto simple — pagar en dinero, usar puntos, transferir con bono o esperar — y confirmas la compra directo en el sitio oficial.' },
      ],
    },
    question: {
      quote: '"¿En este viaje conviene más pagar en dinero, usar puntos, transferir puntos, comprar puntos o esperar una promoción?"',
      body: 'Esa es la pregunta que se hace cualquier persona que acumula puntos al comprar un pasaje. Radar la responde automáticamente, con un puntaje de 0 a 100 y una recomendación en texto simple — sin que necesites entender el valor del millar, los bonos de transferencia o las clases tarifarias.',
    },
    features: {
      title: 'Todo lo que necesitas para decidir bien',
      subtitle: 'Un solo lugar para buscar, comparar y recibir alertas — en vez de diez pestañas abiertas.',
      items: [
        { title: 'Búsqueda de vuelos', description: 'Compara precios en dinero y en puntos para las rutas que más usas.' },
        { title: 'Búsqueda de hoteles', description: 'Consulta tarifas por noche en dinero o puntos, con desayuno y política de cancelación.' },
        { title: 'Calculadora de puntos', description: 'Descubre el valor real de tu millar y si vale la pena canjear, comprar o esperar.' },
        { title: 'Alertas inteligentes', description: 'Monitoreo continuo por e-mail o WhatsApp, avisando solo cuando el precio realmente baja.' },
        { title: 'Promociones seleccionadas', description: 'Transferencias bonificadas, compra de puntos y pasajes en promoción, con curaduría.' },
        { title: 'Asesor IA', description: 'Resuelve dudas sobre la mejor forma de usar tus puntos en una conversación, sin jerga técnica.' },
      ],
    },
    pricing: {
      title: 'Planes para cada tipo de viajero',
      subtitle: 'Empieza gratis. Mejora tu plan cuando quieras más alertas, WhatsApp y el asesor IA.',
      ilimitadas: 'Búsquedas ilimitadas',
      buscasPorDia: (n) => `${n} ${n === 1 ? 'búsqueda' : 'búsquedas'} por día`,
      maisEscolhido: 'Más elegido',
      comecar: 'Empezar',
    },
    trust: {
      items: [
        { title: 'Sin letra chica', description: 'Planes claros, sin tarifas ocultas ni trampas de contrato.' },
        { title: 'Cancela cuando quieras', description: 'Suscripción mes a mes. Cancelaste hoy, no se te cobra el próximo ciclo.' },
        { title: 'Tú decides, nosotros solo avisamos', description: 'Nunca compramos ni emitimos nada en tu nombre — la decisión final siempre es tuya.' },
      ],
    },
    finalCta: {
      title: 'Deja de ser rehén de las planillas de millas',
      subtitle: 'Crea tu cuenta gratis en menos de dos minutos y deja que el radar te avise cuándo vale la pena viajar.',
      criarConta: 'Crear cuenta gratis',
      falarComAGente: 'Hablar con nosotros',
    },
    legal: {
      text: 'Radar Milhas & Viagens es una herramienta de comparación y alertas. No somos una agencia de viajes, no emitimos pasajes y no garantizamos precio ni disponibilidad.',
      link: 'Leer el aviso completo',
    },
  },
};
