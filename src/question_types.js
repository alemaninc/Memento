import { createElement, createTable } from "./html_support.js";
import { createNotification } from "./notifications.js";
import { changeCurrentQuestionProperty, openQuestionInEditor, questionSummary, readCurrentQuestionProperty, setQuestionType, updateCurrentQuestionProperties, updateEditorTypeSpecificHTML } from "./question_editor.js";
import { maxMark } from "./question_utility.js";
import { alphabeticNumber, generalAlphabeticNumber, ranint, readTable, romanNumeral, shuffleArray, simplifyString, stringToNumber, toggleButtonActive, toggleButtonOn } from "./utility.js";

export const globalQuestionProperties = {
	stem: "New question",
	type: "openKeywords",
	grade: [],
	topic: [],
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
		baseValue: function(question) {return QuestionTypes[question.type].maxMark(question);},
		readValue: function(string) {return stringToNumber(string, 1);},
		writeValue: function(value) {return value;},
		correctValue: function(value) {return value;},
		disallowedTypes: ["composite"]
	},
	floatingStem: {
		label: "Floating stem",
		rowLabel: "Floating stem",
		type: "text",
		baseValue: function() {return "Floating stem";},
		readValue: function(string) {return string;},
		writeValue: function(value) {return value;},
		correctValue: function(value) {return value;}
	},
	partMarker: {
		label: "Display indicator",
		rowLabel: "Question indicator",
		type: "text",
		baseValue: function() {return ["*"];},
		readValue: function(string) {return [string]},
		writeValue: function(value) {return value[0];},
		correctValue: function(value) {return value;}
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
		baseValue: function(question){return [question.parts.length, question.parts.length];},
		readValue: function(string) {
			if (Number(string) >= 0) {
				return Array(2).fill(stringToNumber(string, 2));
			} else {
				string = string.split("-");
				return (string.length === 2) ? [stringToNumber(string[0], 2), stringToNumber(string[1], 2)] : [2, 2];
			}
		},
		correctValue: function(value) {return (typeof value === "number") ? [value, value] : value;},
		writeValue: function(value) {return (value[0] === value[1]) ? value[0] : (value[0] + "-" + value[1]);},
		allowedTypes: ["composite"]
	},
	distribute: {
		label: "Distribute across parent",
		type: "boolean",
		allowedTypes: ["composite"]
	}
}
/*
	typeId: {
		name: "Type ID",
		maxMark: function(question) {
			// return max mark for this question
		},
		properties: {
			propertyUniqueToType: true
		},
		sortFactor: 1, // lower value = questions of this type appear earlier
		editorTypeSpecificHeading: "Keywords", // put an editor row unique to this question type here.
		editorHTML: function() {
			return "This is the keyword list!"
		},
		editorTypeSpecificHeading2: "Optional 2nd row",
		editorHTML2: function() {
			return "This is a list of something else!"
		},
		readEditorHTML: function() {
			changeCurrentQuestionProperty("propertyUniqueToType", false);
		},
		playerHTML: function(partID, questionObject) {
			return "<textarea>Player answer</textarea>";
		},
		answerDisplay: function(partID, questionObject) {
			return {
				userAnswer: "Player's answer",
				modelAnswer: "Correct answers"
			};
		},
		mark: function(partID, questionObject) {
			// return the marks achieved for the question
		}
	}
*/
export const QuestionTypes = {
	openKeywords: {
		name: "Open response",
		maxMark: function(question) {
			return Math.min(question.maxMark ?? Infinity, question.keywords.map(x => this.keywordValuationRange(x[0])[1] * Math.max(x[1], 0)).reduce((a, b) => a + b, 0));
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
					["Keywords", "Marks", ""],
					...readCurrentQuestionProperty("keywords").map(function(row, keywordId) {
						return [
							createElement("span", {innerHTML: row[0], id: "span_editorKeyword" + keywordId, contentEditable: "plaintext-only"}),
							createElement("span", {innerHTML: row[1], id: "span_editorKeyword" + keywordId + "Marks", contentEditable: "plaintext-only"}),
							createElement("button", {innerHTML: "Delete"}, [["click", function(event) {
								QuestionTypes.openKeywords.readEditorHTML();
								readCurrentQuestionProperty("keywords").splice(event.target.dataset.keywordId, 1);
								updateEditorTypeSpecificHTML();
							}]], {keywordId: keywordId})
						]
					})
				], [], [{width: "300px"}, {width: "150px"}, {width: "100px"}]),
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
				createElement("div", {style: "width: 100%", contentEditable: "plaintext-only", id: "span_editorModelAnswer", innerText: readCurrentQuestionProperty("modelAnswer")})
			];
		},
		readEditorHTML: function() {
			changeCurrentQuestionProperty("keywords", readTable(document.getElementById("td_questionEditorTypeSpecific").children[0]).slice(1).map(row => [row[0], stringToNumber(row[1])]));
			changeCurrentQuestionProperty("modelAnswer", document.getElementById("td_questionEditorTypeSpecific2").children[0].innerText);
		},
		playerHTML: function(partID) {
			return createElement("div", {id: "input_openKeywordsAnswer" + partID, contentEditable: "plaintext-only", innerHTML: "Your answer here", style: "overflow-wrap: anywhere; width: 100%;"});
		},
		answerDisplay: function(partID, questionObject) {
			return {
				userAnswer: document.getElementById("input_openKeywordsAnswer" + partID).innerHTML,
				modelAnswer: questionObject.modelAnswer
			};
		},
		applyKeywordLogic: function(runningValue, operation, nextValue) {
			if (operation === "+") {
				return runningValue + nextValue;
			} else if (operation === "-") {
				return runningValue - nextValue;
			} else if (operation === "/") {
				return Math.max(runningValue, nextValue);
			} else if (operation === "&") {
				return Math.min(runningValue, nextValue);
			}
		},
		checkForKeyword: function(string, keyword) {
			if ((keyword[0] === "*") && (keyword[keyword.length - 1] === "*") && Number.isFinite(Number(keyword.substring(1, keyword.length - 1)))) {
				return Number(keyword.substring(1, keyword.length - 1));
			}
			try {
				let escapedKeyword = keyword.replace(/\\./, ""); // Replaces every backslash and every character after a backslash with the empty string.
				if (escapedKeyword.includes("/") || escapedKeyword.includes("&") || escapedKeyword.includes("+") || escapedKeyword.includes("-") || (escapedKeyword.includes("(") && escapedKeyword.includes(")"))) {
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
					charLoop: for (let position = 0; position < keyword.length; position++) {
						if (keyword[position] === "\\") {
							position++;
							continue charLoop;
						} else if (keyword[position] === "(") {
							bracketLayer++;
						} else if (keyword[position] === ")") {
							bracketLayer--;
						}
						if ((bracketLayer === 0) && ("+-/&".includes(keyword[position]))) {
							criticalValues.push(position);
						}
					}
					if ((criticalValues.length === 0) && (keyword[0] === "(") && (keyword[keyword.length - 1] === ")")) {
						return this.checkForKeyword(string, keyword.substring(1, keyword.length - 1));
					}
					let out = this.checkForKeyword(string, keyword.substring(0, criticalValues[0]));
					for (let sectionNum = 0; sectionNum < criticalValues.length; sectionNum++) {
						out = this.applyKeywordLogic(out, keyword[criticalValues[sectionNum]], this.checkForKeyword(string, keyword.substring(criticalValues[sectionNum] + 1, criticalValues[sectionNum + 1] ?? Infinity)));
					}
					return out;
				} else {
					return simplifyString(string).includes(simplifyString(keyword)) ? 1 : 0;
				}
			} catch {
				mementoTemp.misconfiguredMarkScheme = true;
				return 0;
			}
		},
		applyKeywordValuationLogic: function(runningValue, operation, nextValue) {
			if (operation === "+") {
				return [runningValue[0] + nextValue[0], runningValue[1] + nextValue[1]];
			} else if (operation === "-") {
				return [runningValue[0] - nextValue[1], runningValue[1] - nextValue[0]];
			} else if (operation === "/") {
				return [Math.max(runningValue[0], nextValue[0]), Math.max(runningValue[1], nextValue[1])];
			} else if (operation === "&") {
				return [Math.min(runningValue[0], nextValue[0]), Math.min(runningValue[1], nextValue[1])];

			}
		},
		keywordValuationRange: function(keyword) {
			// This determines the minimum and maximum possible number of counts that can be output from a keyword string. We use it to determine maximum marks for questions.
			if ((keyword[0] === "*") && (keyword[keyword.length - 1] === "*") && Number.isFinite(Number(keyword.substring(1, keyword.length - 1)))) {
				return [Number(keyword.substring(1, keyword.length - 1)), Number(keyword.substring(1, keyword.length - 1))];
			}
			let escapedKeyword = keyword.replace(/\\./, ""); // Replaces every backslash and every character after a backslash with the empty string.
			if (escapedKeyword.includes("/") || escapedKeyword.includes("&") || escapedKeyword.includes("+") || escapedKeyword.includes("-") || (escapedKeyword.includes("(") && escapedKeyword.includes(")"))) {
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
				charLoop: for (let position = 0; position < keyword.length; position++) {
					if (keyword[position] === "\\") {
						position++;
						continue charLoop;
					} if (keyword[position] === "(") {
						bracketLayer++;
					} else if (keyword[position] === ")") {
						bracketLayer--;
					}
					if ((bracketLayer === 0) && ("+-/&".includes(keyword[position]))) {
						criticalValues.push(position);
					}
				}
				if ((criticalValues.length === 0) && (keyword[0] === "(") && (keyword[keyword.length - 1] === ")")) {
					return this.keywordValuationRange(keyword.substring(1, keyword.length - 1));
				}
				let out = this.keywordValuationRange(keyword.substring(0, criticalValues[0]));
				for (let sectionNum = 0; sectionNum < criticalValues.length; sectionNum++) {
					out = this.applyKeywordValuationLogic(out, keyword[criticalValues[sectionNum]], this.keywordValuationRange(keyword.substring(criticalValues[sectionNum] + 1, criticalValues[sectionNum + 1] ?? Infinity)));
				}
				return out;
			} else {
				return [0, 1];
			}
		},
		mark: function(partID, questionObject) {
			let answer = document.getElementById("input_openKeywordsAnswer" + partID).innerHTML;
			let marks = 0;
			for (let keyword of questionObject.keywords) {
				marks += Math.max(this.checkForKeyword(answer, keyword[0]), 0) * keyword[1];
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
					createElement("span", {contentEditable: "plaintext-only", innerHTML: numberCorrectMCQOptions}),
					"Number of incorrect options:",
					createElement("span", {contentEditable: "plaintext-only", innerHTML: numberIncorrectMCQOptions})
				],
				["Correct answers", "", "Incorrect answers", ""],
				...Array(Math.max(correctMCQAnswers.length, incorrectMCQAnswers.length)).fill(0).map((x, index) => [
					(index >= correctMCQAnswers.length) ? "" : createElement("span", {contentEditable: "plaintext-only", innerHTML: correctMCQAnswers[index]}),
					(index >= correctMCQAnswers.length) ? "" : createElement("button", {innerHTML: "Delete"}, [["click", function(event) {
						QuestionTypes.multipleChoice.readEditorHTML();
						readCurrentQuestionProperty("correctMCQAnswers").splice(event.target.dataset.optionId, 1);
						updateEditorTypeSpecificHTML();
					}]], {optionId: index}),
					(index >= incorrectMCQAnswers.length) ? "" : createElement("span", {contentEditable: "plaintext-only", innerHTML: incorrectMCQAnswers[index]}),
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
		longPlayerHTML: function(questionObject) { // If true, display the options as a lettered list. If not, display them all inline.
			for (let answer of [questionObject.correctMCQAnswers, questionObject.incorrectMCQAnswers].flat()) {
				if (answer.length > 20) {
					return true;
				}
			}
			return false;
		},
		longPlayerHTMLOptionMarker: function(num) {
			return alphabeticNumber(num).toUpperCase();
		},
		playerHTML: function(partID, questionObject) {
			let sortedCorrectAnswers = shuffleArray(structuredClone(questionObject.correctMCQAnswers)).slice(0, questionObject.numberCorrectMCQOptions);
			let sortedIncorrectAnswers = shuffleArray(structuredClone(questionObject.incorrectMCQAnswers)).slice(0, questionObject.numberIncorrectMCQOptions);
			if (this.longPlayerHTML(questionObject)) {
				let out = createElement("ul");
				while ((sortedCorrectAnswers.length > 0) || (sortedIncorrectAnswers.length > 0)) {			
					// Whether the next answer to be displayed should be a correct answer, or incorrect answer. We make it so that any option has an equal probability of appearing no matter how many are left in each category.
					if ((Math.random() * (sortedCorrectAnswers.length + sortedIncorrectAnswers.length)) < sortedCorrectAnswers.length) {
						out.appendChild(createElement("li", {className: "mcqLongOption mcqButton" + partID, innerHTML: sortedCorrectAnswers[0], style: "list-style: '" + this.longPlayerHTMLOptionMarker(out.children.length + 1) + "   '"}, [["click", toggleButtonOn]], {correct: true}));
						sortedCorrectAnswers.splice(0, 1);
					} else {
						out.appendChild(createElement("li", {className: "mcqLongOption mcqButton" + partID, innerHTML: sortedIncorrectAnswers[0], style: "list-style: '" + this.longPlayerHTMLOptionMarker(out.children.length + 1) + "   '"}, [["click", toggleButtonOn]], {correct: false}));
						sortedIncorrectAnswers.splice(0, 1);
					}
				}
				return out;
			} else {
				let out = createElement("div");
				while ((sortedCorrectAnswers.length > 0) || (sortedIncorrectAnswers.length > 0)) {
					if ((sortedCorrectAnswers.length > 0) && ((sortedIncorrectAnswers.length === 0) || (sortedCorrectAnswers[0] < sortedIncorrectAnswers[0]))) {
						out.appendChild(createElement("button", {className: "mcqButton mcqButton" + partID, innerHTML: sortedCorrectAnswers[0]}, [["click", toggleButtonOn]], {correct: true}));
						sortedCorrectAnswers.splice(0, 1);
					} else {
						out.appendChild(createElement("button", {className: "mcqButton mcqButton" + partID, innerHTML: sortedIncorrectAnswers[0]}, [["click", toggleButtonOn]], {correct: false}));
						sortedIncorrectAnswers.splice(0, 1);
					}
				}
				return out;
			}
		},
		answerDisplay: function(partID, questionObject) {
			let userAnswers;
			let correctAnswers;
			if (this.longPlayerHTML(questionObject)) {
				userAnswers = createElement("ul");
				correctAnswers = createElement("ul");
				let allAnswers = document.getElementsByClassName("mcqButton" + partID);
				for (let answerNum = 0; answerNum < allAnswers.length; answerNum++) {
					let element = allAnswers[answerNum];
					if (element.classList.contains("on")) {
						userAnswers.appendChild(createElement("li", {innerHTML: element.innerHTML, style: "list-style: '" + this.longPlayerHTMLOptionMarker(answerNum + 1) + "   '"}));
					}
					if (element.dataset.correct === "true") {
						correctAnswers.appendChild(createElement("li", {innerHTML: element.innerHTML, style: "list-style: '" + this.longPlayerHTMLOptionMarker(answerNum + 1) + "   '"}));
					}
				}
			} else {
				userAnswers = createElement("div");
				correctAnswers = createElement("div");
				for (let element of document.getElementsByClassName("mcqButton" + partID)) {
					if (element.classList.contains("on")) {
						userAnswers.appendChild(createElement("div", {className: "mcqButton", innerHTML: element.innerHTML}));
					}
					if (element.dataset.correct === "true") {
						correctAnswers.appendChild(createElement("div", {className: "mcqButton", innerHTML: element.innerHTML}));
					}
				}
			}
			if (userAnswers.children.length === 0) {
				userAnswers.appendChild(createElement("span", {innerText: "Nothing selected.", style: "float: left; font-style: italic;"}));
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
	gapfill: {
		name: "Gap fill",
		maxMark: function(question) {
			let marks = 0;
			for (let gapId = 0; gapId < question.gaps.length; gapId++) {
				marks += Math.max(QuestionTypes.openKeywords.keywordValuationRange(question.gaps[gapId][1])[1], 0) * Math.max(question.gaps[gapId][2], 0) * (question.passage.length - question.passage.replaceAll("{{" + (gapId + 1) + "}}", "").length) / String("{{" + (gapId + 1) + "}}").length;
			}
			return Math.min(question.maxMark ?? Infinity, marks);
		},
		properties: {
			passage: "The {{1}} brown fox jumps over the lazy {{2}}",
			gaps: [["quick", "quick/fast/swift", 1], ["dog", "dog/puppy", 1]]
		},
		sortFactor: 0.6, // lower value = questions of this type appear earlier
		editorTypeSpecificHeading: "Passage", // put an editor row unique to this question type here.
		editorHTML: function() {
			return [
				createElement("div", {style: "width: 100%", contentEditable: "plaintext-only", id: "span_editorPassage", innerText: readCurrentQuestionProperty("passage")})
			];
		},
		editorTypeSpecificHeading2: "Gaps",
		editorHTML2: function() {
			return [
				createTable([
					["Model Answer", "Check Value", "Marks", ""],
					...readCurrentQuestionProperty("gaps").map(function(row, gapId) {
						return [
							createElement("span", {innerHTML: row[0], id: "span_editorGap" + gapId + "Model", contentEditable: "plaintext-only"}),
							createElement("span", {innerHTML: row[1], id: "span_editorGap" + gapId + "Check", contentEditable: "plaintext-only"}),
							createElement("span", {innerHTML: row[2], id: "span_editorGap" + gapId + "Marks", contentEditable: "plaintext-only"}),
							createElement("button", {innerHTML: "Delete"}, [["click", function(event) {
								QuestionTypes.gapfill.readEditorHTML();
								readCurrentQuestionProperty("gaps").splice(event.target.dataset.gapId, 1);
								updateEditorTypeSpecificHTML();
							}]], {gapId: gapId})
						]
					})
				], [], [{width: "300px"}, {width: "300px"}, {width: "150px"}, {width: "100px"}]),
				createElement("button", {innerHTML: "Add gap"}, [["click", function() {
					QuestionTypes.gapfill.readEditorHTML();
					readCurrentQuestionProperty("gaps").push(["gap", "gap", 1]);
					updateEditorTypeSpecificHTML();
				}]])
			]
		},
		readEditorHTML: function() {
			changeCurrentQuestionProperty("passage", document.getElementById("td_questionEditorTypeSpecific").children[0].innerText);
			changeCurrentQuestionProperty("gaps", readTable(document.getElementById("td_questionEditorTypeSpecific2").children[0]).slice(1).map(row => [row[0], row[1], stringToNumber(row[2])]));
		},
		playerHTML: function(partID, questionObject) {
			let out = createElement("div");
			let remainingText = questionObject.passage;
			let remainingGapIds = Array(questionObject.gaps.length).fill(0).map((x, i) => String(i + 1));
			gapLoop: while (remainingGapIds.length > 0) {
				let nextGap = remainingGapIds.map(id => [id, remainingText.indexOf("{{" + id + "}}")]).filter(x => x[1] !== -1)
				let nextBreak = remainingText.includes("\n") ? remainingText.indexOf("\n") : Infinity;
				if ((nextGap.length === 0) && (nextBreak === Infinity)) {
					break gapLoop;
				}
				nextGap = nextGap.reduce((a, b) => (a[1] < b[1]) ? a : b, [undefined, Infinity]);
				if (nextBreak < nextGap[1]) {
					out.appendChild(document.createTextNode(remainingText.substring(0, nextBreak)));
					out.appendChild(createElement("br"));
					remainingText = remainingText.substring(nextBreak + 1);
				} else {
					out.appendChild(document.createTextNode(remainingText.substring(0, nextGap[1])));
					out.appendChild(createElement("span", {contentEditable: "plaintext-only", style: "display: inline;", innerHTML: "_".repeat(Math.max(3, Math.min(ranint(nextGap[0].length * 0.8, nextGap[0].length * 1.2), 200))), className: "input_gapfill" + partID + "Gap" + nextGap[0]}));
					remainingText = remainingText.substring(nextGap[1] + 4 + nextGap[0].length);
				}
			}
			out.appendChild(document.createTextNode(remainingText));
			return out;
		},
		answerDisplay: function(partID, questionObject) {
			let userAnswer = questionObject.passage;
			let modelAnswer = questionObject.passage;
			for (let gapId = 0; gapId < questionObject.gaps.length; gapId++) {
				let gapsWithId = Array.from(document.getElementsByClassName("input_gapfill" + partID + "Gap" + (gapId + 1)));
				for (let identicalGapNum = 0; identicalGapNum < gapsWithId.length; identicalGapNum++) {
					userAnswer = userAnswer.replace("{{" + (gapId + 1) + "}}", gapsWithId[identicalGapNum].innerText);
				}
				modelAnswer = modelAnswer.replaceAll("{{" + (gapId + 1) + "}}", questionObject.gaps[gapId][0]);
			}
			return {userAnswer, modelAnswer};
		},
		mark: function(partID, questionObject) {
			let marks = 0;
			for (let gapId = 0; gapId < questionObject.gaps.length; gapId++) {
				let gapsWithId = Array.from(document.getElementsByClassName("input_gapfill" + partID + "Gap" + (gapId + 1)));
				for (let gap of gapsWithId) {
					marks += Math.max(QuestionTypes.openKeywords.checkForKeyword(gap.innerText, questionObject.gaps[gapId][1]), 0) * questionObject.gaps[gapId][2];
				}
			}
			if (questionObject.maxMark !== undefined) {
				marks = Math.min(questionObject.maxMark, marks);
			}
			return Math.max(Math.floor(marks), 0);
		}
	},
	order: {
		name: "Order",
		maxMark: function(question) {
			return question.maxMark ?? Math.floor(question.ordering.length / 2);
		},
		properties: {
			ordering: ["Item 1", "Item 2", "Item 3", "Item 4"],
		},
		sortFactor: 0.3, // lower value = questions of this type appear earlier
		editorTypeSpecificHeading: "Ordering", // put an editor row unique to this question type here.
		editorHTML: function() {
			let ordering = readCurrentQuestionProperty("ordering");
			return [
				createTable([
					...ordering.map(function(item, itemId) {
						return [
							createElement("span", {innerHTML: item, id: "span_orderItem" + itemId, contentEditable: "plaintext-only"}),
							(itemId === 0) ? "" : createElement("button", {innerHTML: "↑"}, [["click", function(event) {
								QuestionTypes.order.readEditorHTML();
								let ordering = readCurrentQuestionProperty("ordering");
								let swapItems = [ordering[event.target.dataset.itemId], ordering[event.target.dataset.itemId - 1]];
								ordering[event.target.dataset.itemId - 1] = swapItems[0];
								ordering[event.target.dataset.itemId] = swapItems[1];
								changeCurrentQuestionProperty("ordering", ordering);
								updateEditorTypeSpecificHTML();
							}]], {itemId}),
							(itemId === (ordering.length - 1)) ? "" : createElement("button", {innerHTML: "↓"}, [["click", function(event) {
								QuestionTypes.order.readEditorHTML();
								let ordering = readCurrentQuestionProperty("ordering");
								let swapItems = [ordering[Number(event.target.dataset.itemId) + 1], ordering[event.target.dataset.itemId]];
								ordering[event.target.dataset.itemId] = swapItems[0];
								ordering[Number(event.target.dataset.itemId) + 1] = swapItems[1];
								changeCurrentQuestionProperty("ordering", ordering);
								updateEditorTypeSpecificHTML();
							}]], {itemId}),
							createElement("button", {innerHTML: "Delete"}, [["click", function(event) {
								QuestionTypes.order.readEditorHTML();
								readCurrentQuestionProperty("ordering").splice(event.target.dataset.itemId, 1);
								updateEditorTypeSpecificHTML();
							}]], {itemId})
						]
					})
				], [], [{width: "400px"}, {width: "30px"}, {width: "30px"}, {width: "100px"}]),
				createElement("button", {innerHTML: "Add item"}, [["click", function() {
					QuestionTypes.order.readEditorHTML();
					readCurrentQuestionProperty("ordering").push("Item " + (ordering.length + 1));
					updateEditorTypeSpecificHTML();
				}]])
			]
		},
		readEditorHTML: function() {
			changeCurrentQuestionProperty("ordering", readTable(document.getElementById("td_questionEditorTypeSpecific").children[0]).map(row => row[0]));
		},
		playerHTML: function(partID, questionObject) {
			let order = shuffleArray(structuredClone(questionObject.ordering));
			return createTable([
				...order.map(function(item, itemId) {
					return [
						(itemId === 0) ? "" : createElement("button", {innerHTML: "↑"}, [["click", function(event) {
							let swapItems = [document.getElementById("span_orderAnswer" + partID + "Item" + itemId).innerText, document.getElementById("span_orderAnswer" + partID + "Item" + (itemId - 1)).innerText];
							document.getElementById("span_orderAnswer" + partID + "Item" + (itemId - 1)).innerText = swapItems[0];
							document.getElementById("span_orderAnswer" + partID + "Item" + itemId).innerText = swapItems[1];
						}]]),
						(itemId === (questionObject.ordering.length - 1)) ? "" : createElement("button", {innerHTML: "↓"}, [["click", function(event) {
							let swapItems = [document.getElementById("span_orderAnswer" + partID + "Item" + (itemId + 1)).innerText, document.getElementById("span_orderAnswer" + partID + "Item" + itemId).innerText];
							document.getElementById("span_orderAnswer" + partID + "Item" + itemId).innerText = swapItems[0];
							document.getElementById("span_orderAnswer" + partID + "Item" + (itemId + 1)).innerText = swapItems[1];
						}]]),
						createElement("span", {innerText: item, id: "span_orderAnswer" + partID + "Item" + itemId})
					]
				})
			], [], [{width: "30px"}, {width: "30px"}, {width: "400px"}]);
		},
		answerDisplay: function(partID, questionObject) {
			return {
				userAnswer: Array(questionObject.ordering.length).fill(0).map((x, itemId) => document.getElementById("span_orderAnswer" + partID + "Item" + itemId).innerText).join("<br>"),
				modelAnswer: questionObject.ordering.join("<br>")
			};
		},
		mark: function(partID, questionObject) {
			/*
			We calculate an "accuracy" by calculating how many pairs within the correct order are in the correct ordering relatively.
			For example, if the correct ordering is A, B, C, D and a user orders it as B, D, A, C, then we consider the pairs (B, D), (D, A), (A, C) and (B, C):
			(B, D) (A, C) and (B, C) are in the correct order relatively whereas (D, A) is not so the accuracy is then 3/4.
			The mark is then given by "accuracy" * 2 - "maximum accuracy": if a custom max mark has been set then we scale it up accordingly.
			*/
			let answer = Array(questionObject.ordering.length).fill(0).map((x, itemId) => document.getElementById("span_orderAnswer" + partID + "Item" + itemId).innerText);
			let accuracy = 0;
			for (let pairNum = 0; pairNum < answer.length; pairNum++) {
				if (answer.indexOf(questionObject.ordering[pairNum % (answer.length - 1)]) < answer.indexOf(questionObject.ordering[Math.min(pairNum + 1, answer.length - 1)])) {
					accuracy++;
				}
			}
			return Math.max(accuracy * 1.5 - answer.length / 2, 0) * (questionObject.maxMark ?? Math.floor(answer.length / 2)) / answer.length;
		}
	},
	composite: {
		name: "Composite",
		maxMark: function(question) {
			return question.parts.map(part => maxMark(part)).reduce((x, y) => x + y, 0);
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