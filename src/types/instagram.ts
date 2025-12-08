export interface InstagramProfile {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  profilePicUrl: string;
  isBusinessAccount: boolean;
  category: string;
  externalUrl: string;
  recentPosts: InstagramPost[];
  engagement: number;
  avgLikes: number;
  avgComments: number;
}

export interface InstagramPost {
  id: string;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  hasHumanFace: boolean;
}

export interface ProfileAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  niche: string;
  audienceType: string;
  contentScore: number;
  engagementScore: number;
  profileScore: number;
  recommendations: string[];
}

export interface Strategy {
  id: string;
  title: string;
  description: string;
  type: 'mro' | 'content' | 'engagement' | 'sales';
  steps: string[];
  scripts: SalesScript[];
  storiesCalendar: StoriesDay[];
  createdAt: string;
}

export interface SalesScript {
  situation: string;
  opening: string;
  body: string;
  closing: string;
  scarcityTriggers: string[];
}

export interface StoriesDay {
  day: string;
  stories: StoryIdea[];
}

export interface StoryIdea {
  time: string;
  type: 'engagement' | 'cta' | 'behind-scenes' | 'testimonial' | 'offer';
  content: string;
  hasButton: boolean;
  buttonText?: string;
  buttonUrl?: string;
}

export interface Creative {
  id: string;
  imageUrl: string;
  ctaText: string;
  headline: string;
  strategyId: string;
  createdAt: string;
  expiresAt: string;
  colors: CreativeColors;
  logoUrl?: string;
  downloaded: boolean;
}

export interface CreativeColors {
  primary: string;
  secondary: string;
  text: string;
}

export interface CreativeConfig {
  colors: CreativeColors;
  logoType: 'profile' | 'custom' | 'none';
  customLogoUrl?: string;
  businessType: string;
}

export interface MROSession {
  profile: InstagramProfile | null;
  analysis: ProfileAnalysis | null;
  strategies: Strategy[];
  creatives: Creative[];
  creativesRemaining: number;
  lastUpdated: string;
}
