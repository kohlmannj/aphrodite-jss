import {create} from 'jss'
import preset from 'jss-preset-default'
import hash from 'murmurhash-js/murmurhash3_gc'

const meta = 'aphrodite-jss'
const isNotFalsy = val => !!val
const getClassName = rule => rule.className
const generateClassName = (name, str) => `${name}-${hash(name + str + meta)}`
const mergeStyles = (style, rule) => ({...style, ...rule.style})

export default function aphroditeJss(jss, options = {insertionPoint: meta}) {
  const renderSheet = (styles = null, index = 0) => (
    jss.createStyleSheet(styles, {meta, index, ...options}).attach()
  )

  let globalSheet
  let sheet = renderSheet(null, 1)

  function css(...rules) {
    // Filter falsy values to allow `css(a, test && c)`.
    rules = rules.filter(isNotFalsy)

    if (!rules.length) return ''

    // A joined class name from all rules.
    const className = rules.map(getClassName).join('--')

    if (sheet.getRule(className)) return className

    const style = rules.reduce(mergeStyles, {})
    sheet.addRule(className, style, {className})

    return className
  }

  function register(styles, addImmediately = false) {
    const {classes, globals} = Object.keys(styles).reduce((map, name) => {
      // If `name` does not start with `@`, like `'@import`, add it to map.classes
      if (name.indexOf('@') !== 0) {
        map.classes[name] = {
          className: generateClassName(name, JSON.stringify(styles[name])),
          style: styles[name]
        }
      }
      else {
        map.globals[name] = styles[name]
      }

      return map
    }, {classes: [], globals: {}})

    if (Object.keys(globals).length > 0) {
      // Immediately render the globals to globalSheet
      if (typeof globalSheet !== 'object' || globalSheet === null) {
        globalSheet = renderSheet(globals, 0)
      }
      else {
        globalSheet.addRules(globals)
      }
    }

    if (addImmediately) {
      return Object.keys(classes).reduce((renderedClasses, name) => {
        const {className, style} = classes[name]
        sheet.addRule(name, style, {className})
        renderedClasses[name] = className
        return renderedClasses
      }, {})
    }

    return classes
  }

  function reset() {
    // Detach and re-render the main sheet
    sheet.detach()
    jss.sheets.remove(sheet)
    sheet = renderSheet(null, 1)
    // Detach and re-render the global sheet
    // Note: register() will init globalSheet if it needs to
    globalSheet.detach()
    jss.sheets.remove(globalSheet)
  }

  return {
    StyleSheet: {create: register, render: styles => register(styles, true)},
    toString: () => `${globalSheet && globalSheet.toString()}${sheet.toString()}`,
    css,
    reset,
    version: __VERSION__
  }
}

export const {css, StyleSheet, reset, toString, version} = aphroditeJss(create(preset()))
