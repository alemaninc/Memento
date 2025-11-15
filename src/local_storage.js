import { convertQuizToString } from "./main_menu.js";

export function saveEditorQuizToLocalStorage() {
	if (globalThis.memento !== undefined) {
		localStorage.setItem("memento", convertQuizToString(globalThis.memento));	
	}
}