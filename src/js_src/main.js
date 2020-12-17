import $ from 'jquery' // external global
import PubSub from './PubSub.js'
import './prototypeMethods.js' // import for side-effects only
import * as ui from './ui/ui.js'
import * as logger from './Logger/Logger.js'
import { Config } from './Config.js'
import { SocketWorker } from './wamp/SocketWorker.js'

var config = new Config(
  {
    url: 'ws://127.0.0.1:9090/',
    realm: 'debug',
    fontSize: '1em',
    linkFiles: false,
    linkFilesTemplate: 'subl://open?url=file://%file&line=%line'
  },
  'debugWampClient'
)

initSocketWorker()

function initSocketWorker () {
  return new SocketWorker(PubSub, config)
}

$(function () {
  var hasConnected = false

  ui.init(config)
  /*
    init on #body vs body so we can stop event propagation before bubbles to body  (ie clipboard.js)
  */
  $('#body').debugEnhance('init', {
    sidebar: true,
    useLocalStorage: false
  })

  PubSub.subscribe('websocket', function (cmd, data) {
    if (cmd === 'msg' && data) {
      logger.processEntry({
        method: data[0],
        args: data[1],
        meta: data[2]
      })
      if (data[0] === 'meta' && data[2].linkFilesTemplateDefault) {
        config.setDefault({
          linkFiles: true,
          linkFilesTemplate: data[2].linkFilesTemplateDefault
        })
      }
      // myWorker.postMessage('getMsg') // request next msg
      PubSub.publish('onmessage', 'getMsg')
    } else if (cmd === 'connectionClosed') {
      $('#alert.connecting').remove()
      if ($('#alert.closed').length) {
        return
      }
      $('#body').prepend(
        '<div id="alert" class="alert alert-warning alert-dismissible closed">' +
          'Not connected to debug server' +
          '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
        '</div>'
      )
      if (!config.haveSavedConfig && !hasConnected) {
        $('#modal-settings').modal('show')
      }
    } else if (cmd === 'connectionOpened') {
      hasConnected = true
      $('#alert').remove()
    }
  })
  /*
  myWorker.onerror = function(error) {
    console.log('error', error)
  }
  */

  // myWorker.postMessage(['setCfg', config.get()])
  // myWorker.postMessage('connectionOpen')
  // console.log('config', config)
  // events.publish('onmessage', 'setCfg', config.get())
  PubSub.publish('onmessage', 'connectionOpen')

  PubSub.subscribe('phpDebugConsoleConfig', function (vals) {
    $('body').debugEnhance('setConfig', vals)
  })

  config.checkPhpDebugConsole()
})
