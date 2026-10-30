// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Tests Jest uniquement.
    // - `jest.mock()` s'écrit avant les imports : ts-jest le remonte en tête, et l'ordre écrit montre ce qui est
    //   simulé avant de charger le module testé (import/first lirait cet ordre comme une erreur).
    // - les fabriques de `jest.mock()` sont remontées au-dessus des imports, elles ne peuvent donc pas s'en servir :
    //   `require()` y est obligatoire.
    // - les `require()` dans les `describe` donnent des modules non typés, dont les tests se servent librement :
    //   les passer en imports typés ferait réécrire les tests (28 erreurs de types), pas seulement le lint.
    files: ['__tests__/**'],
    rules: {
      'import/first': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
