import { deHTML } from "./utility.js";

/* export function transformDynamicInput(event) {
	if (event.target.classList.contains("dynamicInputText")) {
		event.target.style.display = "none";
		let inputName = event.target.id.replace("span_dynamicInput_", "");
		let inputElement;
		if (event.target.classList.contains("large")) {
			inputElement = document.createElement("textarea");
		} else {
			inputElement = document.createElement("input");
			inputElement.type = "text";
		}
		inputElement.id = "input_dynamicInput_" + inputName;
		inputElement.value = event.target.innerHTML;
		event.target.after(inputElement);
		inputElement.focus();
		inputElement.addEventListener("focusout", untransformDynamicInput);
	}
}
function untransformDynamicInput(event) {
	let inputName = event.target.id.replace("input_dynamicInput_", "");
	if (event.target.value.length > 0) {
		document.getElementById("span_dynamicInput_" + inputName).innerHTML = event.target.value;
	}
	document.getElementById("span_dynamicInput_" + inputName).style.display = "inline-block";
	event.target.remove();
} */
export function unfocusEditableSpan(event) {
	if (event.target.contentEditable === "true") {
		if ((deHTML(event.target.innerHTML) === "") && (event.target.dataset.blank_allowed !== "true")) {
			event.target.innerHTML = "blank";
		}
	}
}
export function createElement(type, properties = {}, eventListeners = [], dataset = {}) {
	let out = document.createElement(type);
	for (let propertyName of Object.keys(properties)) {
		out[propertyName] = properties[propertyName];
	}
	for (let listener of eventListeners) {
		out.addEventListener(listener[0], listener[1]);
	}
	for (let dataName of Object.keys(dataset)) {
		out.dataset[dataName] = dataset[dataName];
	}
	return out;
}
export function createTable(array, rowStyles = [], colStyles = []) {
	// If some rows of the table have less columns than others, we set the rightmost column's colspan to span the rest of the row.
	// To do this accurately we need to know how many columns the biggest row has.
	let maximumTableColumns = array.map(row => row.length).reduce((a, b) => Math.max(a, b));
	let table = document.createElement("table");
	for (let rowNum = 0; rowNum < array.length; rowNum++) {
		let row = document.createElement("tr");
		row.style = rowStyles[rowNum] ?? "";
		for (let colNum = 0; colNum < array[rowNum].length; colNum++) {
			let nextCell = document.createElement("td");
			for (let property of Object.keys(colStyles[colNum] ?? {})) {
				nextCell.style[property] = colStyles[colNum][property];
			}
			let nextCellContents = (array[rowNum][colNum] instanceof HTMLElement) ? array[rowNum][colNum] : createElement("span", {innerHTML: array[rowNum][colNum]})
			nextCell.appendChild(nextCellContents);
			if ((array[rowNum].length - colNum) === 1) {
				nextCell.colSpan = String(maximumTableColumns - colNum);
			}
			row.appendChild(nextCell);
		}
		table.appendChild(row);
	}
	return table;
}