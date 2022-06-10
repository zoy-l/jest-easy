import type { Config } from '@jest/types'
import path from 'path'
import fs from 'fs'

export default function defaultConfig(cwd: string): Config.ConfigGlobals {
  const testMatchTypes = ['spec', 'test']
  const hasSrc = fs.existsSync(path.join(cwd, 'src'))

  return {
    collectCoverageFrom: [
      hasSrc && 'src/**/*.{js,jsx,ts,tsx}',
      '!**/node_modules/**',
      '!**/fixtures/**',
      '!**/__test__/**',
      '!**/examples/**',
      '!**/typings/**',
      '!**/types/**',
      '!**/*.d.ts'
    ].filter(Boolean),
    testPathIgnorePatterns: ['/node_modules/'],
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
    testMatch: [`**/?*.(${testMatchTypes.join('|')}).(j|t)s?(x)`],
    verbose: true
  }
}
