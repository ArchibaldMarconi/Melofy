// Mélodies traditionnelles du domaine public, notées en degrés (durées en temps).
// De la vraie musique dès le palier 1 : l'oreille reconnaît, la main retrouve.
export interface Tune { id: string; title: string; notes: [number, number][] }

export const TUNES: Tune[] = [
  { id: 'clair_lune_a', title: 'Au clair de la lune (début)', notes: [[1, 1], [1, 1], [1, 1], [2, 1], [3, 2], [2, 2]] },
  { id: 'clair_lune_b', title: 'Au clair de la lune (suite)', notes: [[1, 1], [3, 1], [2, 1], [2, 1], [1, 4]] },
  { id: 'frere_jacques', title: 'Frère Jacques', notes: [[1, 1], [2, 1], [3, 1], [1, 1], [1, 1], [2, 1], [3, 1], [1, 1]] },
  { id: 'mary_lamb', title: 'Mary Had a Little Lamb', notes: [[3, 1], [2, 1], [1, 1], [2, 1], [3, 1], [3, 1], [3, 2]] },
  { id: 'ode_joie', title: 'Ode à la joie', notes: [[3, 1], [3, 1], [4, 1], [5, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [1, 1], [2, 1], [3, 1], [3, 1.5], [2, 0.5], [2, 2]] },
  { id: 'jingle_bells', title: 'Vive le vent (refrain)', notes: [[3, 1], [3, 1], [3, 2], [3, 1], [3, 1], [3, 2], [3, 1], [5, 1], [1, 1.5], [2, 0.5], [3, 4]] },
  // mélodies du domaine public ; degrés négatifs = sous la tonique (-5 = sol grave en do)
  { id: 'clair_lune', title: 'Au clair de la lune', notes: [[1, 1], [1, 1], [1, 1], [2, 1], [3, 2], [2, 2], [1, 1], [3, 1], [2, 1], [2, 1], [1, 4]] },
  { id: 'vous_dirai_je', title: 'Ah ! vous dirai-je, maman', notes: [[1, 1], [1, 1], [5, 1], [5, 1], [6, 1], [6, 1], [5, 2], [4, 1], [4, 1], [3, 1], [3, 1], [2, 1], [2, 1], [1, 2]] },
  { id: 'frere_jacques_complet', title: 'Frère Jacques (en entier)', notes: [[1, 1], [2, 1], [3, 1], [1, 1], [1, 1], [2, 1], [3, 1], [1, 1], [3, 1], [4, 1], [5, 2], [3, 1], [4, 1], [5, 2], [5, 0.5], [6, 0.5], [5, 0.5], [4, 0.5], [3, 1], [1, 1], [5, 0.5], [6, 0.5], [5, 0.5], [4, 0.5], [3, 1], [1, 1], [1, 1], [-5, 1], [1, 2], [1, 1], [-5, 1], [1, 2]] },
  { id: 'saints', title: 'When the Saints Go Marching In', notes: [[1, 1], [3, 1], [4, 1], [5, 4], [1, 1], [3, 1], [4, 1], [5, 4], [1, 1], [3, 1], [4, 1], [5, 2], [3, 2], [1, 2], [3, 2], [2, 4]] },
  { id: 'amazing_grace', title: 'Amazing Grace (début)', notes: [[-5, 1], [1, 2], [3, 0.5], [1, 0.5], [3, 2], [2, 1], [1, 2], [-6, 1], [-5, 2]] },
  { id: 'auld_lang_syne', title: 'Ce n\'est qu\'un au revoir (début)', notes: [[-5, 1], [1, 1.5], [1, 0.5], [1, 1], [3, 1], [2, 1.5], [1, 0.5], [2, 1], [3, 1], [1, 1.5], [1, 0.5], [3, 1], [5, 1], [6, 3]] },
  { id: 'row_boat', title: 'Row, Row, Row Your Boat', notes: [[1, 1.5], [1, 1.5], [1, 1], [2, 0.5], [3, 1.5], [3, 1], [2, 0.5], [3, 1], [4, 0.5], [5, 3]] },
  { id: 'london_bridge', title: 'London Bridge', notes: [[5, 1.5], [6, 0.5], [5, 1], [4, 1], [3, 1], [4, 1], [5, 2], [2, 1], [3, 1], [4, 2], [3, 1], [4, 1], [5, 2]] },
  { id: 'old_macdonald', title: 'Old MacDonald', notes: [[1, 1], [1, 1], [1, 1], [-5, 1], [-6, 1], [-6, 1], [-5, 2], [3, 1], [3, 1], [2, 1], [2, 1], [1, 2]] },
];

/** hauteur d'un degré de comptine : négatif = sous la tonique */
export const tuneDegreeSemis = (d: number) => {
  const S = [0, 2, 4, 5, 7, 9, 11];
  const a = Math.abs(d);
  const semi = S[(a - 1) % 7] + 12 * Math.floor((a - 1) / 7);
  return d < 0 ? semi - 12 : semi;
};

/** Comptines jouables avec les degrés donnés. */
export const tunesFor = (pool: number[]) => TUNES.filter((t) => t.notes.every(([d]) => pool.includes(Math.abs(d))));
