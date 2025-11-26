export interface UserState {
  name: string;
  email?: string;
  phone?: string;
  soberDate?: string | Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface DailyStat {
  day: string;
  cravings: number;
  mood: number;
}