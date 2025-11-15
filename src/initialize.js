import { changeImportQuizButtonLabelEditor, changeImportQuizButtonLabelPlayer, createNewQuiz, downloadQuiz, importQuizEditor, importQuizPlayer, openExemplarInEditor, openExemplarInPlayer, openGradingScaleWindow, openImportQuizWindowEditor, openImportQuizWindowPlayer, openLocalStorageQuizInEditor, openLocalStorageQuizInPlayer, openQuizEditorOpener, openQuizEditorRoot, openQuizPlayerOpener, openStartMenu } from "./main_menu.js";
import { createGrade, deleteGrade, setGradingScaleType, updateGradesFromTable } from "./grading_scale.js";
import { changeCurrentQuestionProperty, closeSelectedEditorQuestion, createQuestion, deflateSelectedEditorQuestion, deleteSelectedEditorQuestion, duplicateSelectedEditorQuestion, inflateSelectedEditorQuestion, openQuestionEditor, setQuestionType, toggleExtraOption, updateCurrentQuestionProperties } from "./question_editor.js";
import { extraOptions, QuestionTypes } from "./question_types.js";
import { createElement, unfocusEditableSpan } from "./html_support.js";
import { saveEditorQuizToLocalStorage } from "./local_storage.js";
import { markQuestion, openQuizPlayer, showQuizInstructions, startQuestion, startQuiz, updateTotalMarkInputDisplay } from "./question_player.js";

globalThis.mementoTemp = {};
document.body.addEventListener("focusout", unfocusEditableSpan);
// make editor reactive
document.getElementById("button_openQuizEditorOpener").addEventListener("click", openQuizEditorOpener);
document.getElementById("button_createNewQuiz").addEventListener("click", createNewQuiz);
document.getElementById("button_openImportQuizWindowEditor").addEventListener("click", openImportQuizWindowEditor);
document.getElementById("input_importQuizEditor").addEventListener("change", changeImportQuizButtonLabelEditor);
document.getElementById("button_importQuizEditor").addEventListener("click", importQuizEditor);
document.getElementById("button_openLocalStorageQuizEditor").addEventListener("click", openLocalStorageQuizInEditor);
document.getElementById("button_openExemplarInEditor").addEventListener("click", openExemplarInEditor);
document.getElementById("button_quizEditorOpenerReturnToStart").addEventListener("click", openStartMenu);
document.getElementById("button_quizImportWindowEditorReturnToOpener").addEventListener("click", openQuizEditorOpener);
document.getElementById("td_quizEditor_quizTitle").addEventListener("focusout", function(event){globalThis.memento.quizTitle = event.target.innerHTML;})
document.getElementById("td_quizEditor_quizAbstract").addEventListener("focusout", function(event){globalThis.memento.quizAbstract = event.target.innerHTML;})
document.getElementById("button_openGradingScaleWindow").addEventListener("click", openGradingScaleWindow);
document.getElementById("button_closeGradingScaleWindow").addEventListener("click", function(){updateGradesFromTable(); openQuizEditorRoot();});
for (let gradingType = 0; gradingType < 3; gradingType++) {
	document.getElementById("button_setGradingScaleType" + gradingType).addEventListener("click", function(){updateGradesFromTable(); setGradingScaleType(gradingType);});
}
document.getElementById("table_gradingScale").addEventListener("click", createGrade);
document.getElementById("table_gradingScale").addEventListener("click", deleteGrade);
document.getElementById("button_openQuestionEditorWindow").addEventListener("click", openQuestionEditor);
document.getElementById("button_closeQuestionEditorWindow").addEventListener("click", openQuizEditorRoot);
document.getElementById("button_createQuestion").addEventListener("click", createQuestion);
document.getElementById("button_closeSelectedEditorQuestion").addEventListener("click", function(){updateCurrentQuestionProperties(); closeSelectedEditorQuestion();});
document.getElementById("button_inflateSelectedEditorQuestion").addEventListener("click", inflateSelectedEditorQuestion);
document.getElementById("button_deflateSelectedEditorQuestion").addEventListener("click", deflateSelectedEditorQuestion);
document.getElementById("button_duplicateSelectedEditorQuestion").addEventListener("click", duplicateSelectedEditorQuestion);
document.getElementById("button_deleteSelectedEditorQuestion").addEventListener("click", deleteSelectedEditorQuestion);
for (let type of Object.keys(QuestionTypes)) {
	let nextButton = document.createElement("button");
	nextButton.id = "button_setQuestionType" + type;
	nextButton.classList.add("questionOptionButton");
	nextButton.dataset.questionType = type;
	nextButton.addEventListener("click", function(){updateCurrentQuestionProperties(); setQuestionType(type);})
	nextButton.innerHTML = QuestionTypes[type].name;
	document.getElementById("td_changeQuestionType").appendChild(nextButton);
}
for (let id of Object.keys(extraOptions)) {
	let nextButton = createElement("button", {id: "button_extraOption_" + id, className: "questionOptionButton", innerHTML: extraOptions[id].label}, [["click", function(){toggleExtraOption(id);}]], {optionId: id});
	document.getElementById("td_extraOptionList").appendChild(nextButton);
	if (extraOptions[id].type === "text") {
		let nextRow = createElement("tr", {id: "tr_extraOption_" + id});
		nextRow.appendChild(createElement("td", {innerHTML: extraOptions[id].rowLabel ?? extraOptions[id].label}));
		nextRow.appendChild(createElement("td", {id: "td_extraOption_" + id, contentEditable: "true"}, [["focusout", function(event) {changeCurrentQuestionProperty(id, extraOptions[id].readValue(event.target.innerHTML));}]]));
		document.getElementById("table_selectedQuestion").appendChild(nextRow);
	}
}
document.getElementById("button_exportQuiz").addEventListener("click", downloadQuiz);
setInterval(saveEditorQuizToLocalStorage, 1000);
// make player reactive
document.getElementById("button_openQuizPlayerOpener").addEventListener("click", openQuizPlayerOpener);
document.getElementById("button_openImportQuizWindowPlayer").addEventListener("click", openImportQuizWindowPlayer);
document.getElementById("input_importQuizPlayer").addEventListener("change", changeImportQuizButtonLabelPlayer);
document.getElementById("button_importQuizPlayer").addEventListener("click", importQuizPlayer);
document.getElementById("button_playLocalStorageQuiz").addEventListener("click", openLocalStorageQuizInPlayer);
document.getElementById("button_playExemplar").addEventListener("click", openExemplarInPlayer);
document.getElementById("button_quizPlayerOpenerReturnToStart").addEventListener("click", openStartMenu);
document.getElementById("button_quizImportWindowPlayerReturnToOpener").addEventListener("click", openQuizPlayer);
document.getElementById("input_totalQuizMarks").addEventListener("input", updateTotalMarkInputDisplay);
document.getElementById("button_showQuizInstructions").addEventListener("click", showQuizInstructions);
document.getElementById("button_startQuiz").addEventListener("click", startQuiz);
document.getElementById("button_startQuestion").addEventListener("click", startQuestion);
document.getElementById("button_markQuestion").addEventListener("click", markQuestion);