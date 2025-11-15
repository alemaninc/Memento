import { createElement, createTable } from "./html_support.js";
import { openWindow } from "./main_menu.js";
import { createNotification } from "./notifications.js";
import { QuestionTypes } from "./question_types.js";
import { addMarks, allQuestionParts, getQuestionObject, maxMark } from "./question_utility.js";
import { arrayWeightedRandom, formatInteger, shuffleArray, stringToNumber } from "./utility.js";

export function openQuizPlayer() {
	if (Object.values(globalThis.memento.questions).map(x => maxMark(x)).reduce((a, b) => a + b, 0) === 0) {
		createNotification("There are no questions in this quiz.");
		return;
	}
	// prepare questions for taking
	globalThis.mementoTemp.minimumPartMark = Object.values(globalThis.memento.questions).map(question => allQuestionParts(question).map(part => maxMark(part)).reduce((a, b) => Math.min(a, b))).reduce((a, b) => Math.min(a, b));
	globalThis.mementoTemp.maximumPartMark = Object.values(globalThis.memento.questions).map(question => allQuestionParts(question).map(part => maxMark(part)).reduce((a, b) => Math.max(a, b))).reduce((a, b) => Math.max(a, b));
	globalThis.mementoTemp.processedQuestions = [];
	for (let questionId of Object.keys(globalThis.memento.questions)) {
		if (maxMark(globalThis.memento.questions[questionId]) > 0) {
			globalThis.mementoTemp.processedQuestions.push(processQuestionForPlayer(globalThis.memento.questions[questionId]));
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
function deflate1PartComposite(question) {
	if ((question.type === "composite") && (question.parts.length === 1)) {
		let part = structuredClone(question.parts[0]);
		part.stem = part.stem.replaceAll("<br>", "\n").trim();
		part.stem = ((question.stem !== "") && (part.stem !== "")) ? (question.stem + "\n\n" + part.stem) : question.stem + part.stem;
		return part;
	} else {
		return question;
	}
}
function processQuestionForPlayer(question) {
	question.stem = question.stem.replaceAll("<br>", "\n").trim();
	if (question.type === "composite") {
		question.parts = question.parts.filter(x => maxMark(x) > 0);
		// rearrange/remove parts for select/shuffle options
		let partList = shuffleArray(Array(question.parts.length).fill(0).map((x, i) => i));
		if (question.extraOptionsActive.includes("selectParts")) {
			partList = partList.slice(0, question.selectParts);
		}
		if (question.extraOptionsActive.includes("shuffleParts")) {
			partList.sort((a, b) => question.parts[a].sortValue > question.parts[b].sortValue);
		} else {
			partList.sort((a, b) => a > b);
		}
		question.parts = structuredClone(question.parts).filter((x, i) => partList.includes(i)).map(part => processQuestionForPlayer(part));
		if (question.parts.length === 1) {
			return deflate1PartComposite(question);
		}
		question.sortValue = question.parts.map(part => part.sortValue).reduce((a, b) => Math.max(a, b));
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
		// if no marks have been defined, default	to the type 1 grading scale
		if (Object.keys(questionMarksByDifficulty).length === 0) {
			createGradingScale(1);
			return;
		}
		let scaleFactor = (globalThis.mementoTemp.totalQuizMark - gradeList.length + 1) / Object.values(questionMarksByDifficulty).reduce((a, b) => a + b, 0);
		globalThis.mementoTemp.gradeBoundaries = Object.fromEntries([[gradeList[0][0], globalThis.mementoTemp.totalQuizMark], [gradeList[gradeList.length - 1][0], 0]]);
		for (let boundaryNum = 1; boundaryNum < (gradeList.length - 1); boundaryNum++) {
			let next = 0;
			for (let gradeNum = 1; gradeNum < (gradeList.length - 1); gradeNum++) {
				let gradeDifference = gradeNum - boundaryNum;
				let gradeProportion = (gradeDifference > 0) ? (1 - 2 ** (-gradeDifference - 1)) : (gradeDifference < 0) ? (2 ** (gradeDifference - 1)) : 0.5;
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
	document.getElementById("div_quizPlayerInstructions").appendChild(createElement("li", {innerHTML: "This quiz has <b>" + globalThis.questions.length + "</b> question" + ((globalThis.questions.length === 1) ? "" : "s") + "."}));
	document.getElementById("div_quizPlayerInstructions").appendChild(createElement("li", {innerHTML: "The total mark for this quiz is <b>" + globalThis.mementoTemp.totalQuizMark + "</b>."}));
	if (globalThis.memento.gradingType === 0) {
	document.getElementById("div_quizPlayerInstructions").appendChild(createElement("li", {innerHTML: "This quiz has no grading scale."}));
	} else {
		let gradeTable = createTable(
			[["Grade", "Mark"], ...globalThis.memento.grades.map(x => [x[0], formatInteger(globalThis.mementoTemp.gradeBoundaries[x[0]])])],
			["font-weight: 700"], [{"text-align": "right", "font-weight": 700, "min-width": "80px"}, {"text-align": "right", "width": "80px"}]
		);
		gradeTable.classList.add("borderedTable");
		let gradeBulletPoint = createElement("li");
		gradeBulletPoint.append("The grading scale for this quiz is as follows:");
		gradeBulletPoint.appendChild(gradeTable);
		document.getElementById("div_quizPlayerInstructions").appendChild(gradeBulletPoint);
	}
}
export function startQuiz() {
	globalThis.mementoTemp.currentQuestionNumber = 0;
	globalThis.mementoTemp.playerMarks = 0;
	openWindow("quizPlayer");
	startQuestion();
}
function writeToQuizPlayerOutputTable(currentTable, row, col, value) {
	while (currentTable.length <= row) {
		currentTable.push([]);
	}
	while (currentTable[row].length <= col) {
		currentTable[row].push("");
	}
	currentTable[row][col] = value;
	return currentTable;
}
function quizPlayerQuestionText(partID, questionObject) {
	let out = createElement("div");
	out.innerHTML = questionObject.stem.replaceAll("\n", "<br>");
	out.appendChild(createElement("span", {innerHTML: "[" + maxMark(questionObject) + "]", style: "font-weight: 700; float: right;"}));
	out.appendChild(createElement("br"));
	out.appendChild(QuestionTypes[questionObject.type].playerHTML(partID, questionObject));
	return out;
}
function quizPlayerQuestionAnswerText(partID, questionObject, marksAchieved) {
	let out = createElement("div");
	out.innerHTML = questionObject.stem.replaceAll("\n", "<br>");
	out.appendChild(createElement("span", {innerHTML: "[" + marksAchieved + " / " + maxMark(questionObject) + "]", style: "font-weight: 700; float: right; color: hsl(" + (marksAchieved * 120 / maxMark(questionObject) + "deg, 50%, 75%);")}));
	out.appendChild(createElement("br"));
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
function renderQuizPlayer(mode, marksAchieved) {
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
		// write question number
		outputTable = writeToQuizPlayerOutputTable(outputTable, currentRow, splitPartID.length - 1, createElement("span", {innerHTML: QuestionTypes.composite.questionNumber(splitPartID.length - 1, Number(splitPartID[splitPartID.length - 1])), style: "font-weight: 700; float: right;"}));
		// write question data
		if (partObject.type !== "composite") {
			outputTable = writeToQuizPlayerOutputTable(outputTable, currentRow, splitPartID.length, (mode === "play") ? quizPlayerQuestionText(partID, partObject) : quizPlayerQuestionAnswerText(partID, partObject, marksAchieved[partID]));
			currentRow++;
		} else if (partObject.stem !== "") {
			outputTable = writeToQuizPlayerOutputTable(outputTable, currentRow, splitPartID.length, partObject.stem);
			currentRow++; // we do not increment the row outside the if statement to avoid it incrementing for blank stems.
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
}
export function startQuestion() {
	if (globalThis.mementoTemp.currentQuestionNumber === globalThis.questions.length) {
		endQuiz();
	} else {
		document.getElementById("button_startQuestion").style.display = "none";
		document.getElementById("button_markQuestion").style.display = "inline-block";
		globalThis.mementoTemp.currentQuestionNumber++;
		renderQuizPlayer("play");
	}
}
export function markQuestion() {
	document.getElementById("button_startQuestion").style.display = "inline-block";
	document.getElementById("button_markQuestion").style.display = "none";
	let questionNum = globalThis.mementoTemp.currentQuestionNumber;
	let questionObject = globalThis.questions[questionNum - 1];
	let partIdsToConsider = allQuestionPartIds(questionNum, questionObject);
	let marksAchieved = {};
	for (let partID of partIdsToConsider) {
		let splitPartID = partID.split(",");
		let partObject = getQuestionObject(questionObject, splitPartID.slice(1));
		if (partObject.type !== "composite") {
			let marksForPart = QuestionTypes[partObject.type].mark(partID, partObject);
			marksAchieved[partID] = marksForPart;
			globalThis.mementoTemp.playerMarks += marksForPart;
		}
	}
	renderQuizPlayer("mark", marksAchieved);
}
function endQuiz() {
	openWindow("finalScore");
	document.getElementById("window_finalScore").appendChild(createElement("p", {innerHTML: "Your Mark: " + globalThis.mementoTemp.playerMarks + " / " + globalThis.mementoTemp.totalQuizMark}));
	let playerGrade;
	for (let gradeNum = globalThis.memento.grades.length - 1; gradeNum >= 0; gradeNum--) {
		let gradeName = globalThis.memento.grades[gradeNum][0];
		if (globalThis.mementoTemp.playerMarks >= globalThis.mementoTemp.gradeBoundaries[gradeName]) {
			playerGrade = gradeName;
		}
	}
	document.getElementById("window_finalScore").appendChild(createElement("p", {innerHTML: "Your Grade: " + playerGrade}));
}