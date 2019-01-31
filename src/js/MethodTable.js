var logDumper = (function($, module){

	var colKeys = [];
	var colClasses = {};
	var rowObjInfo = [];
	var totals = {};
	var $table;

	module.methodTable = function (rows, meta, classname) {
		// console.warn('methodTable', meta, classname);
		var i,
			length;
		if (classname === undefined) {
			classname = "table-bordered";
		}
		if (meta.caption === null) {
			meta.caption = '';
		}
		colKeys = [];
		colClasses = {};
		rowObjInfo = [];
		totals = {};
		if (meta.totalCols) {
			for (i = 0, length = meta.totalCols.length; i < length; i++) {
				totals[meta.totalCols[i]] = null;
			}
		}
		$table = $('<table><caption>'+meta.caption.escapeHtml()+'</caption><thead><tr><th>&nbsp;</th></tr></thead></table>')
			.addClass(classname);
		if (isAbstraction(rows)) {
			if (rows.type == "object") {
				$table.find('caption').append(' ' + module.markupClassname(rows.className));
			}
			if (Object.keys(rows.traverseValues).length) {
				rows = rows.traverseValues;
			}
		}
		colKeys = meta.columns.length ? meta.columns : getTableKeys(rows);
		buildHead();
		buildBody(rows, meta);
		addTotals();
		addColObjInfo();
		addRowObjInfo();
		return $table;
	};

	function buildHead() {
		var i, length, colKey;
		for (i = 0, length = colKeys.length; i < length; i++) {
			colKey = colKeys[i];
			if (colKey === '') {
				colKey = 'value';
			}
			colClasses[colKey] = null;  // initialize
			$table.find('thead tr').append(
				'<th scope="col">'+module.dump(colKey, true, false, false)+'</th>'
			);
		}
	}

	function buildBody(rows, meta) {
		var i, length,
			i2, length2,
			classAndInner,
			classname,
			rowKeys = [],
			rowKey,
			row,
			$tr,
			values;
		rowKeys = rows.__debug_key_order__ || Object.keys(rows);
		delete rows.__debug_key_order__;
		for (i = 0, length = rowKeys.length; i < length; i++) {
			rowKey = rowKeys[i];
			row = rows[rowKey];
			// using for in, so every key will be a string
			//  check if actually an integer
			if (typeof rowKey == "string" && rowKey.match(/^\d+$/) && Number.isSafeInteger(rowKey)) {
				rowKey = parseInt(rowKey, 10);
			}
			classAndInner = parseAttribString(module.dump(rowKey, true, true, false));
			classname = /^\d+$/.test(rowKey) ? 't_int' : classAndInner.class;
			$tr = $('<tr><th scope="row" class="t_key '+classname+' text-right">'+classAndInner.innerhtml+'</th></tr>');
			values = getValues(row);
			for (i2 = 0, length2 = values.length; i2 < length2; i2++) {
				if (totals[colKeys[i2]] !== undefined) {
					totals[colKeys[i2]] += values[i2];
				}
				classAndInner = parseAttribString(module.dump(values[i2], true));
				$tr.append('<td class="'+classAndInner.class+'">'+classAndInner.innerhtml+'</td>');
			}
			$table.append($tr);
		}
	}

	function addColObjInfo() {
		var colKey, classname;
		for (colKey in colClasses) {
			if (!colClasses[colKey]) {
				continue;
			}
			$table.find('thead tr th').each(function(){
				if ($(this).text() === colKey) {
					classname = colClasses[colKey];
					$(this).append(' '+module.markupClassname(classname));
					return false;
				}
			});
		}
	}

	function addRowObjInfo() {
		var i, length, $trs;
		if (rowObjInfo.filter(function(val){
			return val !== null;
		}).length) {
			$table.find('thead tr > :first-child, tfoot tr > :first-child').after("<th>&nbsp;</th>");
			$trs = $table.find('tbody > tr');
			for (i=0, length=rowObjInfo.length; i<length; i++) {
				$trs.eq(i).find(':first-child').after(rowObjInfo[i]);
			}
		}
	}

	/*
		Add totals (tfoot)
	*/
	function addTotals() {
		var i,
			length,
			cell = '',
			cells = [],
			classAndInner,
			colHasTotal = false,
			colKey,
			haveTotal = false;
		for (i = 0, length = colKeys.length; i < length; i++) {
			colKey = colKeys[i];
			colHasTotal = totals[colKey] !== undefined && totals[colKey] !== null;
			haveTotal = haveTotal || colHasTotal;
			cell = '<td></td>';
			if (colHasTotal) {
				classAndInner = parseAttribString(module.dump(totals[colKey], true));
				cell = '<td class="'+classAndInner.class+'">'+classAndInner.innerhtml+'</td>';
			}
			cells.push(cell);
		}
		if (haveTotal) {
			$table.append('<tfoot>' +
				'<tr><td>&nbsp;</td>' +
					cells.join('') +
				'</tr>' +
				'</tfoot>'
			);
		}
	}

	function isAbstraction(val) {
		return val &&
			typeof val == "object" &&
			typeof val.debug == "string" &&
			val.debug === module.ABSTRACTION;
	}

	function getTableKeys(obj) {
		var i, key,
			isAbs,
			vis,
			isPublic = false,
			keys = [],
			row = {};
		for (i in obj) {
			if (i === "__debug_key_order__") {
				continue;
			}
			row = obj[i];
			isAbs = isAbstraction(row);
			if (isAbs) {
				// abstraction
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
							vis = row[key].visibility;
							isPublic = typeof vis === "string"
								? vis === "public"
								: vis.indexOf("public") > -1;
							if (!isPublic) {
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

	function getValues(row) {
		var isAbs = isAbstraction(row),
			type = isAbs ? row.type : "array",
			i, k, length,
			info,
			values = [],
			value,
			vis,
			isPublic,
			isStringified,
			objInfo = null;
		if (isAbs) {
			if (type == "object") {
				isStringified = row.stringified && row.stringified.length || typeof row.methods.__toString !== "undefined";
				if (!isStringified && row.className != 'Closure') {
					// haveObj = true;
					objInfo = module.markupClassname(row.className, 'td', {
						title: row.phpDoc.summary ? row.phpDoc.summary : null
					});
				}
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
						vis = info.visibility;
						isPublic = typeof vis === "string"
							? vis === "public"
							: vis.indexOf("public") > -1;
						if (!isPublic) {
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
		rowObjInfo.push(objInfo);
		if (typeof row !== "object") {
			row = {'':row};
		}
		for (i = 0, length = colKeys.length; i < length; i++) {
			k = colKeys[i];
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
