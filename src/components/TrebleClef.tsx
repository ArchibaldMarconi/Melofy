// Clé de sol dessinée (retour bêta : le caractère 𝄞 dépend de la police de l'appareil, il tombait décalé et sa
// spirale ne s'enroulait pas autour de la ligne de sol). Ici la spirale est centrée sur la 2e ligne, quelle que soit
// la taille de la portée : `gLineY` est la hauteur de la ligne de sol, `gap` l'interligne.
import React from 'react';
import { Circle, Path } from 'react-native-svg';

export function TrebleClef({ x, gLineY, gap, color }: { x: number; gLineY: number; gap: number; color: string }) {
  // coordonnées en interlignes, centrées sur le cœur de la spirale (axe y vers le bas)
  const P = (px: number, py: number) => `${(x + px * gap).toFixed(1)},${(gLineY + py * gap).toFixed(1)}`;
  const d = [
    `M${P(0.12, 0.32)}`,
    `C${P(-0.5, 0.36)} ${P(-0.55, -0.55)} ${P(0.05, -0.7)}`, // petite boucle intérieure
    `C${P(0.85, -0.85)} ${P(0.98, 0.72)} ${P(0.05, 0.84)}`, // tour extérieur de la spirale, autour de la ligne de sol
    `C${P(-1.05, 0.95)} ${P(-1.15, -0.55)} ${P(-0.3, -1.55)}`, // grand arc qui remonte à gauche
    `C${P(0.4, -2.3)} ${P(0.78, -2.95)} ${P(0.55, -3.6)}`, // montée vers la boucle du haut
    `C${P(0.38, -4.15)} ${P(-0.12, -3.95)} ${P(-0.12, -3.25)}`, // boucle du haut
    `L${P(0.38, 1.85)}`, // la hampe, qui traverse la portée
    `C${P(0.45, 2.5)} ${P(-0.25, 2.7)} ${P(-0.45, 2.25)}`, // crochet du bas
  ].join(' ');
  return (
    <>
      <Path d={d} stroke={color} strokeWidth={Math.max(1.6, gap * 0.16)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={x - 0.32 * gap} cy={gLineY + 2.15 * gap} r={gap * 0.26} fill={color} />
    </>
  );
}
