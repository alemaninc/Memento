import { alphabeticNumber } from "./utility.js";

export function setGradingScaleType(type) {
	if (![0, 1, 2].includes(type)) {
		type = 0;
	}
	globalThis.memento.gradingType = type;
	updateGradingScaleHeader();
	updateGradingScaleTable();
	document.getElementById("button_openGradingScaleWindow").innerHTML = ["No grading", "Fixed grade thresholds", "Adaptive grade thresholds"][globalThis.memento.gradingType];
}
export function updateGradingScaleHeader() {
	for (let mode = 0; mode < 3; mode++) {
		document.getElementById("button_setGradingScaleType" + mode).classList = (globalThis.memento.gradingType === mode) ? "menuButton active" : "menuButton"
	}
}
export function updateGradingScaleTable() {
	document.getElementById("table_gradingScale").innerHTML = "";
	if (globalThis.memento.gradingType !== 0) {
		let headerRow = document.createElement("tr")
		let headerCol1 = document.createElement("th");
		headerCol1.className = "gradingTableCol1";
		headerCol1.innerHTML = "Grade";
		headerRow.appendChild(headerCol1);
		if (globalThis.memento.gradingType === 1) {
			let headerCol2 = document.createElement("th");
			headerCol2.className = "gradingTableCol2";
			headerCol2.innerHTML = "%";
			headerRow.appendChild(headerCol2);
		}
		// column 3 and 4 are create and delete grade buttons
		let headerCol3 = document.createElement("th");
		headerCol3.className = "gradingTableCol3";
		headerRow.appendChild(headerCol3);
		let headerCol4 = document.createElement("th");
		headerCol4.className = "gradingTableCol4";
		headerRow.appendChild(headerCol4);
		document.getElementById("table_gradingScale").appendChild(headerRow);
		for (let gradeNum = 0; gradeNum < globalThis.memento.grades.length; gradeNum++) {
			let nextRow = document.createElement("tr");
			nextRow.dataset.gradeNum = gradeNum;
			let col1 = document.createElement("td");
			col1.className = "gradingTableCol1";
			col1.innerHTML = globalThis.memento.grades[gradeNum][0];
			col1.contentEditable = "true";
			nextRow.appendChild(col1);
			if (globalThis.memento.gradingType === 1) {
				let col2 = document.createElement("td");
				col2.className = "gradingTableCol2";
				if (gradeNum === 0) { // percentages of highest and lowest grades are fixed to 100 and 0
					col2.innerHTML = "100";
				} else if (gradeNum === (globalThis.memento.grades.length - 1)) {
					col2.innerHTML = "0";
				} else {
					col2.contentEditable = "true";
					col2.innerHTML = globalThis.memento.grades[gradeNum][1];
				}
				nextRow.appendChild(col2);
			}
			let col3 = document.createElement("td");
			col3.className = "gradingTableCol3";
			if (gradeNum !== 0) {
				let createButton = document.createElement("button");
				createButton.className = "createGradeButton";
				createButton.innerHTML = "+";
				col3.appendChild(createButton);
			}
			nextRow.appendChild(col3);
			let col4 = document.createElement("td");
			col4.className = "gradingTableCol4";
			if (![0, globalThis.memento.grades.length - 1].includes(gradeNum)) {
				let deleteButton = document.createElement("button");
				deleteButton.className = "deleteGradeButton";
				deleteButton.innerHTML = "Delete";
				col4.appendChild(deleteButton);
			}
			nextRow.appendChild(col4);
			document.getElementById("table_gradingScale").appendChild(nextRow);
		}
	}
}
export function updateGradesFromTable() {
	for (let gradeNum = 0; gradeNum < globalThis.memento.grades.length; gradeNum++) {
		if (globalThis.memento.gradingType !== 0) {
			globalThis.memento.grades[gradeNum][0] = document.getElementById("table_gradingScale").children[gradeNum + 1].children[0].innerText;
		}
		if (globalThis.memento.gradingType === 1) {
			globalThis.memento.grades[gradeNum][1] = Number(document.getElementById("table_gradingScale").children[gradeNum + 1].children[1].innerText);
		}
	}
	globalThis.memento.grades.sort((a, b) => a[1] < b[1]);
}
export function createGrade(event) {
	updateGradesFromTable();
	if (event.target.classList.contains("createGradeButton")) {
		let gradeName
		gradeNameLoop: for (let gradeCharNum = 1; true; gradeCharNum++) {
			let nextName = alphabeticNumber(gradeCharNum).toUpperCase();
			if (!globalThis.memento.grades.map(x => x[0]).includes(nextName)) {
				gradeName = nextName;
				break gradeNameLoop;
			}
		}
		let gradeNum = Number(event.target.parentElement.parentElement.dataset.gradeNum);
		let percentage = (globalThis.memento.grades[gradeNum - 1][1] + globalThis.memento.grades[gradeNum][1]) / 2 // get midpoint of two adjacent grades for percentage
		globalThis.memento.grades.splice(event.target.parentElement.parentElement.dataset.gradeNum, 0, [gradeName, percentage]);
		updateGradingScaleTable();
	}
}
export function deleteGrade(event) {
	updateGradesFromTable();
	if (event.target.classList.contains("deleteGradeButton")) {
		globalThis.memento.grades.splice(event.target.parentElement.parentElement.dataset.gradeNum, 1);
		updateGradingScaleTable();
	}
}