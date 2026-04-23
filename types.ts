
export enum Category {
  DEEP = 'Profond & Sensé',
  FUNNY = 'Drôle & Léger',
  ROMANTIC = 'Romantique & Épicé',
  FUTURE = 'Futur & Rêves',
  RANDOM = 'Aléatoire & Bizarre',
  // Nouveaux modes
  CHALLENGE = 'Défis de Couple',
  QUIZ = 'Qui de nous deux ?',
  YOU_RATHER = 'Tu préfères ?',
  TRUE_FALSE = 'Vrai ou Faux ?',
  STORYTELLER = "Conteur d'histoires",
}

export type GameMode = 'CONVERSATION' | 'CHALLENGE' | 'QUIZ' | 'YOU_RATHER' | 'TRUE_FALSE' | 'STORYTELLER';

export interface Question {
  id: string;
  text: string;
  category: Category;
  isAiGenerated: boolean;
  timestamp: number;
}

export interface Quote {
  text: string;
  author: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AppState {
  currentQuestion: Question | null;
  history: Question[];
  favorites: Question[];
  isLoading: boolean;
  activeCategory: Category;
}
