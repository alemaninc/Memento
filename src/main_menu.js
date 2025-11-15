import { createNotification } from "./notifications.js";
import { setGradingScaleType, updateGradingScaleHeader, updateGradingScaleTable } from "./grading_scale.js";
import { formatRangeOfPossibleMarks, rangeOfPossibleMarks, } from "./question_editor.js";
import { pluralizeWord, readTextFile } from "./utility.js";
import { extraOptions, globalQuestionProperties, QuestionTypes } from "./question_types.js";
import { openQuizPlayer } from "./question_player.js";
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
export function createNewQuiz() {
	globalThis.memento = {
		quizTitle: "New Quiz",
		quizAbstract: "This is a quiz.",
		gradingType: 0,
		grades: [["S", 100], ["A", 80], ["B", 70], ["C", 60], ["D", 50], ["E", 40], ["U", 0]],
		questions: {},
		questionCounter: 0,
	}
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
	for (let questionNum of Object.keys(quiz.questions)) {
		quiz.questions[questionNum] = correctQuestionProperties(quiz.questions[questionNum]);
	}
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
			out[propertyName] = structuredClone((question[propertyName] === undefined) ? extraOptions[propertyName].baseValue(question) : question[propertyName]);
		}
	}
	if (question.type === "composite") {
		for (let partNum = 0; partNum < question.parts.length; partNum++) {
			out.parts[partNum] = correctQuestionProperties(question.parts[partNum]);
		}
	}
	return structuredClone(out);
}
export function convertQuizToString(quiz) {
	for (let questionId of Object.keys(quiz.questions)) {
		quiz.questions[questionId] = correctQuestionProperties(quiz.questions[questionId]);
	}
	return "MEMENTO" + btoa(JSON.stringify(quiz)) + "ENDOFFILE";
}
export function convertStringToQuiz(string) {
	if (string.substring(0, 7) === "MEMENTO") {
		return JSON.parse(atob(string.substring(7, string.length - 9)));
	} else {
		return undefined;
	}
}
export function openLocalStorageQuizInEditor() {
	globalThis.memento = convertStringToQuiz(localStorage.memento);
	openQuizEditorRoot();
}
export async function openExemplarInEditor() {
	globalThis.memento = convertStringToQuiz(await readTextFile(await fetch("exemplar_memento.txt")));
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
	setGradingScaleType(globalThis.memento.gradingType);
	let numberOfQuestions = Object.values(globalThis.memento.questions).length;
	let numberOfMarks = Object.values(globalThis.memento.questions).map(x => rangeOfPossibleMarks(x)).reduce((x, y) => [x[0] + y[0], x[1] + y[1]], [0, 0]);
	document.getElementById("button_openQuestionEditorWindow").innerHTML = pluralizeWord(numberOfQuestions, "question") + "; " + formatRangeOfPossibleMarks(numberOfMarks);
}
export function openGradingScaleWindow() {
	openWindow("changeGradingScale");
	updateGradingScaleHeader();
	updateGradingScaleTable();
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
	for (let questionNum of Object.keys(quiz.questions)) {
		quiz.questions[questionNum] = correctQuestionProperties(quiz.questions[questionNum]);
	}
	globalThis.memento = quiz;
	openQuizPlayer();
}
export function openLocalStorageQuizInPlayer() {
	globalThis.memento = convertStringToQuiz(localStorage.memento);
	openQuizPlayer();
}
export async function openExemplarInPlayer() {
	globalThis.memento = convertStringToQuiz(await readTextFile(await fetch("exemplar_memento.txt")));
	openQuizPlayer();
}