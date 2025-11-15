import { createElement, createTable } from "./html_support.js";
import { changeCurrentQuestionProperty, openQuestionInEditor, questionSummary, readCurrentQuestionProperty, setQuestionType, updateCurrentQuestionProperties, updateEditorTypeSpecificHTML } from "./question_editor.js";
import { alphabeticNumber, generalAlphabeticNumber, readTable, romanNumeral, shuffleArray, simplifyString, stringToNumber, toggleButtonActive, toggleButtonOn } from "./utility.js";

export const globalQuestionProperties = {
	stem: "New question",
	type: "openKeywords",
	grade: [],
	extraOptionsActive: []
}
/*
if `allowedTypes` is defined, a given option will only appear on question types in `allowedTypes`. Otherwise, it will appear on all types except those in `disallowedTypes`, if it is defined.
option types are:
	text			takes a text input; option value is the input.
						Stored properties: baseValue
	boolean	takes no input; only thing that is stored is whether the option is toggled (in `extraOptions`)
*/
export const extraOptions = {
	maxMark: {
		label: "Maximum mark",
		type: "text",
		baseValue: function(question) {return QuestionTypes[question.type].maxMark(question); },
		readValue: function(string) {return stringToNumber(string, 1);},
		disallowedTypes: ["composite"]
	},
	shuffleParts: {
		label: "Shuffle parts",
		type: "boolean",
		allowedTypes: ["composite"]
	},
	selectParts: {
		label: "Show only some parts",
		rowLabel: "Number of parts",
		type: "text",
		baseValue: function(question){return question.parts.length;},
		readValue: function(string) {return Math.max(1, stringToNumber(string, 2));},
		allowedTypes: ["composite"]
	}
}
export const QuestionTypes = {
	openKeywords: {
		name: "Open response",
		maxMark: function(question) {
			return Math.min(question.maxMark ?? Infinity, Math.floor(question.keywords.map(x => Math.max(x[1], 0)).reduce((a, b) => a + b, 0)));;
		},
		properties: {
			keywords: [["Keyword", 1]],
			modelAnswer: "Model answer"
		},
		sortFactor: 1,
		editorTypeSpecificHeading: "Keywords",
		editorHTML: function() {
			return [
				createTable([
					["Keywords", "Marks", "", ""],
					...readCurrentQuestionProperty("keywords").map(function(row, keywordId) {
						return [
							createElement("span", {innerHTML: row[0], id: "span_editorKeyword" + keywordId, contentEditable: "true"}),
							createElement("span", {innerHTML: row[1], id: "span_editorKeyword" + keywordId + "Marks", contentEditable: "true"}),
							createElement("button", {innerHTML: "Delete"}, [["click", function(event) {
								QuestionTypes.openKeywords.readEditorHTML();
								readCurrentQuestionProperty("keywords").splice(event.target.dataset.keywordId, 1);
								updateEditorTypeSpecificHTML();
							}]], {keywordId: keywordId})
						]
					})
				], [], [{width: "300px"}, {width: "150px"}, {width: "100px"}, {width: "100px"}]),
				createElement("button", {innerHTML: "Add keyword"}, [["click", function() {
					QuestionTypes.openKeywords.readEditorHTML();
					readCurrentQuestionProperty("keywords").push(["Keyword", 1]);
					updateEditorTypeSpecificHTML();
				}]])
			]
		},
		editorTypeSpecificHeading2: "Model answer",
		editorHTML2: function() {
			return [
				createElement("div", {style: "width: 100%", contentEditable: "true", id: "span_editorModelAnswer", innerText: readCurrentQuestionProperty("modelAnswer")})
			];
		},
		readEditorHTML: function() {
			changeCurrentQuestionProperty("keywords", readTable(document.getElementById("td_questionEditorTypeSpecific").children[0]).slice(1).map(row => [row[0], stringToNumber(row[1])]));
			changeCurrentQuestionProperty("modelAnswer", document.getElementById("td_questionEditorTypeSpecific2").children[0].innerText);
		},
		playerHTML: function(partID) {
			return createElement("div", {id: "input_openKeywordsAnswer" + partID, contentEditable: "true", innerHTML: "Your answer here", style: "overflow-wrap: anywhere; width: 100%;"});
		},
		answerDisplay: function(partID, questionObject) {
			return {
				userAnswer: document.getElementById("input_openKeywordsAnswer" + partID).innerHTML,
				modelAnswer: questionObject.modelAnswer
			};
		},
		applyKeywordLogic: function(runningValue, operation, nextValue) {
			if (operation === "/") {
				return runningValue || nextValue;
			} else if (operation === "&") {
				return runningValue && nextValue;
			}
		},
		checkForKeyword: function(string, keyword) {
			if ((keyword[0] === "(") && (keyword[keyword.length - 1] === ")")) {
				keyword = keyword.substring(1, keyword.length - 1);
			}
			if (keyword.includes("/") || keyword.includes("&") || (keyword.includes("(") && keyword.includes(")"))) {
				/*
				We will identify "critical positions" in the keyword string (i.e. /s and &s that are not inside a bracket),
				then consider the array formed by splitting the keyword string in these positions and reduce it left-to-right to a single Boolean value.
				For example, in the string "red/yellow&(green/blue)/cyan", critical positions are: 3, 10, 23. The / at position 17 is ignored.
				                            0    5    0    5    0    5   
				The resulting array is: ["red", "/", "yellow", "&", "(green/blue)", "/", "cyan"].
				So we will check if red OR yellow is present, check this value AND "green/blue" being present, check this value OR cyan being present, return.
				*/
				let criticalValues = [];
				let bracketLayer = 0; // we cannot use a simple `indexOf(")")` whenever a ( is found as this will break in cases of nested brackets
				for (let position = 0; position < keyword.length; position++) {
					if (keyword[position] === "(") {
						bracketLayer++;
					} else if (keyword[position] === ")") {
						bracketLayer--;
					}
					if ((bracketLayer === 0) && ((keyword[position] === "/") || (keyword[position] === "&"))) {
						criticalValues.push(position);
					}
				}
				let out = this.checkForKeyword(string, keyword.substring(0, criticalValues[0]));
				for (let sectionNum = 0; sectionNum < criticalValues.length; sectionNum++) {
					out = this.applyKeywordLogic(out, keyword[criticalValues[sectionNum]], this.checkForKeyword(string, keyword.substring(criticalValues[sectionNum] + 1, criticalValues[sectionNum + 1] ?? Infinity)));
				}
				return out;
			} else {
				return simplifyString(string).includes(simplifyString(keyword));
			}
		},
		mark: function(partID, questionObject) {
			let answer = document.getElementById("input_openKeywordsAnswer" + partID).innerHTML;
			let marks = 0;
			for (let keyword of questionObject.keywords) {
				if (this.checkForKeyword(answer, keyword[0])) {
					marks += keyword[1];
				}
			}
			if (questionObject.maxMark !== undefined) {
				marks = Math.min(questionObject.maxMark, marks);
			}
			return Math.max(Math.floor(marks), 0);
		}
	},
	multipleChoice: {
		name: "Multiple choice",
		maxMark: function(question) {
			return question.maxMark ?? Math.min(question.correctMCQAnswers.length, question.incorrectMCQAnswers.length, question.numberCorrectMCQOptions, question.numberIncorrectMCQOptions);
		},
		properties: {
			correctMCQAnswers: ["Correct answer 1"],
			incorrectMCQAnswers: ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"],
			numberCorrectMCQOptions: 1,
			numberIncorrectMCQOptions: 3
		},
		sortFactor: 0,
		editorTypeSpecificHeading: "Options",
		editorHTML: function() {
			let correctMCQAnswers = readCurrentQuestionProperty("correctMCQAnswers");
			let incorrectMCQAnswers = readCurrentQuestionProperty("incorrectMCQAnswers");
			let numberCorrectMCQOptions = readCurrentQuestionProperty("numberCorrectMCQOptions");
			let numberIncorrectMCQOptions = readCurrentQuestionProperty("numberIncorrectMCQOptions");
			return [createTable([
				[
					"Number of correct options:",
					createElement("span", {contentEditable: "true", innerHTML: numberCorrectMCQOptions}),
					"Number of incorrect options:",
					createElement("span", {contentEditable: "true", innerHTML: numberIncorrectMCQOptions})
				],
				["Correct answers", "", "Incorrect answers", ""],
				...Array(Math.max(correctMCQAnswers.length, incorrectMCQAnswers.length)).fill(0).map((x, index) => [
					(index >= correctMCQAnswers.length) ? "" : createElement("span", {contentEditable: "true", innerHTML: correctMCQAnswers[index]}),
					(index >= correctMCQAnswers.length) ? "" : createElement("button", {innerHTML: "Delete"}, [["click", function(event) {
						QuestionTypes.multipleChoice.readEditorHTML();
						readCurrentQuestionProperty("correctMCQAnswers").splice(event.target.dataset.optionId, 1);
						updateEditorTypeSpecificHTML();
					}]], {optionId: index}),
					(index >= incorrectMCQAnswers.length) ? "" : createElement("span", {contentEditable: "true", innerHTML: incorrectMCQAnswers[index]}),
					(index >= incorrectMCQAnswers.length) ? "" : createElement("button", {innerHTML: "Delete"}, [["click", function(event) {
						QuestionTypes.multipleChoice.readEditorHTML();
						readCurrentQuestionProperty("incorrectMCQAnswers").splice(event.target.dataset.optionId, 1);
						updateEditorTypeSpecificHTML();
					}]], {optionId: index})
				]),
				[
					createElement("button", {innerHTML: "Add option"}, [["click", function() {
						QuestionTypes.multipleChoice.readEditorHTML();
						readCurrentQuestionProperty("correctMCQAnswers").push("Correct answer " + (correctMCQAnswers.length + 1));
						updateEditorTypeSpecificHTML();
					}]]), "",
					createElement("button", {innerHTML: "Add option"}, [["click", function() {
						QuestionTypes.multipleChoice.readEditorHTML();
						readCurrentQuestionProperty("incorrectMCQAnswers").push("Wrong answer " + (incorrectMCQAnswers.length + 1));
						updateEditorTypeSpecificHTML();
					}]]), ""
				]
			], [{}, {"font-weight": 700}], [{width: "calc(50vw - 300px)"}, {width: "100px"}, {width: "calc(50vw - 300px)"}, {width: "100px"}])];
		},
		readEditorHTML: function() {
			let table = readTable(document.getElementById("td_questionEditorTypeSpecific").children[0]);
			let correctAnswers = [];
			let incorrectAnswers = [];
			for (let rowNum = 2; rowNum < table.length - 1; rowNum++) {
				if (table[rowNum][0] !== "") {
					correctAnswers.push(table[rowNum][0]);
				}
				if (table[rowNum][2] !== "") {
					incorrectAnswers.push(table[rowNum][2]);
				}
			}
			changeCurrentQuestionProperty("correctMCQAnswers", correctAnswers);
			changeCurrentQuestionProperty("incorrectMCQAnswers", incorrectAnswers);
			changeCurrentQuestionProperty("numberCorrectMCQOptions", stringToNumber(table[0][1], correctAnswers.length));
			changeCurrentQuestionProperty("numberIncorrectMCQOptions", stringToNumber(table[0][3], incorrectAnswers.length));
		},
		playerHTML: function(partID, questionObject) {
			let out = createElement("div");
			let sortedCorrectAnswers = shuffleArray(structuredClone(questionObject.correctMCQAnswers)).slice(0, questionObject.numberCorrectMCQOptions).sort();
			let sortedIncorrectAnswers = shuffleArray(structuredClone(questionObject.incorrectMCQAnswers)).slice(0, questionObject.numberIncorrectMCQOptions).sort();
			while ((sortedCorrectAnswers.length > 0) || (sortedIncorrectAnswers.length > 0)) {
				if (Math.random() < 1e-4) return;
				if ((sortedCorrectAnswers.length > 0) && ((sortedIncorrectAnswers.length === 0) || (sortedCorrectAnswers[0] < sortedIncorrectAnswers[0]))) {
					out.appendChild(createElement("button", {className: "mcqButton mcqButton" + partID, innerHTML: sortedCorrectAnswers[0]}, [["click", toggleButtonOn]], {correct: true}));
					sortedCorrectAnswers.splice(0, 1);
				} else {
					out.appendChild(createElement("button", {className: "mcqButton mcqButton" + partID, innerHTML: sortedIncorrectAnswers[0]}, [["click", toggleButtonOn]], {correct: false}));
					sortedIncorrectAnswers.splice(0, 1);
				}
			}
			return out;
		},
		answerDisplay: function(partID, questionObject) {
			let userAnswers = createElement("div"), correctAnswers = createElement("div");
			for (let element of document.getElementsByClassName("mcqButton" + partID)) {
				if (element.classList.contains("on")) {
					userAnswers.appendChild(createElement("div", {className: "mcqButton", innerHTML: element.innerHTML}));
				}
				if (element.dataset.correct === "true") {
					correctAnswers.appendChild(createElement("div", {className: "mcqButton", innerHTML: element.innerHTML}));
				}
			}
			if (userAnswers.children.length === 0) {
				userAnswers.innerHTML = "Nothing selected.";
			}
			return {
				userAnswer: userAnswers,
				modelAnswer: correctAnswers
			};
		},
		mark: function(partID, questionObject) {
			let missingCorrectAnswers = 0;
			let markedIncorrectAnswers = 0;
			let maxAnswerPoints = Math.min(questionObject.correctMCQAnswers.length, questionObject.incorrectMCQAnswers.length, questionObject.numberCorrectMCQOptions, questionObject.numberIncorrectMCQOptions);
			for (let element of document.getElementsByClassName("mcqButton" + partID)) {
				if (element.classList.contains("on") && (element.dataset.correct !== "true")) {
					markedIncorrectAnswers++;
				}
				if ((!element.classList.contains("on")) && (element.dataset.correct === "true")) {
					missingCorrectAnswers++;
				}
			}
			return Math.floor(Math.max(maxAnswerPoints - Math.max(missingCorrectAnswers, markedIncorrectAnswers), 0) * (questionObject.maxMark ?? maxAnswerPoints) / maxAnswerPoints);
		}
	},
	composite: {
		name: "Composite",
		maxMark: function(question) {
			return question.parts.map(part => QuestionTypes[part.type].maxMark(part)).reduce((x, y) => x + y, 0);
		},
		properties: {
			parts: []
		},
		editorTypeSpecificHeading: "Parts",
		editorHTML: function() {
			let out = [];
			let parts = readCurrentQuestionProperty("parts");
			for (let partNum = 0; partNum < parts.length; partNum++) {
				let nextDiv = createElement("div", {style: "display: inline-block; text-align: center;"})
				nextDiv.appendChild(questionSummary(parts[partNum], function() {
					updateCurrentQuestionProperties();
					globalThis.mementoTemp.selectedQuestion.push(partNum);
					openQuestionInEditor();
				}, "Part " + this.questionNumber(globalThis.mementoTemp.selectedQuestion.length, partNum), globalThis.mementoTemp.selectedQuestion.length));
				out.push(nextDiv);
			}
			if (parts.length !== 0) {
				out.push(createElement("br"));
			}
			out.push(createElement("button", {innerHTML: "Add part"}, [["click", function() {
				updateCurrentQuestionProperties();
				readCurrentQuestionProperty("parts").push(structuredClone(globalQuestionProperties));
				globalThis.mementoTemp.selectedQuestion.push(readCurrentQuestionProperty("parts").length - 1);
				setQuestionType("openKeywords");
				openQuestionInEditor();
			}]]));
			return out;
		},
		readEditorHTML: function() { /* do nothing */ },
		questionNumber: function(layerNumber, partNumber) {
			if (layerNumber === 0) {
				return partNumber;
			}
			layerNumber = layerNumber % 4;
			if (layerNumber === 0) {
				return partNumber + 1;
			} if (layerNumber === 1) {
				return "(" + alphabeticNumber(partNumber + 1) + ")";
			} else if (layerNumber === 2) {
				return "(" + romanNumeral(partNumber + 1).toLowerCase() + ")";
			} else if (layerNumber === 3) {
				return "(" + generalAlphabeticNumber(partNumber + 1, "αβγδεζηθικλμνξοπρστυφχψω") + ")";
			}
		}
	},
}