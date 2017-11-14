var logDumper = (function($, module){

	module.methodTable = function (rows, caption, columns, classname) {
		// console.log('methodTable', rows);
		var classAndInner,
			haveObj = false,
			keyi,
			keys = rows['__debug_key_order__'] || Object.keys(rows),
			key,
			colKeys = columns.length ? columns : getTableKeys(rows),
			rowLength,
			colLength,
			row,
			$table,
			$tr;
		if (classname === undefined) {
			classname = "table-bordered";
		}
		delete rows['__debug_key_order__'];
		$table = $('<table><caption>'+caption.escapeHtml()+'</caption><thead><tr><th>&nbsp;</th></tr></thead></table>')
			.addClass(classname);
		for (keyi = 0, colLength = colKeys.length; keyi < colLength; keyi++) {
			$table.find('thead tr').append('<th scope="col">'+module.dump(colKeys[keyi], true, false, false)+'</th>');
		}
		for (keyi = 0, rowLength = keys.length; keyi < rowLength; keyi++) {
			key = keys[keyi];
			row = rows[key];
			if (columns.length > 0) {
				// getTableKeys not called... need to base64decode
				module.base64DecodeObj(row);
			}
			// using for in, so every key will be a string
			//  check if actually an integer
			if (typeof key == "string" && key.match(/^\d+$/) && Number.isSafeInteger(key)) {
				key = parseInt(key, 10);
			}
			// console.log('row', row);
			classAndInner = parseAttribString(module.dump(key, true, true, false));
			classname = /^\d+$/.test(key) ? 't_int' : classAndInner.lass;
			$tr = $('<tr><th scope="row" class="t_key '+classname+'">'+classAndInner.innerhtml+'</th></tr>');
			if (row.debug == module.ABSTRACTION && row.type == "object") {
				haveObj = true;
				$tr.append(module.markupClassname(row.className, 'td', {
					title: row.phpDoc.summary ? row.phpDoc.summary : null
				}));
			}
			values = getValues(row, colKeys);
			for (vali = 0, colLength = values.length; vali < colLength; vali++) {
				// key = colKeys[keyi];
				classAndInner = parseAttribString(module.dump(values[vali], true));
				$tr.append('<td class="'+classAndInner.class+'">'+classAndInner.innerhtml+'</td>');
			}
			$table.append($tr);
		}
		if (haveObj) {
			$table.find('thead tr > *').eq(0).after("<th>&nbsp;</th>");
		}
		return $table;
	};

	function getTableKeys(obj) {
		var i, key,
			keys = [],
			row = {};
		delete obj['__debug_key_order__'];
		for (i in obj) {
			row = obj[i];
			if (typeof row == "object" && typeof row.debug == "string" && atob(row.debug) == module.ABSTRACTION) {
				// abstraction
				if (atob(row.type) == "object") {
					module.base64DecodeObj(row);
					if (row.implements.indexOf("Traversable") > -1) {
						row = row.values;
					} else {
						row = row.properties;
						for (key in row) {
							if (row[key].visibility !== "public") {
								delete row[key];
							}
						}
					}
				} else {
					row = null;
				}
			}
			for (key in row) {
				if (keys.indexOf(key) < 0) {
					keys.push(key);
				}
			}
		}
		return keys;
	}

	function getValues(row, keys) {
		/*
		var isAbstraction = typeof row == "object" &&
			(row.debug === module.ABSTRACTION || atob(row.debug) == module.ABSTRACTION);
		var rowIsObject = rowIsAbstraction && (row.type == "object" || atob(row.type) == "object");
		*/
		// var type = module.getType(row);
		var type = typeof row.debug == "string" && row.debug == module.ABSTRACTION ? row.type : "array";
		var isTraversable = false;
		var i, k, length, info, values = [], value;
		if (type == "object") {
			// module.base64DecodeObj(row);
			isTraversable = row.implements.indexOf('Traversable') > -1 && typeof row.values != "undefined";
			if (isTraversable) {
				row = row.values;
			} else {
				for (k in row.properties) {
					info = row.properties[k];
					if (info.visibility !== 'public') {
						delete row.properties[k];
					} else {
						row.properties[k] = info.value;
					}
				}
				row = row.properties;
			}
		}
		for (i = 0, length = keys.length; i < length; i++) {
			k = keys[i];
			value = module.UNDEFINED;
			if (typeof row === "object") {
				if (typeof row[k] !== "undefined") {
					value = row[k];
				}
			} else if (k === '') {
				value = row;
			}
			values.push(value);
		}
		return values;
	}

	function parseAttribString(html) {
		// console.log('parseAttribString', html);
		var regEx = /^<span class="([^"]+)">([^]*)<\/span>$/,
			matches = html.match(regEx);
		return matches ? {
				class: matches[1],
				innerhtml: matches[2]
			} :
			{
				class: null,
				innerhtml: html
			};
	}

    return module;

}(jQuery, logDumper || {}));
