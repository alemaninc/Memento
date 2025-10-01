"use strict";
export function openWindow(id) {
	let windowList = document.getElementsByClassName("window")
	for (let windowID in Object.keys(windowList)) {;
		windowList[windowID].style.display = "none";
	}
	document.getElementById("window_" + id).style.display = "inline-block";
}