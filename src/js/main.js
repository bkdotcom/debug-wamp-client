// var u8 = new Uint8Array(64)

/*
if (!Array.isArray) {
    Array.isArray = function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
}
*/

Number.isSafeInteger = Number.isSafeInteger || function (value) {
   return Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
};

Number.isInteger = Number.isInteger || function (nVal) {
    return typeof nVal === "number" &&
        isFinite(nVal) &&
        nVal > -9007199254740992 && nVal < 9007199254740992 &&
        Math.floor(nVal) === nVal;
};

if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
}
if (!Object.keys) {
    Object.keys = function(o) {
        if (o !== Object(o))
            throw new TypeError('Object.keys called on a non-object');
        var k=[],p;
        for (p in o)
            if (Object.prototype.hasOwnProperty.call(o,p))
                k.push(p);
        return k;
    }
}

String.prototype.parseHex = function(){
    return this.replace(/\\x([A-F0-9]{2})/gi, function(a,b){
        return String.fromCharCode(parseInt(b,16));
    });
};

String.prototype.escapeHtml = function() {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return this.replace(/[&<>"']/g, function(m) { return map[m]; });
}

var config = (function($, module) {

    // var $currentNode = $('.debug .debug-content');
    var configDefault = {
        url: "ws://127.0.0.1:9090/",
        realm: "debug",
        "font-size": "1em"
    };
    var config = getLocalStorageItem('debugConsoleConfig');

    module.haveSavedConfig = config !== null;

    config = $.extend(configDefault, config);

    module.get = function (key) {
        if (typeof key == "undefined") {
            return config;
        }
        return typeof(config[key]) != "undefined" ? config[key] : null;
    };

    module.set = function(key, val) {
        config[key] = val;
        setLocalStorageItem("debugConsoleConfig", config);
        module.haveSavedConfig = true;
        // events.publish('config.set', config);
    };

    function setLocalStorageItem(key, val) {
        if (val === null) {
            localStorage.removeItem(key);
            return;
        }
        if (typeof val !== "string") {
            val = JSON.stringify(val);
        }
        localStorage.setItem(key, val);
    }

    function getLocalStorageItem(key) {
        var val = localStorage.getItem(key);
        if (typeof val !== "string" || val.length < 1) {
            return null;
        } else {
            try {
                return JSON.parse(val);
            } catch (e) {
                return val;
            }
        }
    }
    return module;
}(jQuery, {}));

/**
 * @see https://davidwalsh.name/pubsub-javascript
 */
var events = (function(){
    var topics = {};
    var hOP = topics.hasOwnProperty;
    return {
        subscribe: function(topic, listener) {
            // Create the topic's object if not yet created
            if (!hOP.call(topics, topic)) { topics[topic] = [] };
            // Add the listener to queue
            var index = topics[topic].push(listener) -1;
            // Provide handle back for removal of topic
            return {
                remove: function() {
                    delete topics[topic][index];
                }
            };
        },
        publish: function(topic, args) {
            // If the topic doesn't exist, or there's no listeners in queue, just leave
            // console.info('publish', topic, args);
            if (!hOP.call(topics, topic)) { return };
            // Cycle through topics queue, fire!
            args = Array.prototype.slice.call(arguments, 1)
            topics[topic].forEach(function(item) {
                // item(info != undefined ? info : {});
                item.apply(this, args);
            });
        }
    };
})();

$(function() {
    var classCollapsed = 'glyphicon-chevron-down',
        classExpanded = 'glyphicon-chevron-up',
        hasConnected = false,
        timeoutHandler;
        // connection = getConnection(),
        // myWorker = new Worker('socketWorker.js');
    /*
    myWorker.onmessage = function(evt) {
        var cmd = typeof evt.data == "object"
            ? evt.data[0]
            : evt.data;
    }
    */

    function findCssRule(selector) {
        var stylesheet = $("#wampClientCss")[0].sheet;
        var rules = stylesheet.cssRules;
        var len = rules.length;
        var i;
        var rule;
        for (i = 0; i < len; i++) {
            rule = rules[i];
            if (rule.selectorText == selector) {
                return rule;
            }
        }
        // not found -> create
        stylesheet.insertRule(selector + ' {  }');
        return stylesheet.cssRules[0];
    }

    function updateCssProperty(selector, rule, value) {
        var cssRule = findCssRule(selector);
        var ruleCamel = rule.replace(/-([a-z])/g, function(matach, p1){
            return p1.toUpperCase();
        });
        cssRule.style[ruleCamel] = value;
    }

    updateCssProperty(".debug", "font-size", "inherit");
    updateCssProperty("#body", "font-size", config.get("font-size"));

    events.subscribe('websocket', function(cmd, data) {
        // console.warn('rcvd websocket', cmd, JSON.stringify(data));
        if (cmd == "msg" && data) {
            logDumper.outputLogEntry(data[0], data[1], data[2]);
            // myWorker.postMessage("getMsg"); // request next msg
            events.publish('onmessage', 'getMsg');
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
    events.publish('onmessage', 'connectionOpen');

    $(".clear").on("click", function() {
        $("#body > .panel").not(".working").remove();
    });

    $("body").on("mouseup", function(e){
        if (timeoutHandler) {
            e.preventDefault();
            clearInterval(timeoutHandler);
            timeoutHandler = null;
        }
    });

    $(".clear").on("mousedown", function(e){
        timeoutHandler = setTimeout(() => {
            // has been long pressed (3 seconds)
            // clear all (incl working)
            $("#body > .panel").remove();
        }, 2000);
    });

    $("body").on("shown.bs.collapse hidden.bs.collapse", ".panel-body", function(e) {
        var $icon = $(this).closest('.panel').find('.panel-heading .'+classCollapsed+', .panel-heading .'+classExpanded);
        $icon.toggleClass(classExpanded+' '+classCollapsed);
        $(this).find(".m_groupSummary, .debug-content").find("> *").not(".enhanced").debugEnhance();
    });

    $("body").on("click", ".btn-remove-session", function(e) {
        $(this).closest(".panel").remove();
    });

    $('#modal-settings').on("show.bs.modal", function (e) {
        $("#wsUrl").val(config.get("url"));
        $("#realm").val(config.get("realm"));
        $("#font-size").val(config.get("font-size"));
    });
    $("#font-size").on("change", function(){
        updateCssProperty("#body", "font-size", $("#font-size").val());
    });
    $('#modal-settings').on("submit", function(e) {
        e.preventDefault();
        if ($("#wsUrl").val() != config.get("url") || $("#realm").val() != config.get("realm")) {
            // connection options changed
            config.set("url", $("#wsUrl").val());
            config.set("realm", $("#realm").val());
            // myWorker.postMessage(['setCfg', config.get()]);
            // myWorker.postMessage('connectionClose');
            // myWorker.postMessage('connectionOpen');
            // events.publish('onmessage', 'setCfg', config.get());
            events.publish('onmessage', 'connectionClose');
            events.publish('onmessage', 'connectionOpen');
        }
        config.set("font-size", $("#font-size").val());
        $(this).modal("hide");
    });
    $('#modal-settings').on("hide.bs.modal", function (e) {
        updateCssProperty("#body", "font-size", config.get("font-size"));
    });

    $().debugEnhance("addCss");
    $("#body").debugEnhance("registerListeners");
});
