# jest-easy

Simple jest-easy is friendlier to monorepo mode support

## Quickly

```bash
pnpm add jest-easy jest
```

add a command, the `jest.config.js` in the root directory is read

```json
{
  ...,
  "scripts": {
    "test": "jest-easy",
    "test-args": "jest-easy xxx --xxx"
  },
  ...
}
```

like using `jest ...` just use it

### Config

default config:

PS: the `monorepo pattern` will look for the `jest.config.js` in the more directory

```json
{
  "collectCoverageFrom": [
    "src/**/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/fixtures/**",
    "!**/__test__/**",
    "!**/examples/**",
    "!**/typings/**",
    "!**/types/**",
    "!**/*.d.ts"
  ],
  "testPathIgnorePatterns": ["/node_modules/"],
  "moduleFileExtensions": ["js", "jsx", "ts", "tsx", "json"],
  "testMatch": ["**/?*.(test | 'spce').(j|t)s?(x)"],
  "verbose": true
}
```

want to fix an item?

```js
module.exports = {
  // memo -> [
  // "src/**/*.{js,jsx,ts,tsx}",
  // "!**/node_modules/**",
  // "!**/fixtures/**",
  // "!**/__test__/**",
  // "!**/examples/**",
  // "!**/typings/**",
  // "!**/types/**",
  // "!**/*.d.ts"
  // ]
  collectCoverageFrom(memo) {
    return memo.concat(['!**/*.spec.{ts,tsx}'])
  },
  // The default values are directly replaced here
  // ["**/?*.(test | 'spce').(j|t)s?(x)"] to [`**/?*.test.(j|t)s?(x)`]
  testMatch: [`**/?*.test.(j|t)s?(x)`]
}
```
