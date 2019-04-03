import {extend} from "./extend.js";

export function Config(defaults, localStorageKey) {
    var storedConfig = getLocalStorageItem(localStorageKey);
    this.config = extend(defaults, storedConfig || {});
    this.localStorageKey = localStorageKey;
    this.haveStoredConfig = typeof storedConfig === "object";
}

Config.prototype.get = function(key) {
    if (typeof key == "undefined") {
        return this.config;
    }
    return typeof(this.config[key]) !== "undefined"
        ? this.config[key]
        : null;
}

Config.prototype.set = function(key,val) {
    this.config[key] = val;
    setLocalStorageItem(this.localStorageKey, config);
    this.haveSavedConfig = true;
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
