import { QuestionTypes } from "./question_types.js";

export function maxMark(question) {
	return Math.max(Math.floor(QuestionTypes[question.type].maxMark(question)), 0);
}
export function allQuestionParts(question) {
	if (question.type === "composite") {
		return question.parts.map(x => allQuestionParts(x)).flat();
	} else {
		return [question]
	}
}
export function addMarks(markArray) {
	let out = {}
	for (let list of markArray) {
		for (let grade of Object.keys(list)) {
			if (out[grade] === undefined) {
				out[grade] = 0;
			}
			out[grade] += list[grade];
		}
	}
	return out;
}
export function getQuestionObject(questionObject, partArray) {
	if (partArray.length === 0) {
		return questionObject;
	} else {
		return getQuestionObject(questionObject.parts[partArray[0]], partArray.slice(1));
	}
}
export function getAllQuestionTopics(questionObject) {
	let out = structuredClone(questionObject.topic);
	if (questionObject.type === "composite") {
		for (let part of questionObject.parts) {
			out.push(...getAllQuestionTopics(part));
		}
	}
	return Array.from(new Set(out));
}