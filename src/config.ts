// Canal de distribution.
//  - 'beta'  : TestFlight et version web de test : outils de test visibles (Premium, Tout débloquer).
//  - 'store' : App Store / Play Store : outils masqués.
// Passer CHANNEL à 'store' avant l'archive destinée à la publication (voir RELEASE.md).
export const CHANNEL: 'beta' | 'store' = 'beta';

/** Mur payant (1 séance gratuite par jour). Laisser à false tant que l'achat intégré n'est pas branché :
 *  une limite qu'on ne peut pas lever serait refusée par Apple (règle 3.1.1) et frustrante. */
export const PAYWALL_ENABLED = false;

declare const __DEV__: boolean | undefined;
export const SHOW_TEST_TOOLS = (typeof __DEV__ !== 'undefined' && __DEV__) || CHANNEL === 'beta';
