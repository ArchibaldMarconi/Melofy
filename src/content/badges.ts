// Badges : chaque badge est une condition sur l'état du joueur.
import type { CompetenceState } from './types';

export interface BadgeState {
  xpTotal: number;
  streak: number;
  sessionsDone: number;
  perfectSessions: number;
  bossDone: string[];
  carnetCount: number;
  competences: Record<string, CompetenceState>;
  mechanicsDone: string[];
}

export interface Badge { id: string; title: string; description: string; icon: string; check: (s: BadgeState) => boolean }

export const BADGES: Badge[] = [
  { id: 'premiere_session', title: 'Premier pas', description: 'Termine ta première session.', icon: '🎵', check: (s) => s.sessionsDone >= 1 },
  { id: 'serie_3', title: 'Trois jours', description: 'Série de 3 jours.', icon: '🔥', check: (s) => s.streak >= 3 },
  { id: 'serie_7', title: 'Une semaine', description: 'Série de 7 jours.', icon: '📅', check: (s) => s.streak >= 7 },
  { id: 'serie_30', title: 'Un mois', description: 'Série de 30 jours.', icon: '🏆', check: (s) => s.streak >= 30 },
  { id: 'xp_100', title: '100 XP', description: 'Gagne 100 XP.', icon: '⭐', check: (s) => s.xpTotal >= 100 },
  { id: 'xp_1000', title: '1 000 XP', description: 'Gagne 1 000 XP.', icon: '🌟', check: (s) => s.xpTotal >= 1000 },
  { id: 'parfait', title: 'Sans faute', description: 'Une session parfaite, sans aide.', icon: '💎', check: (s) => s.perfectSessions >= 1 },
  { id: 'boss_1', title: 'Fondations', description: 'Bats le boss du palier 1.', icon: '🎖️', check: (s) => s.bossDone.includes('BOSS-1') },
  { id: 'boss_2', title: 'Harmonie', description: 'Bats le boss du palier 2.', icon: '🎼', check: (s) => s.bossDone.includes('BOSS-2') },
  { id: 'premier_lick', title: 'Premier lick', description: 'Ajoute une phrase à ton carnet.', icon: '📓', check: (s) => s.carnetCount >= 1 },
  { id: 'touche_a_tout', title: 'Touche-à-tout', description: 'Réussis les 13 types d\'exercices.', icon: '🧭', check: (s) => s.mechanicsDone.length >= 13 },
];
