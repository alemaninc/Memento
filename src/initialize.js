"use strict";
import { changeImportQuizButtonLabel, createNewQuiz, importQuiz, openImportQuizWindow, openQuizEditor } from "./mainMenu.js";
document.getElementById("button_openQuizEditor").addEventListener("click", openQuizEditor);
document.getElementById("button_createNewQuiz").addEventListener("click", createNewQuiz);
document.getElementById("button_openImportQuizWindow").addEventListener("click", openImportQuizWindow);
document.getElementById("input_importQuiz").addEventListener("change", changeImportQuizButtonLabel);
document.getElementById("button_importQuiz").addEventListener("click", importQuiz);