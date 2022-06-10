const fs = require('fs')
const path = require('path')
const ncc = require('@vercel/ncc')
const prettier = require('prettier')

const watch = process.argv.includes('--watch')

async function run() {
  const value = require(path.join(require.resolve('jest-cli'), '../cli/args'))

  Object.keys(value.options).forEach((key) => {
    value.options[key] = true
  })

  const cwd = path.join(__dirname, './')

  fs.writeFileSync(
    path.join(cwd, 'src/jestArgs.ts'),
    prettier.format(`export default ${JSON.stringify(value.options)}`, {
      parser: 'babel',
      semi: false
    })
  )

  const data = await ncc(path.join(process.cwd(), 'src', 'cli.ts'), {
    externals: ['jest'],
    watch
  })

  if (!watch) {
    fs.writeFileSync('./index.js', data.code)
  } else {
    data.handler(({ code }) => {
      fs.writeFileSync('./index.js', code)
      console.log('ncc: update write file')
    })
  }
}

run()
