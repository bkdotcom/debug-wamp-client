import $ from 'jquery';		// external global

var colKeys = [];
var colClasses = {};
var rowObjInfo = [];
var totals = {};
var $table;

export function Table(dump) {
	this.dump = dump;
}

Table.prototype.build = function(rows, meta, classname) {
	// console.warn('methodTable', meta, classname);
	var i,
		length,
		propName,
		propsNew = {},
		property,
		$caption;
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
	if (this.isAbstraction(rows)) {
		if (rows.type == "object") {
			// reusing classname var
			classname = this.dump.markupIdentifier(rows.className, {
				title: rows.phpDoc.summary
			});
			$caption = $table.find('caption');
			if ($caption.text().length) {
				$caption.append(" (" + classname + ")");
			} else {
				$caption.html(classname);
			}
		}
		if (Object.keys(rows.traverseValues).length) {
			rows = rows.traverseValues;
		} else {
			for (propName in rows.properties) {
				property = rows.properties[propName];
				if (["private","protected"].indexOf(property.visibility) > -1) {
					continue;
				}
				propsNew[propName] = property.value;
			}
			rows = propsNew;
		}
	}
	colKeys = meta.columns.length ? meta.columns : this.getTableKeys(rows);
	// remove __key if it's a thing
	i = colKeys.indexOf('__key');
	if (i > -1) {
		colKeys.splice(i, 1);
	}
	this.buildHead();
	this.buildBody(rows, meta);
	this.addTotals();
	this.addColObjInfo();
	addRowObjInfo();
	return $table;
};

Table.prototype.buildHead = function() {
	var i, length, colKey;
	for (i = 0, length = colKeys.length; i < length; i++) {
		colKey = colKeys[i];
		if (colKey === '') {
			colKey = 'value';
		}
		colClasses[colKey] = null;  // initialize
		$table.find('thead tr').append(
			'<th scope="col">'+this.dump.dump(colKey, true, false, false)+'</th>'
		);
	}
}

Table.prototype.buildBody = function(rows, meta) {
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
        if (row.__key) {
            rowKey = row.__key;
        }
		// using for in, so every key will be a string
		//  check if actually an integer
		if (typeof rowKey == "string" && rowKey.match(/^\d+$/) && Number.isSafeInteger(rowKey)) {
			rowKey = parseInt(rowKey, 10);
		}
		classAndInner = parseAttribString(this.dump.dump(rowKey, true, true, false));
		classname = /^\d+$/.test(rowKey) ? 't_int' : classAndInner.class;
		$tr = $('<tr><th scope="row" class="t_key '+classname+' text-right">'+classAndInner.innerhtml+'</th></tr>');
		values = this.getValues(row);
		for (i2 = 0, length2 = values.length; i2 < length2; i2++) {
			if (totals[colKeys[i2]] !== undefined) {
				totals[colKeys[i2]] += values[i2];
			}
			classAndInner = parseAttribString(this.dump.dump(values[i2], true));
			$tr.append('<td class="'+classAndInner.class+'">'+classAndInner.innerhtml+'</td>');
		}
		$table.append($tr);
	}
}

Table.prototype.addColObjInfo = function() {
	var colKey, classname,
		self = this;
	for (colKey in colClasses) {
		if (!colClasses[colKey]) {
			continue;
		}
		$table.find('thead tr th').each(function(){
			if ($(this).text() === colKey) {
				classname = colClasses[colKey];
				$(this).append(' ' + self.dump.markupIdentifier(classname));
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
Table.prototype.addTotals = function() {
	var i,
		length,
		cell = '',
		cells = [],
		classAndInner,
		colHasTotal = false,
		colKey,
		haveTotal = false,
		total;
	for (i = 0, length = colKeys.length; i < length; i++) {
		colKey = colKeys[i];
		colHasTotal = totals[colKey] !== undefined && totals[colKey] !== null;
		haveTotal = haveTotal || colHasTotal;
		cell = '<td></td>';
		if (colHasTotal) {
			total = parseFloat(totals[colKey].toFixed(6), 10);
			classAndInner = parseAttribString(this.dump.dump(total, true));
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

Table.prototype.isAbstraction = function(val) {
	return val &&
		typeof val == "object" &&
		typeof val.debug == "string" &&
		val.debug === this.dump.ABSTRACTION;
}

Table.prototype.getTableKeys = function(obj) {
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
		isAbs = this.isAbstraction(row);
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

Table.prototype.getValues = function(row) {
	var isAbs = this.isAbstraction(row),
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
				objInfo = this.dump.markupIdentifier(row.className, {
					title: row.phpDoc.summary ? row.phpDoc.summary : null
				}, 'td');
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
	if (row === null || typeof row !== "object") {
		row = {'':row};
	}

	for (i = 0, length = colKeys.length; i < length; i++) {
		k = colKeys[i];
		value = typeof row[k] !== "undefined"
			? row[k]
			: this.dump.UNDEFINED;
		if (this.dump.getType(value) == "object") {
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
		} else if (value !== this.dump.UNDEFINED && value !== null) {
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
