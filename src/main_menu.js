import { createNotification } from "./notifications.js";
import { setGradingScaleType, updateGradingScaleHeader, updateGradingScaleTable } from "./grading_scale.js";
import { formatRangeOfPossibleMarks, rangeOfPossibleMarks, } from "./question_editor.js";
import { pluralizeWord, readTable, readTextFile } from "./utility.js";
import { extraOptions, globalQuestionProperties, QuestionTypes } from "./question_types.js";
import { openQuizPlayer } from "./question_player.js";
import { createElement, createTable } from "./html_support.js";
export function openWindow(id) {
	let windowList = document.getElementsByClassName("window")
	for (let windowID in Object.keys(windowList)) {;
		windowList[windowID].style.display = "none";
	}
	document.getElementById("window_" + id).style.display = "inline-block";
}
export function openStartMenu() {
	openWindow("startMenu");
}
export function openQuizEditorOpener() {
	openWindow("openQuizEditor");
	if ((localStorage.memento !== undefined) && (convertStringToQuiz(localStorage.memento) !== undefined)) {
		document.getElementById("button_openLocalStorageQuizEditor").style.display = "inline-block";
		document.getElementById("button_openLocalStorageQuizEditor").innerHTML = "Open '" + convertStringToQuiz(localStorage.memento).quizTitle + "'";
	} else {
		document.getElementById("button_openLocalStorageQuizEditor").style.display = "none";
	}
}
const initialMementoObject = {
	quizTitle: "New Quiz",
	quizAbstract: "This is a quiz.",
	quizInstructions: "Questions marked with a * asterisk may require more than one answer.",
	gradingType: 1,
	grades: [["S", 100], ["A", 80], ["B", 70], ["C", 60], ["D", 50], ["E", 40], ["U", 0]],
	topics: [],
	questions: {},
	questionCounter: 0,
};
export function createNewQuiz() {
	globalThis.memento = initialMementoObject;
	openQuizEditorRoot();
}
export function openImportQuizWindowEditor() {
	openWindow("importQuizEditor");
	changeImportQuizButtonLabelEditor();
}
export function changeImportQuizButtonLabelEditor() {
	if (document.getElementById("input_importQuizEditor").files.length !== 0) {
		let quizTitle = document.getElementById("input_importQuizEditor").files[0].name;
		let splitByPeriods = quizTitle.split("."); // remove file extension; this will normally be ".txt"
		quizTitle = splitByPeriods.slice(0, splitByPeriods.length - 1).join("");
		if (quizTitle !== undefined) {
			document.getElementById("button_importQuizEditor").innerHTML = "Import '" + quizTitle + "'";
		}
	}
}
export async function importQuizEditor() {
	if (document.getElementById("input_importQuizEditor").files.length === 0) {
		createNotification("Select a quiz first");
		return;
	}
	let file = document.getElementById("input_importQuizEditor").files[0];
	let contents = await readTextFile(file);
	let quiz = convertStringToQuiz(contents);
	if (quiz === undefined) {
		createNotification("Invalid import");
		return;
	}
	quiz = correctQuizProperties(quiz);
	globalThis.memento = quiz;
	openQuizEditorRoot();
}
function correctQuestionProperties(question) {
	let out = {}
	for (let propertyName of Object.keys(globalQuestionProperties)) {
		out[propertyName] = structuredClone((question[propertyName] === undefined) ? globalQuestionProperties[propertyName] : question[propertyName]);
	}
	for (let propertyName of Object.keys(QuestionTypes[question.type].properties)) {
		out[propertyName] = structuredClone((question[propertyName] === undefined) ? QuestionTypes[question.type].properties[propertyName] : question[propertyName]);
	}
	out.extraOptionsActive = out.extraOptionsActive.filter(x => Object.keys(extraOptions).includes(x));
	for (let propertyName of out.extraOptionsActive) {
		if (extraOptions[propertyName].type === "text") {
			out[propertyName] = structuredClone((question[propertyName] === undefined) ? extraOptions[propertyName].baseValue(question) : extraOptions[propertyName].correctValue(question[propertyName]));
		}
	}
	if (question.type === "composite") {
		for (let partNum = 0; partNum < question.parts.length; partNum++) {
			out.parts[partNum] = correctQuestionProperties(question.parts[partNum]);
		}
	}
	return structuredClone(out);
}
function correctQuizProperties(quiz) {
	for (let property of Object.keys(initialMementoObject)) {
		if (quiz[property] === undefined) {
			quiz[property] = initialMementoObject[property];
		}
	}
	for (let questionNum of Object.keys(quiz.questions)) {
		quiz.questions[questionNum] = correctQuestionProperties(quiz.questions[questionNum]);
	}
	return quiz;
}
/*
Format 1 = priginal format
           (quiz => MEMENTO + [quiz in base 64] + ENDOFFILE)
Format 2 = URI-encoded format, enables characters outside ASCII
           (quiz => MEMENTO_FORMAT_2__ + [quiz, encoded in URI, in base 64] + _ENDOFFILE)
*/
export function convertQuizToString(quiz) {
	quiz = correctQuizProperties(quiz);
	return "MEMENTO_FORMAT_2__" + btoa(encodeURIComponent(JSON.stringify(quiz))) + "_ENDOFFILE";
}
export function convertStringToQuiz(string) {
	if (string.substring(0, 18) === "MEMENTO_FORMAT_2__") {
		return JSON.parse(decodeURIComponent(atob(string.substring(18, string.length - 10))));
	} else if (string.substring(0, 7) === "MEMENTO") {
		return JSON.parse(atob(string.substring(7, string.length - 9)));
	} else {
		return undefined;
	}
}
export function openLocalStorageQuizInEditor() {
	let quiz = convertStringToQuiz(localStorage.memento);
	quiz = correctQuizProperties(quiz);
	globalThis.memento = quiz;
	openQuizEditorRoot();
}
export async function openExemplarInEditor() {
	let quiz = convertStringToQuiz(await readTextFile(await fetch("exemplar_memento.txt")));
	quiz = correctQuizProperties(quiz);
	globalThis.memento = quiz;
	openQuizEditorRoot();
}
export function downloadQuiz() {
  const blob = new Blob([convertQuizToString(globalThis.memento)], {
    type: "application/text"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = globalThis.memento.quizTitle + ".txt";
  a.click();
  URL.revokeObjectURL(url);
}
export function openQuizEditorRoot() {
	openWindow("quizEditorRoot");
	document.getElementById("td_quizEditor_quizTitle").innerHTML = globalThis.memento.quizTitle;
	document.getElementById("td_quizEditor_quizAbstract").innerHTML = globalThis.memento.quizAbstract;
	document.getElementById("td_quizEditor_quizInstructions").innerHTML = globalThis.memento.quizInstructions;
	setGradingScaleType(globalThis.memento.gradingType);
	document.getElementById("button_openTopicList").innerHTML = (globalThis.memento.topics.length === 0) ? "Topics not enabled" : pluralizeWord(globalThis.memento.topics.length, "topic");
	let numberOfQuestions = Object.values(globalThis.memento.questions).length;
	let numberOfMarks = Object.values(globalThis.memento.questions).map(x => rangeOfPossibleMarks(x)).reduce((x, y) => [x[0] + y[0], x[1] + y[1]], [0, 0]);
	document.getElementById("button_openQuestionEditorWindow").innerHTML = pluralizeWord(numberOfQuestions, "question") + "; " + formatRangeOfPossibleMarks(numberOfMarks);
}
export function openGradingScaleWindow() {
	openWindow("changeGradingScale");
	updateGradingScaleHeader();
	updateGradingScaleTable();
}
function generateTopicListTable() {
	document.getElementById("table_topicList").innerHTML = "";
	document.getElementById("table_topicList").appendChild(createTable([
		["Topic List", ""],
		...globalThis.memento.topics.map(function(row, topicId) {
			return [
				createElement("span", {innerHTML: row, id: "span_topicList" + topicId, contentEditable: "plaintext-only"}),
				createElement("button", {innerHTML: "Delete"}, [["click", function(event) {
					readTopicListTable();
					globalThis.memento.topics.splice(event.target.dataset.topicId, 1);
					updateEditorTypeSpecificHTML();
				}]], {topicId: topicId})
			]
		})
	], [], [{width: "300px"}, {width: "100px"}]));
}
export function readTopicListTable() {
	// We prevent duplicate topics from being saved as this will cause confusion when the quiz is being played.
	globalThis.memento.topics = Array.from(new Set(readTable(document.getElementById("table_topicList").children[0]).slice(1).map(x => x[0])));
}
export function openTopicList() {
	openWindow("topicList");
	generateTopicListTable();
}
export function addToTopicList() {
	readTopicListTable();
	let topicNum = 1;
	while (globalThis.memento.topics.includes("Topic " + topicNum)) {
		topicNum++;
	}
	globalThis.memento.topics.push("Topic " + topicNum);
	generateTopicListTable();
}
export function openQuizPlayerOpener() {
	openWindow("openQuizPlayer");
	if ((localStorage.memento !== undefined) && (convertStringToQuiz(localStorage.memento) !== undefined)) {
		document.getElementById("button_playLocalStorageQuiz").style.display = "inline-block";
		document.getElementById("button_playLocalStorageQuiz").innerHTML = "Open '" + convertStringToQuiz(localStorage.memento).quizTitle + "'";
	} else {
		document.getElementById("button_playLocalStorageQuiz").style.display = "none";
	}
}
export function openImportQuizWindowPlayer() {
	openWindow("importQuizPlayer");
	changeImportQuizButtonLabelPlayer();
}
export function changeImportQuizButtonLabelPlayer() {
	if (document.getElementById("input_importQuizPlayer").files.length !== 0) {
		let quizTitle = document.getElementById("input_importQuizPlayer").files[0].name;
		let splitByPeriods = quizTitle.split("."); // remove file extension; this will normally be ".txt"
		quizTitle = splitByPeriods.slice(0, splitByPeriods.length - 1).join("");
		if (quizTitle !== undefined) {
			document.getElementById("button_importQuizPlayer").innerHTML = "Import '" + quizTitle + "'";
		}
	}
}
export async function importQuizPlayer() {
	if (document.getElementById("input_importQuizPlayer").files.length === 0) {
		createNotification("Select a quiz first");
		return;
	}
	let file = document.getElementById("input_importQuizPlayer").files[0];
	let contents = await readTextFile(file);
	let quiz = convertStringToQuiz(contents);
	if (quiz === undefined) {
		createNotification("Invalid import");
		return;
	}
	quiz = correctQuizProperties(quiz);
	globalThis.memento = quiz;
	openQuizPlayer();
}
export function openLocalStorageQuizInPlayer() {
	let quiz = convertStringToQuiz(localStorage.memento);
	quiz = correctQuizProperties(quiz);
	globalThis.memento = quiz;
	openQuizPlayer();
}
export async function openExemplarInPlayer() {
	let quiz = convertStringToQuiz(await readTextFile(await fetch("exemplar_memento.txt")));
	quiz = correctQuizProperties(quiz);
	globalThis.memento = quiz;
	openQuizPlayer();
}