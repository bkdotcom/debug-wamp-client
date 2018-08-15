var logDumper = (function($, module){

	var colClasses = {};

	module.methodTable = function (rows, caption, columns, classname) {
		// console.log('methodTable', rows);
		var classAndInner,
			haveObj = false,
			i, i2,
			rowKeys = [],
			rowKey,
			colKeys = [],
			colKey,
			rowLength,
			colLength,
			row,
			$table,
			$tr;
		if (classname === undefined) {
			classname = "table-bordered";
		}
		$table = $('<table><caption>'+caption.escapeHtml()+'</caption><thead><tr><th>&nbsp;</th></tr></thead></table>')
			.addClass(classname);
		if (isAbstraction(rows)) {
			if (atob(rows.type) == "object") {
				$table.find('caption').append(' ' + module.markupClassname(atob(rows.className)));
			}
			if (Object.keys(rows.traverseValues).length) {
				rows = rows.traverseValues;
			}
		}
		rowKeys = rows['__debug_key_order__'] || Object.keys(rows);
		colKeys = columns.length ? columns : getTableKeys(rows);

		colClasses = {};
		for (i = 0, colLength = colKeys.length; i < colLength; i++) {
			colKey = colKeys[i];
			if (colKey === '') {
				colKey = 'value';
			}
			colClasses[colKey] = null;
			$table.find('thead tr').append(
				'<th scope="col">'+module.dump(colKey, true, false, false)+'</th>'
			);
		}
		delete rows['__debug_key_order__'];
		for (i = 0, rowLength = rowKeys.length; i < rowLength; i++) {
			rowKey = rowKeys[i];
			row = rows[rowKey];
			if (columns.length > 0) {
				// getTableKeys not called... need to base64decode
				module.base64DecodeObj(row);
			}
			// using for in, so every key will be a string
			//  check if actually an integer
			if (typeof rowKey == "string" && rowKey.match(/^\d+$/) && Number.isSafeInteger(rowKey)) {
				rowKey = parseInt(rowKey, 10);
			}
			// console.log('row', row);
			classAndInner = parseAttribString(module.dump(rowKey, true, true, false));
			classname = /^\d+$/.test(rowKey) ? 't_int' : classAndInner.class;
			$tr = $('<tr><th scope="row" class="t_key '+classname+' text-right">'+classAndInner.innerhtml+'</th></tr>');
			if (isAbstraction(row) && row.type == "object") {
				var isStringified = row.stringified && row.stringified.length || typeof row.methods.__toString !== "undefined";
				if (!isStringified && row.className != 'Closure') {
					haveObj = true;
					$tr.append(module.markupClassname(row.className, 'td', {
						title: row.phpDoc.summary ? row.phpDoc.summary : null
					}));
				}
			}
			values = getValues(row, colKeys);
			for (i2 = 0, colLength = values.length; i2 < colLength; i2++) {
				classAndInner = parseAttribString(module.dump(values[i2], true));
				$tr.append('<td class="'+classAndInner.class+'">'+classAndInner.innerhtml+'</td>');
			}
			$table.append($tr);
		}
		for (colKey in colClasses) {
			if (!colClasses[colKey]) {
				continue;
			}
			$table.find('thead tr th').each(function(){
				if ($(this).text() === colKey) {
					var classname = atob(colClasses[colKey]);
					$(this).append(' '+module.markupClassname(classname));
					return false;
				}
			});
		}
		if (haveObj) {
			$table.find('thead tr > *').eq(0).after("<th>&nbsp;</th>");
		}
		return $table;
	};

	function isAbstraction(val) {
		return val
			&& typeof val == "object"
			&& typeof val.debug == "string"
			&& (val.debug === module.ABSTRACTION || atob(val.debug) === module.ABSTRACTION)	;
	}

	function getTableKeys(obj) {
		var i, key,
			isAbs,
			keys = [],
			row = {};
		delete obj['__debug_key_order__'];
		for (i in obj) {
			row = obj[i];
			isAbs = isAbstraction(row);
			if (isAbs) {
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
		var isAbs = isAbstraction(row);
		var type = isAbs ? row.type : "array";
		var i, k, length, info, values = [], value;
		if (isAbs) {
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
			if (module.getType(value) == "object") {
				if (value.stringified && value.stringified.length) {
					colClasses[k] = colClasses[k] === null || colClasses[k] == value.className
						? value.className
						: false;
					value = value.stringified;
				} else if (typeof value.methods.__toString !== "undefined") {
					colClasses[k] = colClasses[k] === null || colClasses[k] == value.className
						? value.className
						: false;
					value = value.methods.__toString.returnValue;
				}
			} else if (value !== module.UNDEFINED && value !== null) {
				colClasses[k] = false;
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
