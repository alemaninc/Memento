import { createElement } from "./html_support.js";
import { openQuizEditorRoot, openWindow } from "./main_menu.js";
import { createNotification } from "./notifications.js";
import { extraOptions, globalQuestionProperties, QuestionTypes } from "./question_types.js";
import { getAllQuestionTopics, getQuestionObject, maxMark } from "./question_utility.js";
import { deHTML, formatInteger, pluralizeWord, toggleButtonActive, trimString } from "./utility.js";

export function questionSummary(question, onClick, displayedId, depth) {
	let out = createElement("button", {className: "questionSummary", innerHTML: questionStemInEditor(question, depth, true, 70), style: "position: relative;"}, [["click", onClick]]);
	let topic = getAllQuestionTopics(question).sort((a, b) => globalThis.memento.topics.indexOf(a) > globalThis.memento.topics.indexOf(b));
	out.appendChild(createElement("span", {style: "position: absolute; top: 5px; left: 5px; font-size: 11px", innerHTML: displayedId + ((topic.length === 0) ? "" : (" | " + trimString(topic.join(", "), 30)))}));
	out.appendChild(createElement("span", {style: "position: absolute; top: 5px; right: 5px; font-size: 11px", innerHTML: formatRangeOfPossibleMarks(rangeOfPossibleMarks(question))}));
	out.appendChild(createElement("span", {style: "position: absolute; bottom: 5px; left: 5px; font-size: 11px", innerHTML: QuestionTypes[readQuestionProperty(question, [], "type")].name}));
	let difficultyRange = questionDifficultyRange(question);
	if ((globalThis.memento.gradingType === 2) && (difficultyRange[0] !== Infinity)) {
		let gradeList = globalThis.memento.grades.map(x => x[0]);
		let gradeText = (difficultyRange[0] === difficultyRange[1]) ? ("Grade " + gradeList[difficultyRange[0]]) : ("Grades " + gradeList[difficultyRange[0]] + " - " + gradeList[difficultyRange[1]]);
		out.appendChild(createElement("span", {style: "position: absolute; bottom: 5px; right: 5px; font-size: 11px", innerHTML: gradeText}));
	}
	return out;
}
export function openQuestionEditor() {
	openWindow("questionEditor");
	document.getElementById("button_pasteQuestionToRoot").style.display = (globalThis.memento.questions.Cut === undefined) ? "none" : "inline-block";
	if (Object.keys(globalThis.memento.questions).length === 0) {
		document.getElementById("div_questionList").innerHTML = "Create a question to use the question selector.";
	} else {
		document.getElementById("div_questionList").innerHTML = "";
		questionLoop: for (let id of Object.keys(globalThis.memento.questions)) {
			// If filter is active
			let question = globalThis.memento.questions[id];
			if ((globalThis.mementoTemp.editorFilterTopic !== undefined) && (id !== "Cut") && (!getAllQuestionTopics(question).includes(globalThis.mementoTemp.editorFilterTopic))) {
				continue questionLoop;
			}
			document.getElementById("div_questionList").appendChild(questionSummary(question, function(){
				globalThis.mementoTemp.selectedQuestion = [id];
				openQuestionInEditor();
			}, (id === "Cut") ? "Clipboard" : ("ID: " + id), 0));
		}
		if (document.getElementById("div_questionList").children.length === 0) { // If this is the case then all questions have been filtered
			document.getElementById("div_questionList").innerHTML = "No matches for this filter.";
		}
	}
}
export function questionStemInEditor(questionObject, depth, firstIteration, maxLength) {
	let out = "";
	if (questionObject.extraOptionsActive.includes("floatingStem")) {
		out += deHTML(questionObject.floatingStem.replaceAll("<br>", " ")).replaceAll("\n", " ");
		if (questionObject.stem !== "") {
			out += " ";
		}
	}
	out += deHTML(questionObject.stem.replaceAll("<br>", " ")).replaceAll("\n", " ");
	if (questionObject.type === "composite") {
		for (let partNum = 0; partNum < questionObject.parts.length; partNum++) {
			out += " " + QuestionTypes.composite.questionNumber(depth + 1, partNum) + " " + questionStemInEditor(questionObject.parts[partNum], depth + 1, false, maxLength);
		}
	}
	if (firstIteration) {
		out = trimString(out, maxLength);
	}
	return out;
}
export function createQuestion() {
	let questionID = 1;
	while (globalThis.memento.questions[questionID] !== undefined) {
		questionID++;
	}
	globalThis.mementoTemp.selectedQuestion = [questionID];
	globalThis.memento.questions[questionID] = structuredClone(globalQuestionProperties);
	setQuestionType("openKeywords");
	openQuestionInEditor();
}
export function setQuestionType(type) {
	changeCurrentQuestionProperty("type", type);
	for (let property of Object.entries(QuestionTypes[type].properties)) {
		if (readCurrentQuestionProperty(property[0]) === undefined) {
			changeCurrentQuestionProperty(property[0], structuredClone(property[1]));
		}
	}
	updateSelectedQuestionHTML();
}
export function fullQuestionNumber(selectedArray = globalThis.mementoTemp.selectedQuestion) {
	return selectedArray.map((partNumber, layerNumber) => ((layerNumber === 0) && (partNumber === "Cut")) ? "in Clipboard" : QuestionTypes.composite.questionNumber(layerNumber, partNumber)).join("");
}
export function openQuestionInEditor() {
	openWindow("selectedEditorQuestion");
	document.getElementById("span_selectedEditorQuestionHeader").innerHTML = "Question " + fullQuestionNumber();
	document.getElementById("button_cutSelectedEditorQuestion").style.display = (globalThis.memento.questions.Cut === undefined) ? "inline-block" : "none";
	document.getElementById("button_pasteSelectedEditorQuestion").style.display = ((globalThis.mementoTemp.selectedQuestion[0] === "Cut") || (globalThis.memento.questions.Cut === undefined) || (readCurrentQuestionProperty("type") !== "composite")) ? "none" : "inline-block";
	updateSelectedQuestionHTML();
}
function updateSelectedQuestionHTML() {
	document.getElementById("td_selectedQuestionStem").innerHTML = readCurrentQuestionProperty("stem");
	for (let typeButtonID of Object.keys(QuestionTypes)) {
		if (typeButtonID === readCurrentQuestionProperty("type")) {
			document.getElementById("button_setQuestionType" + typeButtonID).classList.add("active");
		} else {
			document.getElementById("button_setQuestionType" + typeButtonID).classList.remove("active");
		}
	}
	updateEditorTypeSpecificHTML();
	if ((globalThis.memento.gradingType === 2) && (readCurrentQuestionProperty("type") !== "composite")) {
		document.getElementById("tr_questionDifficulty").style.display = "table-row";
		document.getElementById("td_questionDifficulty").innerHTML = "";
		for (let grade of globalThis.memento.grades.slice(1, globalThis.memento.grades.length - 1)) {
			document.getElementById("td_questionDifficulty").appendChild(createElement(
				"button",
				{innerHTML: grade[0], className: readCurrentQuestionProperty("grade").includes(grade[0]) ? "active" : "", style: "width: 160px"},
				[["click", toggleButtonActive]]
			));
		}
	} else {
		document.getElementById("tr_questionDifficulty").style.display = "none";
	}
	if (globalThis.memento.topics.length !== 0) {
		document.getElementById("tr_questionTopic").style.display = "table-row";
		document.getElementById("td_questionTopic").innerHTML = "";
		for (let topic of globalThis.memento.topics) {
			document.getElementById("td_questionTopic").appendChild(createElement(
				"button",
				{innerHTML: topic, className: readCurrentQuestionProperty("topic").includes(topic) ? "active" : "", style: "width: 160px"},
				[["click", toggleButtonActive]]
			));
		}
	} else {
		document.getElementById("tr_questionTopic").style.display = "none";
	}
	updateExtraOptionButtons();
	document.getElementById("button_closeSelectedEditorQuestion").innerHTML = (globalThis.mementoTemp.selectedQuestion.length === 1) ? "Return to question selector" : ("Return to Question " + fullQuestionNumber(globalThis.mementoTemp.selectedQuestion.slice(0, globalThis.mementoTemp.selectedQuestion.length - 1)));
	document.getElementById("button_deflateSelectedEditorQuestion").style.display = (readCurrentQuestionProperty("type") === "composite") ? "inline-block" : "none";
}
export function updateEditorTypeSpecificHTML() {
	document.getElementById("td_questionEditorTypeSpecificHeading").innerHTML = QuestionTypes[readCurrentQuestionProperty("type")].editorTypeSpecificHeading;
	document.getElementById("td_questionEditorTypeSpecific").innerHTML = "";
	let newHTML = QuestionTypes[readCurrentQuestionProperty("type")].editorHTML();
	newHTML = (newHTML instanceof Array) ? newHTML : [newHTML];
	for (let childNum = 0; childNum < newHTML.length; childNum++) {
		document.getElementById("td_questionEditorTypeSpecific").appendChild(newHTML[childNum]);
	}
	if (QuestionTypes[readCurrentQuestionProperty("type")].editorHTML2 !== undefined) {
		document.getElementById("tr_questionEditorTypeSpecific2").style.display = "table-row";
		document.getElementById("td_questionEditorTypeSpecificHeading2").innerHTML = QuestionTypes[readCurrentQuestionProperty("type")].editorTypeSpecificHeading2;
		document.getElementById("td_questionEditorTypeSpecific2").innerHTML = "";
		let newHTML2 = QuestionTypes[readCurrentQuestionProperty("type")].editorHTML2();
		newHTML2 = (newHTML instanceof Array) ? newHTML2 : [newHTML2];
		for (let childNum = 0; childNum < newHTML2.length; childNum++) {
			document.getElementById("td_questionEditorTypeSpecific2").appendChild(newHTML2[childNum]);
		}
	} else {
		document.getElementById("tr_questionEditorTypeSpecific2").style.display = "none";
	}
}
export function readEditorTypeSpecificHTML() {
	if (document.getElementById("window_selectedEditorQuestion").style.display === "inline-block") {
		QuestionTypes[readCurrentQuestionProperty("type")].readEditorHTML();
	}
}
export function rangeOfPossibleMarks(question) { // this is used in question summary buttons due to the "show only some parts" extra option, which can cause questions to have a varying number of marks
	if (question.type === "composite") {
		if (question.extraOptionsActive.includes("selectParts")) {
			let minimalMarks = question.parts.map(x => rangeOfPossibleMarks(x)[0]).sort((a, b) => a > b);
			let maximalMarks = question.parts.map(x => rangeOfPossibleMarks(x)[1]).sort((a, b) => a < b);
			return [minimalMarks.slice(0, question.selectParts[0]).reduce((a, b) => a + b, 0), maximalMarks.slice(0, question.selectParts[1]).reduce((a, b) => a + b, 0)];
		} else {
			let out = [0, 0]
			for (let part of question.parts) {
				let partMarks = rangeOfPossibleMarks(part);
				out = [out[0] + partMarks[0], out[1] + partMarks[1]];
			}
			return out;
		}
	} else {
		return [maxMark(question), maxMark(question)];
	}
}
export function formatRangeOfPossibleMarks(markRange) {
	if (markRange[0] === markRange[1]) {
		return pluralizeWord(markRange[0], "mark");
	} else {
		return formatInteger(markRange[0]) + " - " + formatInteger(markRange[1]) + " marks";
	}
}
export function questionDifficultyRange(question) {
	if (question.type === "composite") {
		// find the position of the highest and lowest grade difficulty within the question, where 0 = the highest grade.
		let lowestGradeID = Infinity;
		let highestGradeID = -1;
		for (let part of question.parts) {
			let partRange = questionDifficultyRange(part);
			lowestGradeID = Math.min(partRange[0], lowestGradeID);
			highestGradeID = Math.max(partRange[1], highestGradeID);
		}
		return [lowestGradeID, highestGradeID];
	} else {
		let gradePositions = question.grade.filter(x => globalThis.memento.grades.map(i => i[0]).includes(x)).map(x => globalThis.memento.grades.map(x => x[0]).indexOf(x));
		return (gradePositions.length === 0) ? [Infinity, -1] : [gradePositions.reduce((x, y) => Math.min(x, y)), gradePositions.reduce((x, y) => Math.max(x, y))];
	}
}
function changeQuestionProperty(questionObject, partArray, propertyName, newValue) { // we use this to edit properties of deeply nested composite questions reliably
	let out = structuredClone(questionObject);
	if (partArray.length === 0) {
		out[propertyName] = newValue;
	} else {
		out.parts[partArray[0]] = changeQuestionProperty(questionObject.parts[partArray[0]], partArray.slice(1), propertyName, newValue);
	}
	return out;
}
export function changeCurrentQuestionProperty(propertyName, newValue) { // shorthand for previous function
	globalThis.memento.questions[globalThis.mementoTemp.selectedQuestion[0]] = changeQuestionProperty(globalThis.memento.questions[globalThis.mementoTemp.selectedQuestion[0]], globalThis.mementoTemp.selectedQuestion.slice(1), propertyName, newValue);
}
function readQuestionProperty(questionObject, partArray, propertyName) { // we use this to edit properties of deeply nested composite questions reliably
	if (partArray.length === 0) {
		return questionObject[propertyName];
	} else {
		return readQuestionProperty(questionObject.parts[partArray[0]], partArray.slice(1), propertyName);
	}
}
export function readCurrentQuestionProperty(propertyName) { // shorthand for previous function
	return readQuestionProperty(globalThis.memento.questions[globalThis.mementoTemp.selectedQuestion[0]], globalThis.mementoTemp.selectedQuestion.slice(1), propertyName);
}
function getCurrentQuestionObject() {
	return getQuestionObject(globalThis.memento.questions[globalThis.mementoTemp.selectedQuestion[0]], globalThis.mementoTemp.selectedQuestion.slice(1));
}
export function updateCurrentQuestionProperties() {
	changeCurrentQuestionProperty("stem", document.getElementById("td_selectedQuestionStem").innerHTML);
	readEditorTypeSpecificHTML();
	changeCurrentQuestionProperty("grade", Array.from(document.getElementById("td_questionDifficulty").children).filter(x => x.classList.contains("active")).map(x => x.innerHTML));
	changeCurrentQuestionProperty("topic", Array.from(document.getElementById("td_questionTopic").children).filter(x => x.classList.contains("active")).map(x => x.innerHTML));
}
export function closeSelectedEditorQuestion() {
	globalThis.mementoTemp.selectedQuestion.splice(globalThis.mementoTemp.selectedQuestion.length - 1);
	if (globalThis.mementoTemp.selectedQuestion.length === 0) {
		openQuestionEditor();
	} else {
		openQuestionInEditor();
	}
}
export function inflateSelectedEditorQuestion() {
	updateCurrentQuestionProperties();
	let currentQuestion = structuredClone(getCurrentQuestionObject());
	for (let propertyName of Object.keys(globalQuestionProperties)) {
		changeCurrentQuestionProperty(propertyName, structuredClone(globalQuestionProperties[propertyName]));
	}
	setQuestionType("composite");
	changeCurrentQuestionProperty("parts", [currentQuestion]);
	openQuestionInEditor();
}
export function deflateSelectedEditorQuestion() {
	updateCurrentQuestionProperties();
	if (globalThis.mementoTemp.selectedQuestion.length === 1) { // Split all parts of this question into standalone questions
		let startingId = Object.keys(memento.questions).map(x => Number(x)).reduce((a, b) => Math.max(a, b)) + 1; // For this algorithm, instead of allocating the smallest numbers possible, we will allocate numbers at the end of the range so that parts of this question end up next to each other.
		let parts = readCurrentQuestionProperty("parts");
		let parentTopic = readCurrentQuestionProperty("topic");
		for (let partNum = 0; partNum < parts.length; partNum++) {
			parts[partNum].topic.push(...parentTopic);
			parts[partNum].topic = Array.from(new Set(parts[partNum].topic));
			globalThis.memento.questions[startingId + partNum] = parts[partNum];
		}
		delete globalThis.memento.questions[globalThis.mementoTemp.selectedQuestion[0]];
		openQuizEditorRoot();
	} else { // Split the parts of this question into parts of the parent question
		let currentPartId = globalThis.mementoTemp.selectedQuestion.splice(globalThis.mementoTemp.selectedQuestion.length - 1, 1)[0];
		readCurrentQuestionProperty("parts").splice(currentPartId, 1, ...structuredClone(readCurrentQuestionProperty("parts")[currentPartId].parts));
		openQuestionInEditor();
	}
}
export function duplicateSelectedEditorQuestion() {
	updateCurrentQuestionProperties();
	let currentQuestion = structuredClone(getCurrentQuestionObject());
	let selected = globalThis.mementoTemp.selectedQuestion;
	if (selected.length === 1) { // if this is a standalone question, append the clone to the main question bank
		let questionID = 1;
		while (globalThis.memento.questions[questionID] !== undefined) {
			questionID++;
		}
		globalThis.mementoTemp.selectedQuestion = [questionID];
		globalThis.memento.questions[questionID] = currentQuestion;
		openQuestionInEditor();
	} else { // if this is part of a question, append it at the end of the parent question
		readQuestionProperty(globalThis.memento.questions[selected[0]], selected.slice(1, selected.length - 1), "parts").push(currentQuestion);
		globalThis.mementoTemp.selectedQuestion[selected.length - 1] = readQuestionProperty(globalThis.memento.questions[selected[0]], selected.slice(1, selected.length - 1), "parts").length - 1;
		openQuestionInEditor();
	}
}
export function cutSelectedEditorQuestion() {
	if (globalThis.memento.questions.Cut === undefined) {
		globalThis.memento.questions.Cut = structuredClone(getCurrentQuestionObject());
		deleteSelectedEditorQuestion(undefined, true);
	} else {
		createNotification("You must paste or delete the question already in the clipboard before cutting another.");
	}
}
export function pasteSelectedEditorQuestion() {
	if (globalThis.memento.questions.Cut === undefined) {
		createNotification("You must cut a question before you can paste it.");
	} else {
		if (globalThis.mementoTemp.selectedQuestion.length === 0) {
			let questionID = 1;
			while (globalThis.memento.questions[questionID] !== undefined) {
				questionID++;
			}
			globalThis.mementoTemp.selectedQuestion = [questionID];
			globalThis.memento.questions[questionID] = structuredClone(globalThis.memento.questions.Cut);
			delete globalThis.memento.questions.Cut;
			openQuestionInEditor();
		} else {
			if (readCurrentQuestionProperty("type") !== "composite") {
				createNotification("The selected question must be composite in order to paste a part into it.");
			} else {
				readCurrentQuestionProperty("parts").push(structuredClone(globalThis.memento.questions.Cut));
				globalThis.mementoTemp.selectedQuestion.push(readCurrentQuestionProperty("parts").length - 1);
				delete globalThis.memento.questions.Cut;
				openQuestionInEditor();
			}
		}
	}
}
export function deleteSelectedEditorQuestion(event, skipConfirmation = false) { // `event` must be an unused parameter as this gets passed to all event listeners.
	let selectedArray = globalThis.mementoTemp.selectedQuestion;
	if (skipConfirmation || confirm("Delete Question " + fullQuestionNumber() + "?")) {
		if (selectedArray.length === 1) {
			delete globalThis.memento.questions[selectedArray[0]];
		} else {
			readQuestionProperty(globalThis.memento.questions[selectedArray[0]], selectedArray.slice(1, selectedArray.length - 1), "parts").splice(selectedArray[selectedArray.length - 1], 1);
		}
		closeSelectedEditorQuestion();
	}
}
export function filterEditorQuestions() {
	document.getElementById("div_editorFilterSelection").innerHTML = "";
	if ((globalThis.mementoTemp.editorFilterTopic === undefined) && (!document.getElementById("button_filterEditorQuestions").classList.contains("on"))) {
		document.getElementById("button_filterEditorQuestions").classList.add("on");
		for (let topic of globalThis.memento.topics) {
			document.getElementById("div_editorFilterSelection").appendChild(createElement("button", {
				style: "width: 160px",
				innerHTML: topic,
			}, [["click", function(event) {
				globalThis.mementoTemp.editorFilterTopic = event.target.innerHTML;
				document.getElementById("div_editorFilterSelection").innerHTML = "";
				document.getElementById("button_filterEditorQuestions").classList.remove("on");
				document.getElementById("button_filterEditorQuestions").innerHTML = "Clear editor filter";
				openQuestionEditor(); // This regenerates the question list.
			}]]))
		}
	} else {
		globalThis.mementoTemp.editorFilterTopic = undefined;
		document.getElementById("button_filterEditorQuestions").classList.remove("on");
		document.getElementById("button_filterEditorQuestions").innerHTML = "Filter by topic";
		openQuestionEditor(); // This regenerates the question list.
	}
}
export function toggleExtraOption(id) {
	if (readCurrentQuestionProperty("extraOptionsActive").includes(id)) {
		readCurrentQuestionProperty("extraOptionsActive").splice(readCurrentQuestionProperty("extraOptionsActive").indexOf(id), 1)
			changeCurrentQuestionProperty(id, undefined);
	} else {
		readCurrentQuestionProperty("extraOptionsActive").push(id);
		if (extraOptions[id].type === "text") {
			changeCurrentQuestionProperty(id, extraOptions[id].baseValue(getCurrentQuestionObject()));
		}
	}
	updateExtraOptionButtons();
}
export function updateExtraOptionButtons() {
	for (let id of Object.keys(extraOptions)) {
		let questionType = readCurrentQuestionProperty("type");
		if ((extraOptions[id].allowedTypes ?? Object.keys(QuestionTypes)).includes(questionType) && (!(extraOptions[id].disallowedTypes ?? []).includes(questionType))) {
			document.getElementById("button_extraOption_" + id).style.display = "inline-block";
			if (readCurrentQuestionProperty("extraOptionsActive").includes(id)) {
				document.getElementById("button_extraOption_" + id).classList.add("on");
				if (extraOptions[id].type === "text") {
					document.getElementById("tr_extraOption_" + id).style.display = "table-row";
					document.getElementById("td_extraOption_" + id).innerHTML = extraOptions[id].writeValue(readCurrentQuestionProperty(id));
				}
			} else {
				document.getElementById("button_extraOption_" + id).classList.remove("on");
				if (extraOptions[id].type === "text") {
					document.getElementById("tr_extraOption_" + id).style.display = "none";
				}
			}
		} else {
			document.getElementById("button_extraOption_" + id).style.display = "none";
			if (extraOptions[id].type === "text") {
				document.getElementById("tr_extraOption_" + id).style.display = "none";
			}
		}
	}
}