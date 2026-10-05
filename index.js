import { existsSync, lstatSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: 'require-js-extension',
  },
  rules: {
    'require-js-extension': rule((context, node, path) => {
      if (!existsSync(path)) {
        let fix
        if (!node.source.value.includes('?')) {
          fix = (fixer) => {
            return fixer.replaceText(node.source, `'${node.source.value}.js'`)
          }
        }

        context.report({
          node,
          message: 'Relative imports and exports must end with .js',
          fix,
        })
      }
    }),
    'require-index': rule((context, node, path) => {
      if (existsSync(path) && lstatSync(path).isDirectory()) {
        context.report({
          node,
          message: 'Directory paths must end with index.js',
          fix(fixer) {
            return fixer.replaceText(node.source, `'${node.source.value}/index.js'`)
          },
        })
      }
    }),
  },
  configs: {},
}

// assign configs here so we can reference `plugin`
Object.assign(plugin.configs, {
  recommended: {
    plugins: {
      'require-js-extension': plugin,
    },
    rules: {
      'require-js-extension/require-js-extension': 'error',
      'require-js-extension/require-index': 'error',
    },
  },
})

export default plugin

function rule(check) {
  return {
    meta: {
      fixable: true,
    },
    create(context) {
      function rule(node) {
        const source = node.source
        if (!source) return
        const value = source.value.replace(/\?.*$/, '')
        if (!value || !value.startsWith('.') || value.endsWith('.js')) return

        const filename = context.getFilename ? context.getFilename() : context.filename
        check(context, node, resolve(dirname(filename), value))
      }

      return {
        DeclareExportDeclaration: rule,
        DeclareExportAllDeclaration: rule,
        ExportAllDeclaration: rule,
        ExportNamedDeclaration: rule,
        ImportDeclaration: rule,
      }
    },
  }
}
