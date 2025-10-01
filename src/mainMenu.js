"use strict";
import { openWindow } from "./navigation.js";
import { createNotification } from "./notifications.js";
export function openQuizEditor() {
	openWindow("openQuizEditor");
}
export function createNewQuiz() {
	globalThis.quizEditor_currentQuiz = {
		quizTitle: "New Quiz",
		grades: undefined,
		questions: []
	}
}
export function openImportQuizWindow() {
	openWindow("importQuiz");
}
export async function changeImportQuizButtonLabel() {
	let quizName = document.getElementById("input_importQuiz").files[0].name;
	let splitByPeriods = quizName.split("."); // remove file extension; this will normally be ".txt"
	quizName = splitByPeriods.slice(0, splitByPeriods.length - 1).join("");
	if (quizName !== undefined) {
		document.getElementById("button_importQuiz").innerHTML = "Import '" + quizName + "'";
	}
}
export async function importQuiz() {
	if (document.getElementById("input_importQuiz").files.length === 0) {
		createNotification("Select a file before importing a quiz");
	} else {
	  let file = document.getElementById("input_importQuiz").files[0];
  	let bytes = await file.bytes();
 		console.log(bytes);
  	let contents = new TextDecoder().decode(bytes);
 		console.log(contents);
  	globalThis.quizEditor_currentQuiz = JSON.parse(atob(contents));
	}
}