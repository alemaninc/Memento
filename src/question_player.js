import { createElement, createTable } from "./html_support.js";
import { openWindow } from "./main_menu.js";
import { createNotification } from "./notifications.js";
import { QuestionTypes } from "./question_types.js";
import { addMarks, allQuestionParts, getQuestionObject, maxMark } from "./question_utility.js";
import { arrayWeightedRandom, formatInteger, pluralizeWord, ranint, shuffleArray, stringToNumber } from "./utility.js";

export function openQuizPlayer() {
	if (Object.values(globalThis.memento.questions).map(x => maxMark(x)).reduce((a, b) => a + b, 0) === 0) {
		createNotification("There are no questions in this quiz.");
		return;
	}
	// prepare questions for taking
	globalThis.mementoTemp.minimumPartMark = Object.values(globalThis.memento.questions).map(question => allQuestionParts(question).map(part => maxMark(part)).reduce((a, b) => Math.min(a, b), Infinity)).reduce((a, b) => Math.min(a, b), Infinity);
	globalThis.mementoTemp.maximumPartMark = Object.values(globalThis.memento.questions).map(question => allQuestionParts(question).map(part => maxMark(part)).reduce((a, b) => Math.max(a, b), 0)).reduce((a, b) => Math.max(a, b), 0);
	globalThis.mementoTemp.processedQuestions = [];
	for (let questionId of Object.keys(globalThis.memento.questions)) {
		if (maxMark(globalThis.memento.questions[questionId]) > 0) {
			let processedQuestion = processQuestionForPlayer(structuredClone(globalThis.memento.questions[questionId]));
			// If a top-level question has distribution active, we will split it into separate standalone questions.
			if ((processedQuestion.type === "composite") && processedQuestion.extraOptionsActive.includes("distribute")) {
				for (let part of processedQuestion.parts) {
					if (processedQuestion.extraOptionsActive.includes("floatingStem")) {
						if (!part.extraOptionsActive.includes("floatingStem")) {
							part.extraOptionsActive.push("floatingStem");
							part.floatingStem = "";
						}
						part.floatingStem = mergeStems(part.floatingStem, processQuestionForPlayer.floatingStem);
					}
					part.stem = mergeStems(mergeStems(processedQuestion.stem, part.floatingStem ?? ""), part.stem);
					globalThis.mementoTemp.processedQuestions.push(part);
				}
			} else {
				globalThis.mementoTemp.processedQuestions.push(processedQuestion);
			}
		}
	}
	// update starter window texts
	openWindow("quizPlayerStart");
	document.getElementById("heading_quizPlayerStart").innerHTML = globalThis.memento.quizTitle;
	document.getElementById("div_quizPlayerAbstract").innerHTML = globalThis.memento.quizAbstract;
	let minMarks = globalThis.mementoTemp.processedQuestions.map(x => maxMark(allQuestionParts(x)[0])).reduce((a, b) => Math.min(a, b));
	document.getElementById("td_minMarkForFile").innerHTML = formatInteger(minMarks);
	document.getElementById("input_totalQuizMarks").min = String(minMarks);
	let maxMarks = globalThis.mementoTemp.processedQuestions.map(x => maxMark(x)).reduce((a, b) => a + b);
	document.getElementById("td_maxMarkForFile").innerHTML = formatInteger(maxMarks);
	document.getElementById("input_totalQuizMarks").max = String(maxMarks);
	document.getElementById("input_totalQuizMarks").value = String(maxMarks);
	updateTotalMarkInputDisplay();
}
export function updateTotalMarkInputDisplay() {
	document.getElementById("span_totalQuizMarks").innerHTML = formatInteger(document.getElementById("input_totalQuizMarks").value);
}
function mergeStems(parentStem, childStem) {
	if ((parentStem !== "") && (childStem !== "")) {
		if ("abcdefghijklmnopqrstuvwxyz".includes(parentStem[parentStem.length - 1])) {
			return parentStem + " " + childStem;
		} else {
			return parentStem + "\n\n" + childStem;
		}
	} else {
		return parentStem + childStem;
	}
}
function deflate1PartComposite(question) {
	if ((question.type === "composite") && (question.parts.length === 1)) {
		let part = structuredClone(question.parts[0]);
		part.stem = part.stem.replaceAll("<br>", "\n").trim();
		part.stem = mergeStems(question.stem, part.stem);
		if (question.extraOptionsActive.includes("floatingStem")) {
			if (!part.extraOptionsActive.includes("floatingStem")) {
				part.extraOptionsActive.push("floatingStem");
				part.floatingStem = "";
			}
			part.floatingStem = mergeStems(question.floatingStem, part.floatingStem);
		}
		if (question.extraOptionsActive.includes("partMarker")) {
			if (!part.extraOptionsActive.includes("partMarker")) {
				part.extraOptionsActive.push("partMarker");
				part.partMarker = [];
			}
			part.partMarker.push(question.partMarker);
		}
		return part;
	} else {
		return question;
	}
}
function processQuestionForPlayer(question) {
	question.stem = question.stem.replaceAll("<br>", "\n").trim();
	if (question.type === "composite") {
		let processedParts = [];
		/*
		We process the parts before selecting the parts that appear in each questions so that if "shuffle parts" is active, and one of the parts being
		shuffled uses the distribution option, the distributed sub-parts do not always appear next to each other.
		*/
		for (let part of question.parts) {
			let processedPart = processQuestionForPlayer(part);
			if (processedPart !== undefined) {
				if (processedPart.extraOptionsActive.includes("distribute")) {
					processedPart.parts[0].floatingStem = mergeStems(mergeStems(processedPart.floatingStem ?? "", processedPart.stem), processedPart.parts[0].floatingStem ?? "");
					if ((processedPart.parts[0].floatingStem !== "") && (!processedPart.parts[0].extraOptionsActive.includes("floatingStem"))) {
						processedPart.parts[0].extraOptionsActive.push("floatingStem");
					}
					processedParts.push(...processedPart.parts.filter(x => x !== undefined));
				} else {
					processedParts.push(processedPart);
				}
			}
		};
		processedParts = processedParts.filter(x => maxMark(x) > 0);
		/*
		Rearranging/removing parts for select and shuffle works as follows:
		- make a list of all the part numbers in the question
		- if select is active, select the desired number of parts (this list will be random)
		- if shuffle is active, display these parts in random order, otherwise display them in their original order.
		*/
		let partList = shuffleArray(Array(processedParts.length).fill(0).map((x, i) => i));
		if (question.extraOptionsActive.includes("selectParts")) {
			partList = partList.slice(0, ranint(question.selectParts[0], question.selectParts[1]));
		}
		if (question.extraOptionsActive.includes("shuffleParts")) {
			partList.sort((a, b) => processedParts[a].sortValue > processedParts[b].sortValue);
		} else {
			partList.sort((a, b) => a > b);
		}
		if (processedParts.length === 0) {
			return;
		}
		// Recreate the question part list:
		question.parts = [];
		for (let partNum of partList) {
			question.parts.push(processedParts[partNum]);
		}
		if (question.parts.length === 1) {
			return deflate1PartComposite(question);
		}
		question.sortValue = question.parts.map(part => part.sortValue).reduce((a, b) => Math.max(a, b), 0);
		return question;
	} else {
		/*
		The sort value of a non-composite question is determined by four factors. Each factor is scaled to a value from 0-1 then everything is summed.
		The factors are respectively:
		- the maximum mark of any part of the question (scaled to 0 = lowest mark in the list, 1 = highest mark in the list, using a logarithmic scale)
		- the grade difficulty of the question (scaled to 0 = minimum nonzero grade, 1 = maximum nonperfect grade). If the grading type does not have question difficulties, increase the weight of the non-random factors instead
		- a factor based on the type of the question (not scaled)
		- a random number.
		If the question is composite, its sort value is instead the highest value of any non-composite part.
		*/
		let markFactor = Math.log(maxMark(question) / globalThis.mementoTemp.minimumPartMark) / Math.log(globalThis.mementoTemp.maximumPartMark / globalThis.mementoTemp.minimumPartMark)
		let typeFactor = QuestionTypes[question.type].sortFactor ?? markFactor;
		let gradeFactor
		if ((globalThis.memento.gradingType === 2) && (question.grade.length !== 0)) {
			let gradeNum = question.grade.map(x => globalThis.memento.grades.map(y => y[0]).indexOf(x)).reduce((a, b) => a + b) / question.grade.length;
			gradeFactor = 1 - (gradeNum - 1) / (globalThis.memento.grades.length - 3);
		} else {
			gradeFactor = (markFactor + typeFactor) / 2;
		}
		question.sortValue = markFactor + typeFactor + gradeFactor + Math.random();
		return question;
	}
}
export function selectQuestionsToTotalMarks() {
	/*
	Once a maximum mark for the whole quiz is selected, we must select questions from the bank that total to this number of marks.
	We will not use full-bin packing as this is computationally infeasible and has a tendency to repeat the same questions every time a quiz is repeated.
	We will instead select random questions, weighting them by the inverse of their total mark, and for every question either:
	- if there is enough space left to fit the whole question, we will add the whole question.
	- if there is not enough space for the question, but it is a composite question, we will add as many parts of it as we can while staying within the limit.
	  for example, if we need 6 marks left to reach the limit, and the next question chosen is worth 12 marks split between a part (a) with 3 marks, a part (b)(i)
	  with 2 marks, a part (b)(ii) with 2 marks and a part (c) with 5 marks, we will remove parts (b)(ii) and part (c) and add the resulting 5-mark question.
	- if there is not enough space for any part of the question, or it is not composite, skip it.
	Once all questions have been searched in this way, stop this process even if the desired number of marks has not been reached.
	*/
	globalThis.questions = [];
	let marksNeeded = stringToNumber(document.getElementById("input_totalQuizMarks").value);
	while ((globalThis.mementoTemp.processedQuestions.length > 0) && (globalThis.mementoTemp.minimumPartMark <= marksNeeded)) {
		let idList = globalThis.mementoTemp.processedQuestions.map((question, index) => [index, 1 / Math.min(maxMark(question), marksNeeded)]);
		let nextPosition = arrayWeightedRandom(idList);
		let nextQuestion = globalThis.mementoTemp.processedQuestions.splice(nextPosition, 1)[0];
		nextQuestion = trimQuestion(nextQuestion, marksNeeded);
		if (nextQuestion !== "null") {
			nextQuestion = deflate1PartComposite(nextQuestion);
			marksNeeded -= maxMark(nextQuestion);
			globalThis.questions.push(nextQuestion);
		}
	}
	globalThis.questions.sort((a, b) => a.sortValue > b.sortValue);
	globalThis.mementoTemp.totalQuizMark = stringToNumber(document.getElementById("input_totalQuizMarks").value) - marksNeeded;
}
function trimQuestion(question, desiredMarks) {
	if (question.type === "composite") {
		if (maxMark(allQuestionParts(question)[0]) > desiredMarks) {
			return "null";
		}
		let newParts = [];
		partLoop: for (let part of question.parts) {
			if (maxMark(part) <= desiredMarks) {
				desiredMarks -= maxMark(part);
				newParts.push(structuredClone(part));
			} else {
				part = structuredClone(trimQuestion(part, desiredMarks));
				if (part !== "null") {
					newParts.push(part);
				}
				break partLoop;
			}
		}
		question.parts = structuredClone(newParts);
		if (question.parts.length === 1) {
			question = deflate1PartComposite(question);
		}
		return question;
	} else {
		return (maxMark(question) > desiredMarks) ? "null" : question;
	}
}
function createGradingScale(gradingType = globalThis.memento.gradingType) {
	if (gradingType === 0) {
		return;
	}
	// we always space grade boundaries at least 1 mark apart, so if there are not enough total marks, remove excess boundaries
	if (globalThis.mementoTemp.totalQuizMark < (globalThis.memento.grades.length - 1)) {
		globalThis.memento.grades = globalThis.memento.grades.filter((x, index) => (index + 0.5) % ((globalThis.memento.grades.length - 1) / globalThis.mementoTemp.totalQuizMark) < 1);
	}
	let gradeList = globalThis.memento.grades;
	if (gradingType === 1) {
		globalThis.mementoTemp.gradeBoundaries = {}
		for (let grade of gradeList) {
			globalThis.mementoTemp.gradeBoundaries[grade[0]] = Math.round(globalThis.mementoTemp.totalQuizMark * grade[1] / 100);
		}
	} else if (gradingType === 2) {
		let questionMarksByDifficulty = addMarks(globalThis.questions.map(question => allQuestionParts(question)).flat().map(function(part) {
			let marks = maxMark(part);
			return Object.fromEntries(part.grade.map(x => [x, marks / part.grade.length]));
		}));
		// if no grades have been defined, default to the type 1 grading scale
		if (Object.keys(questionMarksByDifficulty).length === 0) {
			createGradingScale(1);
			return;
		}
		let scaleFactor = (globalThis.mementoTemp.totalQuizMark - gradeList.length + 1) / Object.values(questionMarksByDifficulty).reduce((a, b) => a + b, 0);
		globalThis.mementoTemp.gradeBoundaries = Object.fromEntries([[gradeList[0][0], globalThis.mementoTemp.totalQuizMark], [gradeList[gradeList.length - 1][0], 0]]);
		for (let boundaryNum = 1; boundaryNum < (gradeList.length - 1); boundaryNum++) {
			let next = 0;
			for (let gradeNum = 1; gradeNum < (gradeList.length - 1); gradeNum++) {
				let gradeProportion = (Math.tanh(5 * (gradeNum - boundaryNum) / globalThis.memento.grades.length) + 1) / 2;
				next += (questionMarksByDifficulty[gradeList[gradeNum][0]] ?? 0) * gradeProportion;
			}
			globalThis.mementoTemp.gradeBoundaries[gradeList[boundaryNum][0]] = Math.round(next * scaleFactor) + gradeList.length - boundaryNum - 1;
		}
	}
}
export function showQuizInstructions() {
	document.getElementById("div_quizPlayerStartPart1").style.display = "none";
	document.getElementById("div_quizPlayerStartPart2").style.display = "block";
	selectQuestionsToTotalMarks();
	createGradingScale();
	let instructionLines = globalThis.memento.quizInstructions.split("<br>").filter(x => x !== "");
	if (instructionLines.length === 0) {
		document.getElementById("div_quizPlayerInstructions").innerHTML = "This quiz has no custom instructions.";
	} else {
		for (let instruction of instructionLines) {
			document.getElementById("div_quizPlayerInstructions").appendChild(createElement("li", {innerHTML: instruction, style: "max-width: 750px;"}));
		}
	}
	document.getElementById("div_quizPlayerInformation").appendChild(createElement("li", {innerHTML: "This quiz has <b>" + globalThis.questions.length + "</b> question" + ((globalThis.questions.length === 1) ? "" : "s") + ".", style: "max-width: 750px;"}));
	document.getElementById("div_quizPlayerInformation").appendChild(createElement("li", {innerHTML: "The total mark for this quiz is <b>" + globalThis.mementoTemp.totalQuizMark + "</b>.", style: "max-width: 750px;"}));
	if (globalThis.memento.gradingType === 0) {
		document.getElementById("div_quizPlayerInformation").appendChild(createElement("li", {innerHTML: "This quiz has no grading scale.", style: "max-width: 750px;"}));
	} else {
		let gradeTable = createTable(
			[["Grade", ...globalThis.memento.grades.map(x => x[0])], ["Mark", ...globalThis.memento.grades.map(x => formatInteger(globalThis.mementoTemp.gradeBoundaries[x[0]]))]],
			["font-weight: 700;"], [{width: "80px", "text-align": "right"}, ...Array(globalThis.memento.grades.length).fill({width: "50px", "padding-left": "15px", "padding-right": "15px", "text-align": "center"})]
		);
		let gradeBulletPoint = createElement("li", {style: "max-width: 750px;"});
		gradeBulletPoint.append("The grading scale for this quiz is as follows:");
		gradeBulletPoint.appendChild(gradeTable);
		document.getElementById("div_quizPlayerInformation").appendChild(gradeBulletPoint);
	}
}
export function startQuiz() {
	globalThis.mementoTemp.currentQuestionNumber = 0;
	globalThis.mementoTemp.playerMarks = 0;
	openWindow("quizPlayer");
	startQuestion();
}
function maxMarkText(maxMarks, achievedMarks) {
	if (achievedMarks !== undefined) { // if this is defined, then we are in marking mode: otherwise we are in playing mode.
		return createElement("span", {innerHTML: "[" + achievedMarks + " / " + maxMarks + " marks]", style: "font-weight: 700; float: right; color: hsl(" + (achievedMarks * 120 / maxMarks) + "deg, 50%, 75%);"});
	} else {
		return createElement("span", {innerHTML: "[" + pluralizeWord(maxMarks, "mark") + "]", style: "font-weight: 700; float: right;"});
	}
}
function quizPlayerQuestionText(partID, questionObject) {
	let out = createElement("div", {className: "partDiv"});
	let pre = createElement("pre", {innerHTML: questionObject.stem.replaceAll("\n", "<br>").trim()});
	pre.appendChild(maxMarkText(maxMark(questionObject)));
	out.appendChild(pre);
	out.appendChild(QuestionTypes[questionObject.type].playerHTML(partID, questionObject));
	return out;
}
function quizPlayerQuestionAnswerText(partID, questionObject, marksAchieved) {
	let out = createElement("div", {className: "partDiv"});
	let pre = createElement("pre", {innerHTML: questionObject.stem.replaceAll("\n", "<br>").trim()});
	pre.appendChild(maxMarkText(maxMark(questionObject), marksAchieved));
	out.appendChild(pre);
	let answers = QuestionTypes[questionObject.type].answerDisplay(partID, questionObject);
	out.appendChild(createTable([
		["Your answer", "Model answer"],
		[answers.userAnswer, answers.modelAnswer]
	], ["font-weight: 700"], [{width: "calc(100vw - " + (partID.split(",").length * 30 - 40) + "px)"}, {width: "calc(100vw - " + (partID.split(",").length * 30 - 40) + "px)"}]));
	return out;
}
function allQuestionPartIds(questionNumber, questionObject) {
	let out = [String(questionNumber)];
	if (questionObject.type === "composite") {
		for (let partNum = 0; partNum < questionObject.parts.length; partNum++) {
			out.push(allQuestionPartIds(questionNumber + "," + partNum, questionObject.parts[partNum]));
		}
	}
	return out.flat();
}
function quizPlayerHTML(questionObject, partID, mode, marksAchieved) {
	let depth = partID.length - partID.replaceAll(",", "").length;
	let partNum = Number(partID.split(",")[partID.split(",").length - 1]);
	let output = createElement("div");
	if (questionObject.extraOptionsActive.includes("floatingStem")) {
		output.appendChild(createElement("pre", {innerHTML: questionObject.floatingStem.replaceAll("<br>", "\n").trim()}))
	}
	let outputList = createElement("ul");
	let entry = createElement("li", {className: "questionNumber", style: "list-style: \"" + QuestionTypes.composite.questionNumber(depth, partNum) + Array.from(new Set(questionObject.partMarker ?? [])).join("") + "   \""});
	if (questionObject.type === "composite") {
		if (questionObject.stem.replaceAll("<br>", "\n").trim() !== "") {
			entry.appendChild(createElement("pre", {innerHTML: questionObject.stem.replaceAll("<br>", "\n").trim()}));
		}
		for (let partNum = 0; partNum < questionObject.parts.length; partNum++) {
			let part = questionObject.parts[partNum]
			entry.appendChild(quizPlayerHTML(part, partID + "," + partNum, mode, marksAchieved));
		}
	} else {
		entry.appendChild((mode === "play") ? quizPlayerQuestionText(partID, questionObject) : quizPlayerQuestionAnswerText(partID, questionObject, marksAchieved[partID]));
	}
	outputList.appendChild(entry);
	output.appendChild(outputList);
	if ((questionObject.type === "composite") && (depth === 0)) {
		if (mode === "play") {
			output.appendChild(createElement("span", {innerHTML: "[Total for question " + partID + " is " + maxMark(questionObject) + " marks]", style: "font-weight: 700; float: right;"}))
		} else {
			let totalAchieved = Object.values(marksAchieved).reduce((a, b) => a + b);
			output.appendChild(createElement("span", {innerHTML: "[Total for question " + partID + " is " + totalAchieved + " / " + maxMark(questionObject) + " marks]", style: "color: hsl(" + (totalAchieved * 120 / maxMark(questionObject)) + "deg, 50%, 75%); font-weight: 700; float: right;"}));
		}
		// Prevent the "continue" button being offset to the left due to being on the same line as the total
		output.appendChild(createElement("br"));
	}
	return output;
}
/* function renderQuizPlayer(mode, marksAchieved) {
	// Shows the current question in the quiz player. Mode "play" renders the question when it is being answered, mode "mark" renders it when it is being marked.
	let outputTable = [];
	// We will normally skip to the next table row every time we reach a new question part.
	// However if a composite question has a blank stem (like the prime number question in the exemplar) then we will put its first part in the same row.
	// It's too much effort to recursively do this so instead we will keep track of the current row number out here.
	let currentRow = 0;
	let questionNum = globalThis.mementoTemp.currentQuestionNumber;
	let questionObject = globalThis.questions[questionNum - 1];
	let partIdsToConsider = allQuestionPartIds(questionNum, questionObject);
	for (let partID of partIdsToConsider) {
		let splitPartID = partID.split(",");
		let partObject = getQuestionObject(questionObject, splitPartID.slice(1));
		// write floating stem (if applicable)
		if (partObject.extraOptionsActive.includes("floatingStem") && (partObject.extraOptionsActive.floatingStem !== "")) {
			outputTable = writeToQuizPlayerOutputTable(outputTable, currentRow, splitPartID.length - 1, partObject.floatingStem);
			currentRow++;
		}
		// write question number
		outputTable = writeToQuizPlayerOutputTable(outputTable, currentRow, splitPartID.length - 1, createElement("span", {innerHTML: QuestionTypes.composite.questionNumber(splitPartID.length - 1, Number(splitPartID[splitPartID.length - 1])), style: "font-weight: 700; float: right;"}));
		// write question data
		if (partObject.type !== "composite") {
			outputTable = writeToQuizPlayerOutputTable(outputTable, currentRow, splitPartID.length, (mode === "play") ? quizPlayerQuestionText(partID, partObject) : quizPlayerQuestionAnswerText(partID, partObject, marksAchieved[partID]));
			currentRow++;
		} else if (partObject.stem.replaceAll("<br>", "\n").trim() !== "") {
			outputTable = writeToQuizPlayerOutputTable(outputTable, currentRow, splitPartID.length, partObject.stem);
			currentRow++; // we do not increment the row outside the if statement to avoid it incrementing for blank stems.
		}
	}
	if (partIdsToConsider.length > 1) {
		if (mode === "play") {
			writeToQuizPlayerOutputTable(outputTable, currentRow, 1, createElement("span", {innerHTML: "[Total for question " + questionNum + " is " + maxMark(questionObject) + " marks]", style: "font-weight: 700; float: right;"}));
		} else {
			let totalAchieved = Object.values(marksAchieved).reduce((a, b) => a + b);
			writeToQuizPlayerOutputTable(outputTable, currentRow, 1, createElement("span", {innerHTML: "[Total for question " + questionNum + " is " + totalAchieved + " / " + maxMark(questionObject) + " marks]", style: "color: hsl(" + (totalAchieved * 120 / maxMark(questionObject)) + "deg, 50%, 75%); font-weight: 700; float: right;"}));
		}
	}
	let numberOfColumns = outputTable.map(row => row.length).reduce((a, b) => Math.max(a, b));
	let columnStyles = Array(numberOfColumns).fill(-1).map(function(x, index) {
		if ((numberOfColumns - index) === 1) {
			return {width: "calc(100vw - " + (numberOfColumns * 45 - 45) + "px)", "padding-left": "10px", "padding-bottom": "20px"};
		} else {
			return {width: "35px", "padding-left": "10px", "padding-bottom": "20px"}
		}
	});
	document.getElementById("div_quizPlayerTable").innerHTML = "";
	document.getElementById("div_quizPlayerTable").appendChild(createTable(outputTable, [], columnStyles));
} */
export function startQuestion() {
	if (globalThis.mementoTemp.currentQuestionNumber === globalThis.questions.length) {
		endQuiz();
	} else {
		document.getElementById("button_startQuestion").style.display = "none";
		document.getElementById("button_markQuestion").style.display = "inline-block";
		globalThis.mementoTemp.currentQuestionNumber++;
		document.getElementById("div_quizPlayer").innerHTML = "";
		document.getElementById("div_quizPlayer").appendChild(quizPlayerHTML(globalThis.questions[globalThis.mementoTemp.currentQuestionNumber - 1], String(globalThis.mementoTemp.currentQuestionNumber), "play"));
//		renderQuizPlayer("play");
	}
}
function findMarksForEachPart(questionObject, partID, runningArray = {}) {
	if (questionObject.type === "composite") {
		for (let partNum = 0; partNum < questionObject.parts.length; partNum++) {
			runningArray = findMarksForEachPart(questionObject.parts[partNum], partID + "," + partNum, runningArray);
		}
	} else {
		runningArray[partID] = Math.max(Math.floor(QuestionTypes[questionObject.type].mark(partID, questionObject)), 0);
	}
	return runningArray;
}
export function markQuestion() {
	document.getElementById("button_startQuestion").style.display = "inline-block";
	document.getElementById("button_markQuestion").style.display = "none";
	let questionNum = globalThis.mementoTemp.currentQuestionNumber;
	let questionObject = globalThis.questions[questionNum - 1];
	let marksAchieved = findMarksForEachPart(questionObject, globalThis.mementoTemp.currentQuestionNumber);
	globalThis.mementoTemp.playerMarks += Object.values(marksAchieved).reduce((a, b) => a + b);
	// We need to load the marked HTML before resetting the quiz player as otherwise the answers will be deleted before we try to access them.
	let markedQuestionHTML = quizPlayerHTML(globalThis.questions[globalThis.mementoTemp.currentQuestionNumber - 1], String(globalThis.mementoTemp.currentQuestionNumber), "mark", marksAchieved);
	document.getElementById("div_quizPlayer").innerHTML = "";
	document.getElementById("div_quizPlayer").appendChild(markedQuestionHTML);
	if (mementoTemp.misconfiguredMarkScheme) {
		createNotification("The mark scheme for this question is misconfigured.");
		mementoTemp.misconfiguredMarkScheme = false;
	}
}
function endQuiz() {
	openWindow("finalScore");
	document.getElementById("window_finalScore").appendChild(createElement("p", {innerHTML: "Your Mark: " + globalThis.mementoTemp.playerMarks + " / " + globalThis.mementoTemp.totalQuizMark}));
	let playerGrade;
	if (memento.gradingType !== 0) {
		for (let gradeNum = globalThis.memento.grades.length - 1; gradeNum >= 0; gradeNum--) {
			let gradeName = globalThis.memento.grades[gradeNum][0];
			if (globalThis.mementoTemp.playerMarks >= globalThis.mementoTemp.gradeBoundaries[gradeName]) {
				playerGrade = gradeName;
			}
		}
		document.getElementById("window_finalScore").appendChild(createElement("p", {innerHTML: "Your Grade: " + playerGrade}));
	}
}