const { join } = require('path')
const fs = require('fs')
const prettier = require('prettier')

function getJestArgs() {
  const value = require(join(require.resolve('jest-cli'), '../cli/args'))

  Object.keys(value.options).forEach((key) => {
    delete value.options[key].description
    value.options[key].type = value.options[key].type || 'any'
  })

  const cwd = join(__dirname, './')

  fs.writeFileSync(
    join(cwd, 'jestArgs/index.js'),
    prettier.format(`module.exports = ${JSON.stringify(value.options)}`, {
      parser: 'babel',
      semi: false
    })
  )
}

getJestArgs()

require('@vercel/ncc')(require.resolve('find-up')).then(({ code }) => {
  fs.writeFileSync('./find-up/index.js', code)
})
