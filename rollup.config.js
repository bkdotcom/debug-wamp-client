/**
 * see https://github.com/mishoo/UglifyJS2/blob/master/README.md#minify-options
 */

// import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs'
import legacy from 'rollup-plugin-legacy'
import resolve from 'rollup-plugin-node-resolve'
import { uglify } from 'rollup-plugin-uglify'

var onwarn = function(message) {
  // autobahn... not much we can do
  if (/Use of eval is strongly discouraged/.test(message)) {
    return
  }
  console.error(message)
}

var tasks = [
  {
    input: 'src/js_src/main.js',
    external: ['jquery'],
    onwarn: onwarn,
    output: {
      file: 'src/js/main.js',
      format: 'iife', // immediately invoked function expression
      globals: {
        jquery: 'window.jQuery'
      },
      // sourcemap: 'inline',
    },
    plugins: plugins = [
      // babel({
        // exclude: ['node_modules/**'],
      // }),
      commonjs({
        include: ['node_modules/**'],
      }),
      resolve({
        jsnext: true,
        main: true,
        browser: true,
      }),
      legacy({
        // add a default export, corresponding to `someLibrary`
        'src/js_src/Queue.js': 'Queue',
        /*
        // add named exports
        'js_src/Queue.js': {
          foo: 'anotherLib.foo',
          bar: 'anotherLib.bar',
          baz: 'anotherLib.baz'
        }
        */
      }),
    ]
  }
]

if (process.env.NODE_ENV !== 'watch') {
  var plugins = [
    // babel({
      // exclude: ['node_modules/**'],
    // }),
    commonjs({
      include: ['node_modules/**'],
    }),
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    legacy({
      // add a default export, corresponding to `someLibrary`
      'src/js_src/Queue.js': 'Queue',
      /*
      // add named exports
      'js_src/Queue.js': {
        foo: 'anotherLib.foo',
        bar: 'anotherLib.bar',
        baz: 'anotherLib.baz'
      }
      */
    }),
    uglify({
      compress: {
        drop_console: true
      }
    })
  ]
  tasks.push({
    input: 'src/js_src/main.js',
    external: ['jquery'],
    onwarn: onwarn,
    output: {
      file: 'src/js/main.min.js',
      format: 'iife', // immediately invoked function expression
      globals: {
        jquery: 'window.jQuery'
      },
    },
    plugins: plugins,
  })
}

export default tasks
