import PubSub from "./PubSub.js";
import {extend} from "./extend.js";

var phpDebugConsoleKeys = ["linkFiles","linkFilesTemplate"];

export function Config(defaults, localStorageKey) {
    var storedConfig = getLocalStorageItem(localStorageKey);
    // this.pubSub = pubSub;
    this.config = extend(defaults, storedConfig || {});
    this.localStorageKey = localStorageKey;
    this.haveSavedConfig = typeof storedConfig === "object";
}

Config.prototype.get = function(key) {
    if (typeof key == "undefined") {
        return JSON.parse(JSON.stringify(this.config));
    }
    return typeof(this.config[key]) !== "undefined"
        ? this.config[key]
        : null;
}

Config.prototype.set = function(key, val) {
    var setVals = {};
    if (typeof key == "object") {
        setVals = key;
    } else {
        setVals[key] = val;
    }
    for (var k in setVals) {
        this.config[k] = setVals[k];
    }
    setLocalStorageItem(this.localStorageKey, this.config);
    this.checkPhpDebugConsole(setVals);
    this.haveSavedConfig = true;
}

/**
 * publish phpDebugConsoleConfig if obj contains phpDebugConsole settings
 *
 * @param object vals config values
 *
 * @return void
 */
Config.prototype.checkPhpDebugConsole = function(vals) {
    // console.log('checkPhpDebugConsole', vals);
    var count, i, key,
        dbVals = {},
        haveDbVal = false;
    if (vals === undefined) {
        vals = this.config;
    }
    for (i = 0, count = phpDebugConsoleKeys.length; i < count; i++) {
        key = phpDebugConsoleKeys[i];
        // console.log('key', key);
        if (typeof vals[key] !== "undefined") {
            dbVals[key] = vals[key];
            haveDbVal = true;
        }
    }
    if (haveDbVal) {
        PubSub.publish("phpDebugConsoleConfig", {
            linkFiles: this.config.linkFiles,
            linkFilesTemplate: this.config.linkFilesTemplate
        });
    }
}

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
