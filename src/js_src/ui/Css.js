function findCssRule (stylesheet, selector) {
  var rules = stylesheet.cssRules
  var len = rules.length
  var i
  var rule
  for (i = 0; i < len; i++) {
    rule = rules[i]
    if (rule.selectorText === selector) {
      return rule
    }
  }
  // not found -> create
  stylesheet.insertRule(selector + ' {  }')
  return stylesheet.cssRules[0]
}

export function updateCssProperty (stylesheet, selector, rule, value) {
  // console.log('updateCssProperty', stylesheet)
  var sheet = typeof stylesheet === 'string'
    ? document.getElementById(stylesheet).sheet
    : stylesheet
  var cssRule = findCssRule(sheet, selector)
  var ruleCamel = rule.replace(/-([a-z])/g, function (matach, p1) {
    return p1.toUpperCase()
  })
  cssRule.style[ruleCamel] = value
}
