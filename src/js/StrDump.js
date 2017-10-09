/**
 * Nutshell:  working with strings in Javascript is a PITA
 *
 * Know way of knowing if \xED (an invalid utf-8 byte) was passed or \xC3\xAD
 */

String.prototype.ucfirst = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.padLeft = function(pad, len) {
    var diff = len - this.length,
        i,
        str = '';
    if (diff < 1) {
        return this;
    }
    for (i = 0; i < diff; i++) {
        str += pad;
    }
    return str + this;
};

var StrDump = function() {
    this.str = '';
    this.bytes = null;
    this.special = [
        new RegExp(/[\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/),   // equiv to \p{Z}
        // control chars:  \p{C}
        new RegExp(/(?:[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\xAD\u0378\u0379\u0380-\u0383\u038B\u038D\u03A2\u0530\u0557\u0558\u0560\u0588\u058B\u058C\u0590\u05C8-\u05CF\u05EB-\u05EF\u05F5-\u0605\u061C\u061D\u06DD\u070E\u070F\u074B\u074C\u07B2-\u07BF\u07FB-\u07FF\u082E\u082F\u083F\u085C\u085D\u085F-\u089F\u08B5\u08BE-\u08D3\u08E2\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09FC-\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A76-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF2-\u0AF8\u0AFA-\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B55\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B78-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BFB-\u0BFF\u0C04\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5B-\u0C5F\u0C64\u0C65\u0C70-\u0C77\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0D00\u0D04\u0D0D\u0D11\u0D3B\u0D3C\u0D45\u0D49\u0D50-\u0D53\u0D64\u0D65\u0D80\u0D81\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DE5\u0DF0\u0DF1\u0DF5-\u0E00\u0E3B-\u0E3E\u0E5C-\u0E80\u0E83\u0E85\u0E86\u0E89\u0E8B\u0E8C\u0E8E-\u0E93\u0E98\u0EA0\u0EA4\u0EA6\u0EA8\u0EA9\u0EAC\u0EBA\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F48\u0F6D-\u0F70\u0F98\u0FBD\u0FCD\u0FDB-\u0FFF\u10C6\u10C8-\u10CC\u10CE\u10CF\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u137D-\u137F\u139A-\u139F\u13F6\u13F7\u13FE\u13FF\u169D-\u169F\u16F9-\u16FF\u170D\u1715-\u171F\u1737-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17DE\u17DF\u17EA-\u17EF\u17FA-\u17FF\u180E\u180F\u181A-\u181F\u1878-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191F\u192C-\u192F\u193C-\u193F\u1941-\u1943\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19DD\u1A1C\u1A1D\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1A9F\u1AAE\u1AAF\u1ABF-\u1AFF\u1B4C-\u1B4F\u1B7D-\u1B7F\u1BF4-\u1BFB\u1C38-\u1C3A\u1C4A-\u1C4C\u1C89-\u1CBF\u1CC8-\u1CCF\u1CF7\u1CFA-\u1CFF\u1DF6-\u1DFA\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FC5\u1FD4\u1FD5\u1FDC\u1FF0\u1FF1\u1FF5\u1FFF\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2072\u2073\u208F\u209D-\u209F\u20BF-\u20CF\u20F1-\u20FF\u218C-\u218F\u23FF\u2427-\u243F\u244B-\u245F\u2B74\u2B75\u2B96\u2B97\u2BBA-\u2BBC\u2BC9\u2BD2-\u2BEB\u2BF0-\u2BFF\u2C2F\u2C5F\u2CF4-\u2CF8\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D71-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E45-\u2E7F\u2E9A\u2EF4-\u2EFF\u2FD6-\u2FEF\u2FFC-\u2FFF\u3040\u3097\u3098\u3100-\u3104\u312E-\u3130\u318F\u31BB-\u31BF\u31E4-\u31EF\u321F\u32FF\u4DB6-\u4DBF\u9FD6-\u9FFF\uA48D-\uA48F\uA4C7-\uA4CF\uA62C-\uA63F\uA6F8-\uA6FF\uA7AF\uA7B8-\uA7F6\uA82C-\uA82F\uA83A-\uA83F\uA878-\uA87F\uA8C6-\uA8CD\uA8DA-\uA8DF\uA8FE\uA8FF\uA954-\uA95E\uA97D-\uA97F\uA9CE\uA9DA-\uA9DD\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A\uAA5B\uAAC3-\uAADA\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB66-\uAB6F\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uD7FF\uE000-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBC2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFE\uFDFF\uFE1A-\uFE1F\uFE53\uFE67\uFE6C-\uFE6F\uFE75\uFEFD-\uFF00\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFDF\uFFE7\uFFEF-\uFFFB\uFFFE\uFFFF]|\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDCFF\uDD03-\uDD06\uDD34-\uDD36\uDD8F\uDD9C-\uDD9F\uDDA1-\uDDCF\uDDFE-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEDF\uDEFC-\uDEFF\uDF24-\uDF2F\uDF4B-\uDF4F\uDF7B-\uDF7F\uDF9E\uDFC4-\uDFC7\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDD6E\uDD70-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56\uDC9F-\uDCA6\uDCB0-\uDCDF\uDCF3\uDCF6-\uDCFA\uDD1C-\uDD1E\uDD3A-\uDD3E\uDD40-\uDD7F\uDDB8-\uDDBB\uDDD0\uDDD1\uDE04\uDE07-\uDE0B\uDE14\uDE18\uDE34-\uDE37\uDE3B-\uDE3E\uDE48-\uDE4F\uDE59-\uDE5F\uDEA0-\uDEBF\uDEE7-\uDEEA\uDEF7-\uDEFF\uDF36-\uDF38\uDF56\uDF57\uDF73-\uDF77\uDF92-\uDF98\uDF9D-\uDFA8\uDFB0-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCF9\uDD00-\uDE5F\uDE7F-\uDFFF]|\uD804[\uDC4E-\uDC51\uDC70-\uDC7E\uDCBD\uDCC2-\uDCCF\uDCE9-\uDCEF\uDCFA-\uDCFF\uDD35\uDD44-\uDD4F\uDD77-\uDD7F\uDDCE\uDDCF\uDDE0\uDDF5-\uDDFF\uDE12\uDE3F-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEAA-\uDEAF\uDEEB-\uDEEF\uDEFA-\uDEFF\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A\uDF3B\uDF45\uDF46\uDF49\uDF4A\uDF4E\uDF4F\uDF51-\uDF56\uDF58-\uDF5C\uDF64\uDF65\uDF6D-\uDF6F\uDF75-\uDFFF]|\uD805[\uDC5A\uDC5C\uDC5E-\uDC7F\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDB6\uDDB7\uDDDE-\uDDFF\uDE45-\uDE4F\uDE5A-\uDE5F\uDE6D-\uDE7F\uDEB8-\uDEBF\uDECA-\uDEFF\uDF1A-\uDF1C\uDF2C-\uDF2F\uDF40-\uDFFF]|\uD806[\uDC00-\uDC9F\uDCF3-\uDCFE\uDD00-\uDEBF\uDEF9-\uDFFF]|\uD807[\uDC09\uDC37\uDC46-\uDC4F\uDC6D-\uDC6F\uDC90\uDC91\uDCA8\uDCB7-\uDFFF]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F\uDC75-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD80B\uD80E-\uD810\uD812-\uD819\uD823-\uD82B\uD82D\uD82E\uD830-\uD833\uD837\uD839\uD83F\uD874-\uD87D\uD87F-\uDB3F\uDB41-\uDBFF][\uDC00-\uDFFF]|\uD80D[\uDC2F-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDE6D\uDE70-\uDECF\uDEEE\uDEEF\uDEF6-\uDEFF\uDF46-\uDF4F\uDF5A\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDEFF\uDF45-\uDF4F\uDF7F-\uDF8E\uDFA0-\uDFDF\uDFE1-\uDFFF]|\uD821[\uDFED-\uDFFF]|\uD822[\uDEF3-\uDFFF]|\uD82C[\uDC02-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A\uDC9B\uDCA0-\uDFFF]|\uD834[\uDCF6-\uDCFF\uDD27\uDD28\uDD73-\uDD7A\uDDE9-\uDDFF\uDE46-\uDEFF\uDF57-\uDF5F\uDF72-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDFCC\uDFCD]|\uD836[\uDE8C-\uDE9A\uDEA0\uDEB0-\uDFFF]|\uD838[\uDC07\uDC19\uDC1A\uDC22\uDC25\uDC2B-\uDFFF]|\uD83A[\uDCC5\uDCC6\uDCD7-\uDCFF\uDD4B-\uDD4F\uDD5A-\uDD5D\uDD60-\uDFFF]|\uD83B[\uDC00-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDEEF\uDEF2-\uDFFF]|\uD83C[\uDC2C-\uDC2F\uDC94-\uDC9F\uDCAF\uDCB0\uDCC0\uDCD0\uDCF6-\uDCFF\uDD0D-\uDD0F\uDD2F\uDD6C-\uDD6F\uDDAD-\uDDE5\uDE03-\uDE0F\uDE3C-\uDE3F\uDE49-\uDE4F\uDE52-\uDEFF]|\uD83D[\uDED3-\uDEDF\uDEED-\uDEEF\uDEF7-\uDEFF\uDF74-\uDF7F\uDFD5-\uDFFF]|\uD83E[\uDC0C-\uDC0F\uDC48-\uDC4F\uDC5A-\uDC5F\uDC88-\uDC8F\uDCAE-\uDD0F\uDD1F\uDD28-\uDD2F\uDD31\uDD32\uDD3F\uDD4C-\uDD4F\uDD5F-\uDD7F\uDD92-\uDDBF\uDDC1-\uDFFF]|\uD869[\uDED7-\uDEFF]|\uD86D[\uDF35-\uDF3F]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEA2-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uDB40[\uDC00-\uDCFF\uDDF0-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/)
        // "\xe2\x80\x8b",  // zero-width space
        // "\xef\xbb\xbf",  // UTF-8 BOM
        // "\xef\xbf\xbd",  // "Replacement Character"
    ];
};


StrDump.prototype.bytesToString = function(bytes) {
    var str = '',
        info = {};
    this.setBytes(bytes);
    // console.log('bytes', bytes);
    // return 'foo';
    while (this.curI < this.stats.bytesLen) {
        // curI = this.curI;   // store before gets incremented
        this.isOffsetUtf8(info);
        str += info.char;
    }
    return str;
}

/**
 * Convert a unicode code point to an array of byte(s)
 *
 * 0x10348 will be converted into [0xF0 0x90 0x8D 0x88]
 *
 * @param integer cp unicode code point
 *
 * @return integer[]
 */
StrDump.prototype.cpToUtf8Bytes = function(cp) {
    if (cp < 0x80) {
        return [
            cp&0x7F
        ];
    } else if (cp < 0x800) {
        return [
            ((cp>>6)&0x1F)|0xC0,
            (cp&0x3F)|0x80
        ];
    } else if (cp < 0x10000) {
        return [
            ((cp>>12)&0x0F)|0xE0,
            ((cp>>6)&0x3F)|0x80,
            (cp&0x3F)|0x80
        ];
    } else {
        return [
            ((cp>>18)&0x07)|0xF0,
            ((cp>>12)&0x3F)|0x80,
            ((cp>>6)&0x3F)|0x80,
            (cp&0x3F)|0x80
        ];
    }
};

StrDump.prototype.dump = function(bytes, sanitize) {
    var controlCharAs = "other",
        // i = 0,
        curI = 0,
        isUtf8,
        info = {},
        len,
        curBlockType = 'utf8', // utf8, utf8special, other
        newBlockType = null,
        curBlockStart = 0, // string offset
        percentOther = 0,
        strNew = '',
        strBlock = '';
    // return this.bytesToString(bytes);
    this.setBytes(bytes);
    while (this.curI < this.stats.bytesLen) {
        curI = this.curI;   // store before gets incremented
        isUtf8 = this.isOffsetUtf8(info);
        if (isUtf8 && info.isSpecial && this.bytes[curI] < 0x80 && controlCharAs !== "utf8special") {
            if (controlCharAs == "other") {
                isUtf8 = false;
            } else if (controlCharAs == "utf8") {
                info.isSpecial = false;
            }
        }
        if (isUtf8) {
            if (info.isSpecial) {
                // control-char or special
                if (curBlockType !== "utf8special") {
                    newBlockType = "utf8special";
                }
            } else {
                // plain-ol-utf8
                if (curBlockType !== "utf8") {
                    newBlockType = "utf8";
                }
                strBlock += info.char;
            }
        } else {
            // not a valid utf-8 character
            if (curBlockType !== "other") {
                newBlockType = "other";
            }
        }
        if (newBlockType) {
            len = curI - curBlockStart;
            this.incStat(curBlockType, len);
            if (curBlockType === "utf8") {
                if (sanitize) {
                    strBlock = strBlock.escapeHtml();
                }
                strNew += strBlock;
                strBlock = '';
            } else {
                strNew += this.dumpBlock(this.bytes.slice(curBlockStart, this.curI-1), curBlockType);
            }
            curBlockStart = curI;
            curBlockType = newBlockType;
            newBlockType = null;
        }
        /*
        i++;
        if (i > this.stats.bytesLen) {
            console.warn('something went dreadfuly wrong');
            break;
        }
        */
    }
    len = this.stats.bytesLen - curBlockStart;
    this.incStat(curBlockType, len);
    percentOther = this.stats.bytesOther / this.stats.bytesLen * 100;
    if (percentOther > 33 || this.stats.bytesOther >= 5) {
        strNew = this.dumpBlock(this.bytes, 'other', {prefix: false});
    } else if (curBlockType === "utf8") {
        if (sanitize) {
            strBlock = strBlock.escapeHtml();
        }
        strNew += strBlock;
    } else {
        strNew += this.dumpBlock(this.bytes.slice(curBlockStart, this.stats.bytesLen), curBlockType);
    }
    return strNew;
};

StrDump.prototype.bytesToHex = function(bytes, prefix) {
    return Array.prototype.slice.call(bytes).map(function(val){
        var ret = val.toString(16).padLeft("0", 2);
        if (prefix) {
            ret = prefix + ret;
        }
        return ret;
    }).join(" ");
};

/**
 * Private method
 */
StrDump.prototype.dumpBlock = function(bytes, blockType, options) {
    var i,
        offset = 0,
        offsetObj = { offset: 0 },
        charBytes = [],
        cp,
        cpHex,
        str = '',
        title;
    options = options || {};
    if (typeof options.prefix == "undefined") {
        options.prefix = true;
    }
    if (blockType == "utf8") {
        // str = htmlspecialchars($str);
    } else if (blockType == "utf8special") {
        // console.log("utf8special", bytes);
        while (offsetObj.offset < bytes.length) {
            offset = offsetObj.offset;
            cp = this.Utf8BytesToCodePoint(bytes, offsetObj);
            cpHex = cp.toString(16).padLeft('0', 4);
            charBytes = bytes.slice(offset, offsetObj.offset);
            title = this.bytesToHex(charBytes, "\\x");
            /*
            if (isset(self::$charDesc[$ord])) {
                $title = self::$charDesc[$ord].': '.$utf8Hex;
            }
            */
            str = '<a class="unicode" href="https://unicode-table.com/en/'+cpHex+'" target="unicode-table" title="'+title+'">\\u'+cpHex+'</a>';
        }
    } else if (blockType == "other") {
        /*
        for (i = 0; i < bytes.length; i++) {
            cpHex = bytes[i].toString(16).padLeft("0", 2);
            if (options.prefix) {
                cpHex = "\\x" + cpHex;
            }
            str += cpHex + " ";
        }
        str = str.substr(0, str.length - 1);
        */
        /*
        str = bytes.map(function(val){
            // var ret = val;
            // console.log(typeof ret, ret);
            var ret = val.toString(16).padLeft("0", 2);
            if (options.prefix) {
                ret = "\\x" + ret;
            }
            return ret;
        }).join(' ');
        */
        str = this.bytesToHex(bytes, options.prefix ? "\\x" : "");
        str = '<span class="binary">' + str + '</span>';
    }
    return str;
};

/**
 * String.fromCharCode that supports > U+FFFF
 *
 * @param integer code unicode value
 */
StrDump.prototype.fromCodepoint = function(code) {
    if (code > 0xFFFF) {
        code -= 0x10000;
        return String.fromCharCode(0xD800 + (code >> 10), 0xDC00 + (code & 0x3FF));
    } else {
        return String.fromCharCode(code);
    }
};

StrDump.prototype.encodeUTF16toUTF8 = function(str) {
    var bytes = [],
        codepoints = this.utf16ToUnicode(str),
        i,
        length = codepoints.length;
    // console.log('codepoints', codepoints);
    for (i = 0; i < length; i++) {
        bytes.push.apply(bytes, this.cpToUtf8Bytes(codepoints[i]));
    }
    return bytes;
};

/*
StrDump.prototype.getUtf16Bytes = function(str) {
    var bytes = [],
        char,
        b1,
        b1,
        i,
        l = str.length;
    try {
        for(i = 0; i < l; i++) {
            char = str.charCodeAt(i);
            b1 = char >>> 8;
            b2 = char & 0xFF;
            if (b1) {
                bytes.push(b1);
            }
            bytes.push(b2);
        }
    } catch (e) {
        console.warn('e', e);
    }
    return bytes;
};
*/

/**
 * @return array of codepoints
 *
 * @see http://jonisalonen.com/2012/from-utf-16-to-utf-8-in-javascript/
 * @see https://github.com/dcodeIO/utfx/blob/master/src/utfx.js
 */
StrDump.prototype.utf16ToUnicode = function(str) {
    var i,
        code1 = null, code2 = null,
        utf8 = [],
        codes = [];
    // console.log('utf16ToUnicode', str.length);
    for (i = 0; i < str.length; i++) {
        code1 = str.charCodeAt(i);
        if (code1 >= 0xD800 && code1 <= 0xDFFF) {
            console.warn('code1', code1.toString(16));
            if (i + 1 < str.length) {
                i++;
                code2 = str.charCodeAt(i);
                console.warn('code2', code2.toString(16));
                // console.log("code2", i, code2, code2.toString(16));
                if (code2 >= 0xDC00 && code2 <= 0xDFFF) {
                    codes.push((code1-0xD800)*0x400 + code2-0xDC00+0x10000);
                    code2 = null;
                    continue;
                }
            }
        }
        codes.push(code1);
    }
    if (code2 !== null) {
        codes.push(code2);
    }
    // console.log('codes', codes);
    return codes;
};

/**
 * Check UTF-8 string (or single-character) against list of special characters or regular-expressions
 *
 * @param string $str String to check
 *
 * @return boolean
 */
StrDump.prototype.hasSpecial = function (str) {
    var i,
        special;
    for (i = 0; i < this.special.length; i++) {
        special = this.special[i];
        if (special instanceof RegExp) {
            if (special.test(str)) {
                return true;
            }
        } else if (str.indexOf(special) > -1) {
            return true;
        }
    }
    return false;
};

StrDump.prototype.incStat = function(stat, inc) {
    if (stat == 'utf8special') {
        stat = 'bytesSpecial';
    } else {
        stat = 'bytes'+ stat.ucfirst();
    }
    this.stats[stat] += inc;
};

/*
StrDump.prototype.isUtf8 = function(str, info) {
    console.log('isUtf8');
    var isUtf8;
    var foundSpecial = false;
    info.hasSpecial = false;
    while (this.curI < this.stats.bytesLen) {
        isUtf8 = this.isOffsetUtf8(info);
        foundSpecial = foundSpecial || info.isSpecial;
        if (!isUtf8) {
            return false;
        }
    }
    delete info.isSpecial;
    info.hasSpecial = foundSpecial; // || this.hasSpecial(str);
    return true;
};
*/

/*
StrDump.prototype.isValidUtf8Code = function(cp, info) {
    info.char = this.fromCharCode(cp);
    info.isSpecial = this.hasSpecial(info.char);
    return true;
};
*/

/**
 * sets info.isSpecial
 *      info.char
 *      info.codepoint
 */
StrDump.prototype.isOffsetUtf8 = function(info) {
    var len = this.stats.bytesLen,
        byte1 = this.bytes[ this.curI ],
        byte2 = this.curI + 1 < len ? this.bytes[ this.curI+1 ] : null,
        byte3 = this.curI + 2 < len ? this.bytes[ this.curI+2 ] : null,
        byte4 = this.curI + 3 < len ? this.bytes[ this.curI+3 ] : null,
        numBytes = 1;
    info.isSpecial = false;
    info.codepoint = null;
    info.char = null;
    if (byte1 < 0x80) {                             // 0xxxxxxx
        if ((byte1 < 0x20 || byte1 == 0x7F) && [0x09,0x0A,0x0D].indexOf(byte1) < 0) {
            // ctrl char
            info.isSpecial = true;
        }
        numBytes = 1;
    } else if ((byte1 & 0xE0) === 0xC0) {            // 110xxxxx 10xxxxxx
        if (
            this.curI + 1 >= len ||
            (byte2 & 0xC0) !== 0x80 ||
            (byte1 & 0xFE) === 0xC0  // overlong
        ) {
            this.curI += 1;
            return false;
        }
        numBytes = 2;
    } else if ((byte1 & 0xF0) === 0xE0) {            // 1110xxxx 10xxxxxx 10xxxxxx
        if (
            this.curI + 2 >= len ||
            (byte2 & 0xC0) !== 0x80 ||
            (byte3 & 0xC0) !== 0x80 ||
            byte1 === 0xE0 && (byte2 & 0xE0) === 0x80 ||  // overlong
            byte1 === 0xED && (byte2 & 0xE0) === 0xA0     // UTF-16 surrogate (U+D800 - U+DFFF)
        ) {
            this.curI += 1;
            return false;
        }
        numBytes = 3;
    } else if ((byte1 & 0xF8) === 0xF0) {            // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
        if (
            this.curI + 3 >= len ||
            (byte2 & 0xC0) !== 0x80 ||
            (byte3 & 0xC0) !== 0x80 ||
            (byte4 & 0xC0) !== 0x80 ||
            byte1 === 0xF0 && (byte2 & 0xF0) === 0x80 ||  // overlong
            byte1 === 0xF4 && byte2 > 0x8F || byte1 > 0xF4  // > U+10FFFF
        ) {
            this.curI += 1;
            return false;
        }
        numBytes = 4;
    } else {
        this.curI += 1;
        return false;
    }
    info.codepoint = this.Utf8BytesToCodePoint(this.bytes, {offset: this.curI});
    info.char = this.fromCodepoint(info.codepoint);
    info.isSpecial = info.isSpecial || this.hasSpecial(info.char);
    /*
    console.log({
        curI: this.curI,
        curINew: this.curI + numBytes,
        numBytes: numBytes,
        codepoint: info.codepoint,
        char: info.char,
        isSpecial: info.isSpecial
    });
    */
    this.curI += numBytes;
    return true;
};

StrDump.prototype.Utf8BytesToCodePoint = function(bytes, offsetObj) {
    var cp = bytes[offsetObj.offset],
        i,
        numBytes = 1,
        code2;
    if (cp >= 0x80) {            // otherwise 0xxxxxxx
        if (cp < 0xe0) {         // 110xxxxx
            numBytes = 2;
            // cp -= 0xC0;
        } else if (cp < 0xf0) {   // 1110xxxx
            numBytes = 3;
            // cp -= 0xE0;
        } else if (cp < 0xf8) {
            numBytes = 4;          // 11110xxx
            // cp -= 0xF0;
        }
        cp = cp - 192 - (numBytes > 2 ? 32 : 0) - (numBytes > 3 ? 16 : 0);
        for (i = 1; i < numBytes; i++) {
            code2 = bytes[offsetObj.offset + i] - 128;        // 10xxxxxx
            cp = cp * 64 + code2;
        }
    }
    offsetObj.offset += numBytes;
    return cp;
};

StrDump.prototype.setBytes = function(bytes) {
    this.curI = 0;
    this.bytes = bytes;
    this.stats = {
        bytesLen: this.bytes.length,
        bytesOther:  0,
        bytesSpecial: 0,    // special UTF-8
        bytesUtf8: 0        // includes ASCII
    };
};

/*
String.prototype.hexify = (function(){

    function convertBase (val, base1, base2) {
        var ret;
        if (typeof(val) == "number") {
            ret = parseInt(String(val)).toString(base2);
        } else {
            ret = parseInt(val.toString(), base1).toString(base2);
        }
        if (base2 == 16 && ret.length < 2) {
            ret = '0' + ret.toString();
        }
        return ret;
    }

    //  discuss at: http://locutus.io/php/chunk_split/
    function chunkSplit (str, chunklen, separator) {
        chunklen = parseInt(chunklen, 10) || 76
        separator = separator || '\r\n'
        if (chunklen < 1) {
            return false
        }
        var regEx = new RegExp('.{0,' + chunklen + '}', 'g');
        return str.match(regEx).join(separator)
    }

    function pack(bytes) {
        var retStr = '';
        // var chars = [];
        var char, i, l;
        for (var i = 0, l = bytes.length; i < l;) {
            char = ((bytes[i++] & 0xff) << 8) | (bytes[i++] & 0xff);
            retStr += String.fromCharCode(char);
        }
        return retStr;
    }

    return hexify;
}());
*/
