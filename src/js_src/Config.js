import PubSub from './PubSub.js'
import { extend } from './extend.js'

var phpDebugConsoleKeys = ['linkFiles', 'linkFilesTemplate']

export function Config (defaults, localStorageKey) {
  var storedConfig = getLocalStorageItem(localStorageKey)
  this.defaults = defaults
  this.config = extend({}, defaults, storedConfig || {})
  this.localStorageKey = localStorageKey
  this.haveSavedConfig = typeof storedConfig === 'object'
}

Config.prototype.get = function (key) {
  if (typeof key === 'undefined') {
    return JSON.parse(JSON.stringify(this.config))
  }
  return typeof this.config[key] !== 'undefined'
    ? this.config[key]
    : null
}

/*
Config.prototype.isDefault = function (key)
{
  return this.config[key] === this.defaults[key]
}
*/

Config.prototype.set = function (key, val) {
  var configWas = JSON.parse(JSON.stringify(this.config))
  var k
  var setVals = {}
  if (typeof key === 'object') {
    setVals = key
  } else {
    setVals[key] = val
  }

  for (k in setVals) {
    this.config[k] = setVals[k]
  }

  if (this.config.url !== configWas.url || this.config.realm !== configWas.realm) {
    // connection options changed
    PubSub.publish('onmessage', 'connectionClose')
    PubSub.publish('onmessage', 'connectionOpen')
  }

  this.checkPhpDebugConsole(setVals)
  setVals = {}
  for (k in this.config) {
    if (this.config[k] !== this.defaults[k]) {
      setVals[k] = this.config[k]
    }
  }
  setLocalStorageItem(this.localStorageKey, setVals)
  this.haveSavedConfig = true
}

Config.prototype.setDefault = function (key, val) {
  var setVals = {}
  var storedConfig = getLocalStorageItem(this.localStorageKey) || {}
  var k
  if (typeof key === 'object') {
    setVals = key
  } else {
    setVals[key] = val
  }
  for (k in setVals) {
    this.defaults[k] = setVals[k]
  }
  this.config = extend({}, this.defaults, storedConfig || {})
  this.checkPhpDebugConsole(this.config)
}

/**
 * publish phpDebugConsoleConfig if obj contains phpDebugConsole settings
 *
 * @param object vals config values
 *
 * @return void
 */
Config.prototype.checkPhpDebugConsole = function (vals) {
  // console.log('checkPhpDebugConsole', vals)
  var count
  var i
  var key
  var dbVals = {}
  var haveDbVal = false
  if (vals === undefined) {
    vals = this.config
  }
  for (i = 0, count = phpDebugConsoleKeys.length; i < count; i++) {
    key = phpDebugConsoleKeys[i]
    // console.log('key', key)
    if (typeof vals[key] !== 'undefined') {
      dbVals[key] = vals[key]
      haveDbVal = true
    }
  }
  if (haveDbVal) {
    PubSub.publish('phpDebugConsoleConfig', {
      linkFiles: this.config.linkFiles,
      linkFilesTemplate: this.config.linkFilesTemplate
    })
  }
}

function setLocalStorageItem (key, val) {
  if (val === null) {
    localStorage.removeItem(key)
    return
  }
  if (typeof val !== 'string') {
    val = JSON.stringify(val)
  }
  localStorage.setItem(key, val)
}

function getLocalStorageItem (key) {
  var val = localStorage.getItem(key)
  if (typeof val !== 'string' || val.length < 1) {
    return null
  } else {
    try {
      return JSON.parse(val)
    } catch (e) {
      return val
    }
  }
}
