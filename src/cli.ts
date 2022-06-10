import run from './jestRun'

const args = process.argv.slice(2)

const arg: Record<PropertyKey, true> = {}
const _: string[] = []

args.forEach((c) => {
  if (c.indexOf('-') > -1) {
    arg[c.replace(/-/g, '')] = true
  } else {
    _.push(c)
  }
})

run({ _, ...arg })
