// Admin configuration stored internally
export const ADMIN_CONFIG = {
  credentials: {
    username: 'MRO',
    password: 'Ga145523@'
  }
};

// Admin settings stored in localStorage
export interface AdminSettings {
  apis: {
    deepseek: string;
    gemini: string;
    nanoBanana: string;
  };
  facebookPixel: string;
  downloadLink: string;
}

export interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  step: number;
  order: number;
  createdAt: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  order: number;
  videos: TutorialVideo[];
}

export interface AdminData {
  settings: AdminSettings;
  tutorials: TutorialStep[];
}

const DEFAULT_ADMIN_DATA: AdminData = {
  settings: {
    apis: {
      deepseek: '',
      gemini: '',
      nanoBanana: ''
    },
    facebookPixel: '',
    downloadLink: ''
  },
  tutorials: []
};

export const getAdminData = (): AdminData => {
  try {
    const data = localStorage.getItem('mro_admin_data');
    if (data) {
      return { ...DEFAULT_ADMIN_DATA, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Error reading admin data:', e);
  }
  return DEFAULT_ADMIN_DATA;
};

export const saveAdminData = (data: AdminData): void => {
  localStorage.setItem('mro_admin_data', JSON.stringify(data));
};

export const updateSettings = (settings: Partial<AdminSettings>): void => {
  const data = getAdminData();
  data.settings = { ...data.settings, ...settings };
  saveAdminData(data);
};

export const addTutorialStep = (title: string): TutorialStep => {
  const data = getAdminData();
  const newStep: TutorialStep = {
    id: `step_${Date.now()}`,
    title,
    order: data.tutorials.length + 1,
    videos: []
  };
  data.tutorials.push(newStep);
  saveAdminData(data);
  return newStep;
};

export const addVideoToStep = (stepId: string, video: Omit<TutorialVideo, 'id' | 'step' | 'createdAt'>): TutorialVideo | null => {
  const data = getAdminData();
  const step = data.tutorials.find(s => s.id === stepId);
  if (!step) return null;
  
  const newVideo: TutorialVideo = {
    ...video,
    id: `video_${Date.now()}`,
    step: step.order,
    createdAt: new Date().toISOString()
  };
  step.videos.push(newVideo);
  saveAdminData(data);
  return newVideo;
};

export const deleteTutorialStep = (stepId: string): void => {
  const data = getAdminData();
  data.tutorials = data.tutorials.filter(s => s.id !== stepId);
  // Reorder
  data.tutorials.forEach((s, i) => s.order = i + 1);
  saveAdminData(data);
};

export const deleteVideo = (stepId: string, videoId: string): void => {
  const data = getAdminData();
  const step = data.tutorials.find(s => s.id === stepId);
  if (step) {
    step.videos = step.videos.filter(v => v.id !== videoId);
    saveAdminData(data);
  }
};

export const isAdminLoggedIn = (): boolean => {
  return sessionStorage.getItem('mro_admin_session') === 'true';
};

export const loginAdmin = (username: string, password: string): boolean => {
  if (username === ADMIN_CONFIG.credentials.username && password === ADMIN_CONFIG.credentials.password) {
    sessionStorage.setItem('mro_admin_session', 'true');
    return true;
  }
  return false;
};

export const logoutAdmin = (): void => {
  sessionStorage.removeItem('mro_admin_session');
};