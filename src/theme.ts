// Identité visuelle : papier à musique lavande, encre violet nuit, une couleur par domaine.
// Élément mémorable : l'arbre dessiné comme une portée, les exercices en têtes de notes.
// Mode sombre : suit le réglage du téléphone (ou le choix fait dans Profil), appliqué au lancement.
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Domain } from './content/types';

export type ThemePref = 'auto' | 'clair' | 'sombre';
// le choix est lu au démarrage (index.ts) avant le premier rendu, puis posé ici
export const themePref: ThemePref = ((globalThis as { __melofyTheme?: ThemePref }).__melofyTheme) ?? 'auto';
export const isDark = themePref === 'sombre' || (themePref === 'auto' && Appearance.getColorScheme() === 'dark');
export function setThemePref(p: ThemePref) { AsyncStorage.setItem('melofy-ui:theme', p).catch(() => {}); }

const light = {
  paper: '#F5F2FB', card: '#FFFFFF', ink: '#211A45', inkSoft: '#6A6389', staff: '#CFC6E8', line: '#E4DEF3',
  primary: '#211A45', onPrimary: '#FFFFFF', accent: '#7348C9',
  success: '#1E7D50', danger: '#C8364F', warn: '#93650D', gold: '#D9A21B', silver: '#9AA6B8', bronze: '#B0713A',
  white: '#FFFFFF', hintBg: '#FFF4D6', dangerBg: '#FDECEF', successBg: '#CDEBDD', keyTonic: '#EFEAFB', keyLabel: '#CFC6E8',
  onPrimarySoft: '#D8D2F0', onPrimaryFaint: '#B9B0DC', tabInactive: '#6F6895', medalStart: '#E4DEF3',
  /** texte posé sur un aplat de couleur (boutons, puces, têtes de notes) : contraste ≥ 4,5:1 */
  onFill: '#FFFFFF',
};
const dark: typeof light = {
  paper: '#14112A', card: '#211C40', ink: '#F0ECFB', inkSoft: '#A7A0C8', staff: '#4B4378', line: '#332C5A',
  primary: '#8E78F0', onPrimary: '#14112A', accent: '#A58FFF',
  success: '#3BBF83', danger: '#F06A82', warn: '#E6A93A', gold: '#E8B93A', silver: '#AEB8C8', bronze: '#C88A52',
  white: '#FFFFFF', hintBg: '#3A3220', dangerBg: '#3D1E2A', successBg: '#1E4636', keyTonic: '#DCD3FA', keyLabel: '#8E86B5',
  onPrimarySoft: '#1B1638', onPrimaryFaint: '#1B1638', tabInactive: '#8A82B5', medalStart: '#4B4378',
  onFill: '#14112A',
};

export const colors = isDark ? dark : light;

export const domainColor: Record<Domain, string> = isDark
  ? { rythme: '#F59A4A', oreille: '#5B9BF0', theorie: '#9E7BF0', technique: '#2DB8A4', impro: '#F0679B', repiquage: '#7F8AF0' }
  : { rythme: '#AD560F', oreille: '#296DC4', theorie: '#7348C9', technique: '#0F7C6D', impro: '#CD2867', repiquage: '#3B45A0' };

export const domainLabel: Record<Domain, string> = {
  rythme: 'Rythme', oreille: 'Oreille', theorie: 'Théorie', technique: 'Technique', impro: 'Impro', repiquage: 'Repiquage',
};

export const type = {
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5, color: colors.ink },
  title: { fontSize: 20, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  small: { fontSize: 13, lineHeight: 18, color: colors.inkSoft },
};

export const radius = { note: 999, sheet: 22, key: 6 };
export const space = (n: number) => n * 4;
