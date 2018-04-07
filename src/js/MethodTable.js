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
			var  val = colKeys[keyi];
			if (val === '') {
				val = 'value';
			}
			$table.find('thead tr').append('<th scope="col">'+module.dump(val, true, false, false)+'</th>');
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
				var isStringified = row.stringified && row.stringified.length || typeof row.methods.__toString !== "undefined";
				if (!isStringified && row.className != 'Closure') {
					haveObj = true;
					$tr.append(module.markupClassname(row.className, 'td', {
						title: row.phpDoc.summary ? row.phpDoc.summary : null
					}));
				}
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
			isAbstraction,
			keys = [],
			row = {};
		delete obj['__debug_key_order__'];
		for (i in obj) {
			row = obj[i];
			isAbstraction = typeof row == "object" && typeof row.debug == "string" && atob(row.debug) == module.ABSTRACTION;
			if (isAbstraction) {
				// abstraction
				module.base64DecodeObj(row);
				if (row.type == "object") {
					if (typeof row.traverseValues !== "undefined" && Object.keys(row.traverseValues).length) {
						row = row.traverseValues;
					} else if (typeof row.values !== "undefined" && Object.keys(row.values).length) {
						// pre 2.1
						row = row.values;
					} else if (row.stringified && row.stringified.length) {
						row = null;
					} else if (typeof row.methods.__toString !== "undefined") {
						row = null;
					} else {
						row = row.properties;
						for (key in row) {
							if (row[key].visibility !== "public") {
								delete row[key];
							}
						}
					}
				} else {
					// ie callable or resource
					row = null;
				}
			}
			if (typeof row != "object") {
				row = {'':null};
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
		var isAbstraction = typeof row.debug == "string" && row.debug == module.ABSTRACTION;
		var type = isAbstraction ? row.type : "array";
		var i, k, length, info, values = [], value;
		if (isAbstraction) {
			if (type == "object") {
				if (typeof row.traverseValues && Object.keys(row.traverseValues).length) {
					row = row.traverseValues;
				} else if (typeof row.values !== "undefined" && Object.keys(row.values).length) {
					// pre 2.1
					row = row.values;
				} else if (row.stringified && row.stringified.length) {
					row = row.stringified;
				} else if (typeof row.methods.__toString !== "undefined") {
					row = row.methods.__toString.returnValue;
				} else if (row.className == 'Closure') {
					row = {'':row};
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
			} else {
				row = {'':row};
			}
		}
		if (typeof row !== "object") {
			row = {'':row};
		}
		for (i = 0, length = keys.length; i < length; i++) {
			k = keys[i];
			value = typeof row[k] !== "undefined"
				? row[k]
				: module.UNDEFINED;
			isAbstraction = typeof value == "object" && typeof value.debug == "string" && value.debug == module.ABSTRACTION;
			if (isAbstraction && value.type == "object") {
				if (value.stringified && value.stringified.length) {
					value = value.stringified;
				} else if (typeof value.methods.__toString !== "undefined") {
					value = value.methods.__toString.returnValue;
				}
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
