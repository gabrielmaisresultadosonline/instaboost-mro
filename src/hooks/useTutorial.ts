import { useState, useCallback } from 'react';

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TutorialSection {
  id: string;
  title: string;
  icon: string;
  steps: TutorialStep[];
}

// Tutorial para página de Registro de Perfil
export const profileRegistrationTutorial: TutorialSection[] = [
  {
    id: 'email',
    title: 'Seu E-mail',
    icon: '📧',
    steps: [
      {
        id: 'email-input',
        targetSelector: '[data-tutorial="email-input"]',
        title: 'Campo de E-mail',
        description: 'Digite seu e-mail aqui. Ele será vinculado permanentemente à sua conta e usado para receber notificações importantes.',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'cadastrar',
    title: 'Cadastrar Perfil',
    icon: '➕',
    steps: [
      {
        id: 'instagram-input',
        targetSelector: '[data-tutorial="instagram-input"]',
        title: 'Campo Instagram',
        description: 'Digite o @ do Instagram que deseja cadastrar. Pode ser seu perfil pessoal ou comercial.',
        position: 'bottom'
      },
      {
        id: 'buscar-button',
        targetSelector: '[data-tutorial="buscar-button"]',
        title: 'Buscar e Analisar',
        description: 'Clique aqui para buscar o perfil no Instagram. A I.A MRO vai analisar automaticamente seus dados.',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'sincronizar',
    title: 'Sincronizar Contas',
    icon: '🔄',
    steps: [
      {
        id: 'sync-email',
        targetSelector: '[data-tutorial="sync-email"]',
        title: 'E-mail para Sincronização',
        description: 'Use o mesmo e-mail da sua conta MRO para importar perfis já cadastrados anteriormente.',
        position: 'bottom'
      },
      {
        id: 'sync-button',
        targetSelector: '[data-tutorial="sync-button"]',
        title: 'Sincronizar Contas',
        description: 'Clique para importar todos os perfis já registrados na sua conta MRO.',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'perfis',
    title: 'Perfis Cadastrados',
    icon: '✅',
    steps: [
      {
        id: 'perfis-list',
        targetSelector: '[data-tutorial="perfis-list"]',
        title: 'Lista de Perfis',
        description: 'Aqui aparecem todos os perfis cadastrados. Clique em um perfil para acessar o dashboard e gerar estratégias.',
        position: 'top'
      }
    ]
  }
];

// Tutorial para Dashboard
export const dashboardTutorial: TutorialSection[] = [
  {
    id: 'ferramenta',
    title: 'Ferramenta MRO',
    icon: '🔧',
    steps: [
      {
        id: 'mro-button',
        targetSelector: '[data-tutorial="mro-button"]',
        title: 'Ferramenta MRO',
        description: 'Acesse a ferramenta de automação MRO. Aqui você encontra tutoriais em vídeo sobre como usar o sistema de engajamento orgânico.',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'perfil-selector',
    title: 'Seletor de Perfil',
    icon: '👤',
    steps: [
      {
        id: 'profile-selector',
        targetSelector: '[data-tutorial="profile-selector"]',
        title: 'Trocar Perfil',
        description: 'Use este menu para alternar entre seus perfis cadastrados ou adicionar um novo perfil.',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'tabs',
    title: 'Abas de Navegação',
    icon: '📑',
    steps: [
      {
        id: 'tab-perfil',
        targetSelector: '[data-tutorial="tab-perfil"]',
        title: 'Aba Perfil',
        description: 'Visualize os dados do seu Instagram: foto, bio, seguidores, posts recentes e métricas.',
        position: 'bottom'
      },
      {
        id: 'tab-analise',
        targetSelector: '[data-tutorial="tab-analise"]',
        title: 'Aba Análise',
        description: 'Veja a análise completa feita pela I.A MRO: pontuações de conteúdo, engajamento e pontos de melhoria.',
        position: 'bottom'
      },
      {
        id: 'tab-estrategias',
        targetSelector: '[data-tutorial="tab-estrategias"]',
        title: 'Aba Estratégias',
        description: 'Gere estratégias personalizadas de 30 dias com calendário de posts, stories e scripts de vendas.',
        position: 'bottom'
      },
      {
        id: 'tab-criativos',
        targetSelector: '[data-tutorial="tab-criativos"]',
        title: 'Aba Criativos',
        description: 'Gere imagens profissionais com I.A para seus posts. Você tem 6 créditos por estratégia.',
        position: 'bottom'
      },
      {
        id: 'tab-crescimento',
        targetSelector: '[data-tutorial="tab-crescimento"]',
        title: 'Aba Crescimento',
        description: 'Acompanhe a evolução do seu perfil com gráficos de seguidores e engajamento ao longo do tempo.',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'usuario',
    title: 'Menu do Usuário',
    icon: '⚙️',
    steps: [
      {
        id: 'user-menu',
        targetSelector: '[data-tutorial="user-menu"]',
        title: 'Informações do Usuário',
        description: 'Aqui você vê seu nome, dias restantes de acesso e pode fazer logout.',
        position: 'bottom'
      }
    ]
  }
];

// Tutorial para Estratégias
export const strategyTutorial: TutorialSection[] = [
  {
    id: 'tipo',
    title: 'Tipos de Estratégia',
    icon: '🎯',
    steps: [
      {
        id: 'strategy-types',
        targetSelector: '[data-tutorial="strategy-types"]',
        title: 'Escolha o Tipo',
        description: 'Selecione o tipo de estratégia: Conteúdo (posts), Engajamento (interações), Vendas (conversões) ou Crescimento (seguidores).',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'gerar',
    title: 'Gerar Estratégia',
    icon: '✨',
    steps: [
      {
        id: 'generate-button',
        targetSelector: '[data-tutorial="generate-button"]',
        title: 'Botão Gerar',
        description: 'Clique para gerar uma estratégia completa de 30 dias com I.A. Inclui calendário de posts, stories e scripts.',
        position: 'top'
      }
    ]
  },
  {
    id: 'resultado',
    title: 'Estratégia Gerada',
    icon: '📋',
    steps: [
      {
        id: 'strategy-display',
        targetSelector: '[data-tutorial="strategy-display"]',
        title: 'Sua Estratégia',
        description: 'Veja sua estratégia completa aqui: passos detalhados, calendário de stories com 30 dias e scripts de vendas prontos.',
        position: 'top'
      },
      {
        id: 'creative-from-strategy',
        targetSelector: '[data-tutorial="creative-from-strategy"]',
        title: 'Gerar Criativo',
        description: 'Clique para gerar um criativo visual baseado nesta estratégia. Usa 1 crédito.',
        position: 'top'
      }
    ]
  }
];

// Tutorial para Criativos
export const creativeTutorial: TutorialSection[] = [
  {
    id: 'manual',
    title: 'Criativo Manual',
    icon: '🖌️',
    steps: [
      {
        id: 'manual-creative',
        targetSelector: '[data-tutorial="manual-creative"]',
        title: 'Criar com Prompt',
        description: 'Crie um criativo personalizado escrevendo seu próprio prompt. Pode incluir sua foto pessoal. Usa 2 créditos.',
        position: 'bottom'
      }
    ]
  },
  {
    id: 'galeria',
    title: 'Galeria de Criativos',
    icon: '🖼️',
    steps: [
      {
        id: 'creatives-gallery',
        targetSelector: '[data-tutorial="creatives-gallery"]',
        title: 'Seus Criativos',
        description: 'Todos os criativos gerados aparecem aqui. Você pode baixar, compartilhar ou excluir cada um.',
        position: 'top'
      }
    ]
  }
];

export const useTutorial = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showList, setShowList] = useState(false);
  const [tutorialData, setTutorialData] = useState<TutorialSection[]>([]);

  const startTutorial = useCallback((sections: TutorialSection[]) => {
    setTutorialData(sections);
    setCurrentSection(0);
    setCurrentStep(0);
    setIsActive(true);
    setShowList(false);
  }, []);

  const startListView = useCallback((sections: TutorialSection[]) => {
    setTutorialData(sections);
    setShowList(true);
    setIsActive(false);
  }, []);

  const nextStep = useCallback(() => {
    const currentSectionData = tutorialData[currentSection];
    if (!currentSectionData) return;

    if (currentStep < currentSectionData.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (currentSection < tutorialData.length - 1) {
      setCurrentSection(prev => prev + 1);
      setCurrentStep(0);
    } else {
      // Tutorial finished
      setIsActive(false);
    }
  }, [currentSection, currentStep, tutorialData]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (currentSection > 0) {
      const prevSectionIndex = currentSection - 1;
      setCurrentSection(prevSectionIndex);
      setCurrentStep(tutorialData[prevSectionIndex].steps.length - 1);
    }
  }, [currentSection, currentStep, tutorialData]);

  const stopTutorial = useCallback(() => {
    setIsActive(false);
    setShowList(false);
  }, []);

  const getCurrentStepData = useCallback(() => {
    if (!tutorialData.length) return null;
    const section = tutorialData[currentSection];
    if (!section) return null;
    return section.steps[currentStep] || null;
  }, [tutorialData, currentSection, currentStep]);

  const getTotalSteps = useCallback(() => {
    return tutorialData.reduce((acc, section) => acc + section.steps.length, 0);
  }, [tutorialData]);

  const getCurrentStepNumber = useCallback(() => {
    let count = 0;
    for (let i = 0; i < currentSection; i++) {
      count += tutorialData[i].steps.length;
    }
    return count + currentStep + 1;
  }, [tutorialData, currentSection, currentStep]);

  return {
    isActive,
    showList,
    currentSection,
    currentStep,
    tutorialData,
    startTutorial,
    startListView,
    nextStep,
    prevStep,
    stopTutorial,
    getCurrentStepData,
    getTotalSteps,
    getCurrentStepNumber,
    setShowList
  };
};
