import $ from 'jquery';				// external global
import PubSub from "./PubSub.js";
import * as prototypeMethods from "./prototypeMethods.js";
import * as ui from "./ui/ui.js";
import * as logger from "./logger/logger.js";
import {Config} from "./Config.js";
import {SocketWorker} from "./wamp/SocketWorker.js";

var config = new Config({
    url: "ws://127.0.0.1:9090/",
    realm: "debug",
    "font-size": "1em"
}, "debugConsoleConfig");
var socketWorker = new SocketWorker(PubSub, config);

$(function() {
    var hasConnected = false;

    ui.init(config);
    $("body").debugEnhance("init");

    PubSub.subscribe("websocket", function(cmd, data) {
        // console.warn('rcvd websocket', cmd, JSON.stringify(data));
        if (cmd == "msg" && data) {
            logger.processEntry(data[0], data[1], data[2]);
            // myWorker.postMessage("getMsg"); // request next msg
            PubSub.publish("onmessage", "getMsg");
        } else if (cmd == "connectionClosed") {
            $("#alert.connecting").remove();
            if ($("#alert.closed").length) {
                return;
            }
            $("#body").prepend(
                '<div id="alert" class="alert alert-warning alert-dismissible closed">' +
                    '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                    'Not connected to debug server' +
                '</div>'
            );
            if (!config.haveSavedConfig && !hasConnected) {
                $('#modal-settings').modal("show");
            }
        } else if (cmd == "connectionOpened") {
            hasConnected = true;
            $("#alert").remove();
        }
    });
    /*
    myWorker.onerror = function(error) {
        console.log('error', error);
    }
    */

    // myWorker.postMessage(["setCfg", config.get()]);
    // myWorker.postMessage("connectionOpen");
    // console.log('config', config);
    // events.publish('onmessage', 'setCfg', config.get());
    PubSub.publish("onmessage", "connectionOpen");
});
