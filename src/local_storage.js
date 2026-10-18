import { convertQuizToString } from "./main_menu.js";

export function saveEditorQuizToLocalStorage() {
	// If `questions` is undefined, then the question player is not open - i.e. we are not going to save a processed quiz to local storage.
	if ((globalThis.questions === undefined) && (globalThis.memento !== undefined)) {
		localStorage.setItem("memento", convertQuizToString(globalThis.memento));	
	}
}