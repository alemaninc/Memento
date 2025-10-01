"use strict";
export function createEventListenerFunction(functionObject, argumentList) {
	functionObject(...argumentList);
}