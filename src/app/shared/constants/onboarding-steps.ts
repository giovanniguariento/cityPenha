import type { Alignment, Side } from 'driver.js';

/** Chave de versão do onboarding no localStorage. Incremente para reexibir a todos. */
export const ONBOARDING_STORAGE_KEY = 'citypenha_onboarding_v1';

/** Primeiro post do feed, usado para levar o usuário a um artigo real no último passo. */
export interface OnboardingContext {
  firstPost?: { slug: string; categorySlug: string };
}

export interface OnboardingStep {
  /** Rota em que o passo acontece. */
  route: string;
  /** Seletor CSS do alvo. Ausente = popover centralizado (sem destaque). */
  element?: string;
  title: string;
  description: string;
  side?: Side;
  align?: Alignment;
  /** Passo disponível apenas para usuários logados (elemento depende de dados da conta). */
  loggedInOnly?: boolean;
  /** Texto do botão de conclusão quando este é o último passo (ex.: "Criar conta"). */
  finishBtnText?: string;
}

const HOME_STEPS: OnboardingStep[] = [
  {
    route: '/home',
    element: '[data-tour="card-exp"]',
    title: 'Aqui você não só lê, você ganha',
    description:
      'Este banner alterna sozinho entre dois slides. Quando aparecer o botão Começar, toque nele para ver suas missões e subir de nível. Quando aparecer Rever o tour, toque para rever este guia quando quiser.',
    side: 'bottom',
    align: 'center',
  },
  {
    route: '/home',
    element: '[data-tour="feed-xp"]',
    title: 'Leia e ganhe XP',
    description:
      'Cada notícia lida até o fim vale +10 XP na primeira leitura. É assim que você evolui no site.',
    side: 'bottom',
    align: 'start',
  },
  {
    route: '/home',
    element: '[data-tour="header-frequency"]',
    title: 'Mantenha a frequência',
    description:
      'Volte e leia todos os dias para manter sua sequência. O raio mostra o seu calendário de leitura.',
    side: 'bottom',
    align: 'end',
  },
  {
    route: '/home',
    element: '[data-tour="nav-profile"]',
    title: 'Seu progresso fica no Perfil',
    description:
      'No Perfil você acompanha seu nível, XP, moedas e as medalhas que já conquistou.',
    side: 'top',
    align: 'end',
  },
];

/** Passos exclusivos de quem está logado (dependem de dados reais da conta). */
const AUTHENTICATED_STEPS: OnboardingStep[] = [
  {
    route: '/profile',
    element: '[data-tour="profile-level"]',
    title: 'Seu nível',
    description:
      'O anel em volta da foto mostra o quanto falta para o próximo nível. Subir exige XP e missões concluídas.',
    side: 'bottom',
    align: 'center',
    loggedInOnly: true,
  },
  {
    route: '/missions',
    element: '[data-tour="missions-list"]',
    title: 'Missões e medalhas',
    description:
      'Missões dão XP e moedas ao serem concluídas. As medalhas são troféus permanentes que ficam no seu perfil.',
    side: 'top',
    align: 'center',
    loggedInOnly: true,
  },
];

/** Passo que substitui os passos logados quando o usuário é anônimo. */
const ANONYMOUS_ACCOUNT_STEP: OnboardingStep = {
  route: '/home',
  title: 'Crie sua conta para pontuar',
  description:
    'Você pode navegar sem login, mas só ganha XP, moedas, missões e medalhas com uma conta. Elas poderão ser trocadas por benefícios e descontos reais.',
  align: 'center',
  finishBtnText: 'Criar conta',
};

/**
 * Monta a lista de passos conforme o estado de login e o contexto do feed.
 * Anônimo: 4 destaques na home + CTA de conta.
 * Logado: 4 destaques na home + nível, missões e (se houver) um artigo real.
 */
export function buildOnboardingSteps(
  isLoggedIn: boolean,
  context: OnboardingContext = {}
): OnboardingStep[] {
  const steps: OnboardingStep[] = [...HOME_STEPS];

  if (isLoggedIn) {
    steps.push(...AUTHENTICATED_STEPS);

    const post = context.firstPost;
    if (post?.slug && post?.categorySlug) {
      steps.push({
        route: `/noticias/${post.categorySlug}/${post.slug}`,
        element: '[data-tour="article-content"]',
        title: 'Role até o fim para ganhar',
        description:
          'A recompensa de leitura é creditada quando você chega ao final da matéria — e só na primeira vez que a lê.',
        side: 'top',
        align: 'center',
        loggedInOnly: true,
      });
    }
  } else {
    steps.push(ANONYMOUS_ACCOUNT_STEP);
  }

  return steps;
}
