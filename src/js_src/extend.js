/**
 * Merge defaults with user options
 * @private
 * @param {Object} defaults Default settings
 * @param {Object} options User options
 * @returns {Object} Merged values of defaults and options
 */
export function extend(defaults, options) {
    var extended = {},
        i,
        length,
        prop,
        vals;
    for (i =0, length = arguments.length; i < length; i++) {
        for (prop in arguments[i]) {
            if (Object.prototype.hasOwnProperty.call(arguments[i], prop)) {
                extended[prop] = arguments[i][prop];
            }
        }
    }
    return extended;
};
