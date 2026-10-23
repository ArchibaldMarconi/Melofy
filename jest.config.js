// Tests du moteur pur TypeScript (aucune dépendance React Native).
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', strict: true, esModuleInterop: true } }] },
};
