/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  // Resume services are Node.js code — not browser code — so use 'node', not 'jsdom'
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.resume.json',
    }],
  },
  testRegex: 'src/tests/resume/.*\\.test\\.ts$',
  moduleNameMapper: {
    // Resolve .js extension imports to .ts (NodeNext module resolution compatibility)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['node_modules', 'dist'],
  transformIgnorePatterns: ['/node_modules/'],
};
