const base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
export function ranint(a, b) {
	return Math.floor(a + Math.random() * (b - a + 1));
}
export function randomID() {
	let out = "";
	for (let letterNum = 0; letterNum < 3; letterNum++) {
		out += String.fromCharCode(ranint(65, 90));
	}
	for (let numberNum = 0; numberNum < 3; numberNum++) {
		out += String.fromCharCode(ranint(48, 57));
	}
	return out;
}
export function generalAlphabeticNumber(num, alphabet) { // generates an "alphabetic number" (i.e. 1 = a, 2 = b, 3 = c, ..., 26 = z, 27 = aa, ...), but with a custom set of characters as opposed to a-z.
	if (num > alphabet.length) {
		return generalAlphabeticNumber(Math.floor((num - 1) / alphabet.length), alphabet) + alphabet[(num - 1) % alphabet.length];
	} else {
		return alphabet[(num - 1) % alphabet.length];
	}
}
export function alphabeticNumber(num) {
	return generalAlphabeticNumber(num, "abcdefghijklmnopqrstuvwxyz");
}
export function romanNumeral(number) { // generates a roman numeral. Monospace fonts are recommended for implementations involving numbers greater than 4999.
	if (number >= 5e9) {
		throw "roman() does not support inputs greater than 5,000,000,000";
	} else if (number <= 0) {
		throw "roman() does not support 0 or negative inputs";
	} else if ((number % 1) !== 0) {
		throw "roman() does not support fractional inputs";
	}
	let symbols = [
		["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],    // e0 unit
		["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"],    // e1 unit
		["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM"],    // e2 unit
		["", "M", "MM", "MMM", "MMMM", "V̅", "V̅I̅", "V̅I̅I̅", "V̅I̅I̅I̅", "I̅X̅"],  // e3 unit
		["", "X̅", "X̅X̅", "X̅X̅X̅", "X̅L̅", "L̅", "L̅X̅", "L̅X̅X̅", "L̅X̅X̅X̅", "X̅C̅"],    // e4 unit
		["", "C̅", "C̅C̅", "C̅C̅C̅", "C̅D̅", "D̅", "D̅C̅", "D̅C̅C̅", "D̅C̅C̅C̅", "C̅M̅"],    // e5 unit
		["", "M̅", "M̅M̅", "M̅M̅M̅", "M̅M̅M̅M̅", "V̅̅", "V̅̅I̅̅", "V̅̅I̅̅I̅̅", "V̅̅I̅̅I̅̅I̅̅", "I̅̅X̅̅"],  // e6 unit
		["", "X̅̅", "X̅̅X̅̅", "X̅̅X̅̅X̅̅", "X̅̅L̅̅", "L̅̅", "L̅̅X̅̅", "L̅̅X̅̅X̅̅", "L̅̅X̅̅X̅̅X̅̅", "X̅̅C̅̅"],    // e7 unit
		["", "C̅̅", "C̅̅C̅̅", "C̅̅C̅̅C̅̅", "C̅̅D̅̅", "D̅̅", "D̅̅C̅̅", "D̅̅C̅̅C̅̅", "D̅̅C̅̅C̅̅C̅̅", "C̅̅M̅̅"],    // e8 unit
		["", "M̅̅", "M̅̅M̅̅", "M̅̅M̅̅M̅̅", "M̅̅M̅̅M̅̅M̅̅"]                                  // e9 unit
	];
	let out = "";
	for (let i = Math.floor(Math.log10(number)); i >= 0; i--) {
		out += symbols[i][Math.floor(number / 10 ** i)];
		number -= 10 ** i * Math.floor(number / 10 ** i);
	}
	return out;
}
export function joinArrayWithAnd(array) {
	if (array.length < 3) {
		return array.join(" and ");
	}
	return array.slice(0, array.length - 1).join(", ") + " and " + array[array.length - 1];
}
const illionNames = [
	"thousand", "million", "billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion", "octillion", "nonillion",
	"decillion", "undecillion", "duodecillion", "tredecillion", "quattuordecillion", "quindecillion", "sexdecillion", "septemdecillion", "octodecillion", "novemdecillion",
	"vigintillion", "unvigintillion", "duovigintillion", "trevigintillion", "quattuorvigintillion", "quinvigintillion", "sexvigintillion", "septemvigintillion", "octovigintillion", "novemvigintillion",
	"trigintillion", "untrigintillion", "duotrigintillion", "tretrigintillion", "quattuortrigintillion", "quintrigintillion", "sextrigintillion", "septemtrigintillion", "octotrigintillion", "novemtrigintillion",
	"quadragintillion", "unquadragintillion", "duoquadragintillion", "trequadragintillion", "quattuorquadragintillion", "quinquadragintillion", "sexquadragintillion", "septemquadragintillion", "octoquadragintillion", "novemquadragintillion",
	"quinquagintillion", "unquinquagintillion", "duoquinquagintillion", "trequinquagintillion", "quattuorquinquagintillion", "quinquinquagintillion", "sexquinquagintillion", "septemquinquagintillion", "octoquinquagintillion", "novemquinquagintillion",
	"sexagintillion", "unsexagintillion", "duosexagintillion", "tresexagintillion", "quattuorsexagintillion", "quinsexagintillion", "sexsexagintillion", "septemsexagintillion", "octosexagintillion", "novemsexagintillion",
	"septuagintillion", "unseptuagintillion", "duoseptuagintillion", "treseptuagintillion", "quattuorseptuagintillion", "quinseptuagintillion", "sexseptuagintillion", "septemseptuagintillion", "octoseptuagintillion", "novemseptuagintillion",
	"octogintillion", "unoctogintillion", "duooctogintillion", "treoctogintillion", "quattuoroctogintillion", "quinoctogintillion", "sexoctogintillion", "septemoctogintillion", "octooctogintillion", "novemoctogintillion",
	"nonagintillion", "unnonagintillion", "duononagintillion", "trenonagintillion", "quattuornonagintillion", "quinnonagintillion", "sexnonagintillion", "septemnonagintillion", "octononagintillion", "novemnonagintillion",
	"centillion", "uncentillion"
];
export function numberToWord(num, decimalPrecision = 15) {
	if (num === 0) {
		return "zero";
	} else if (num < 0) {
		return "minus " + numberToWord(-num, decimalPrecision);
	}
	let parts = [];
	for (let illionNum = Math.floor(Math.log10(num) / 3 - 1); illionNum > -2; illionNum--) {
		let illionValue = 1e3 ** (illionNum + 1);
		let illionAmount = Math.floor(num / illionValue);
		if (illionAmount > 0) {
			parts.push(smallIntegerToWord(illionAmount) + ((illionNum === -1) ? "" : (" " + illionNames[illionNum])));
			num -= illionAmount * illionValue
		}
	}
	let out = (parts.length === 0) ? "zero" : parts[parts.length - 1].includes("and") ? parts.join(", ") : joinArrayWithAnd(parts);
	if (num !== 0) {
		let decimals = String(num.toFixed(decimalPrecision)).slice(2).split("") // slice(2) removes "0."
		while (decimals[decimals.length - 1] === "0") { // remove leading zeroes
			decimals.splice(decimals.length - 1);
		}
		out += " point " + decimals.map(x => ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][x]).join(" ");
	}
	return out;
}
function smallIntegerToWord(num) { // for 1-99
	let out = "";
	if (num > 99) {
		out = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][Math.floor(num / 100 - 1)] + " hundred";
		if ((num % 100) !== 0) {
			out += " and ";
		}
		num = num % 100;
	}
	if (num > 19) {
		out += ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"][Math.floor(num / 10) - 2];
		if ((num % 10) > 0) {
			out += "-" + ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][num % 10 - 1];
		}
	} else if (num > 0) {
		out += ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"][num - 1];
	}
	return out;
}
export function pluralizeWord(number, singular, plural = singular + "s", formatNumberAsWord = false) {
	return (formatNumberAsWord ? numberToWord(number) : formatInteger(number)) + " " + ((number === 1) ? singular : plural);
}
export function mergeObjects(objectArray) {
	let out = {}
	for (let item of objectArray) {
		out = Object.defineProperties(out, {
			...Object.getOwnPropertyDescriptors(item)
		})
	}
	return out
}
export function stringToNumber(string, ifError = 0) {
	let out = Number(string);
	return ((out >= 0) || (out <= 0)) ? out : ifError;
}
export function deHTML(str) {
	if (typeof str !== "string")
			throw "Cannot access deHTML("+JSON.stringify(str)+")"
	else
			str = str.toString();
				
	// Regular expression to identify HTML tags in
	// the input string. Replacing the identified
	// HTML tag with a null string.
	return str.replace( /(<([^>]+)>)/ig, '');
}
export function simplifyString(string) {
	return String(string).replace(/[^A-Za-z0-9]/g,"").toLowerCase();
}
export function readTable(table) {
	return Array.from(table.children).map(row => Array.from(row.children).map(col => col.innerText));
}
export async function readTextFile(file) {
	let bytes = await file.bytes();
	return new TextDecoder().decode(bytes);
}
function illionPrefix(illionNum) {
	if (illionNum < 10) {
		return ["M", "B", "T", "Qa", "Qt", "Sx", "Sp", "Oc", "No"][illionNum - 1];
	} else {
		return ["", "U", "D", "T", "Qa", "Qt", "Sx", "Sp", "O", "N"][illionNum % 10] + ["Dc", "Vg", "Tg", "Qd", "Qi", "Se", "St", "Og", "Nn", "Ce"][Math.floor(illionNum / 10)];
	}
}
export function formatInteger(num) {
	if (num < 0) {
		return "-" + formatInteger(-num);
	} else if (num < 1000) {
		return String(num);
	} else if (num < 1e6) {
		return String(Math.floor(num / 1000)) + " " + String(num % 1000).padStart(3, "0");
	} else {
		let powerOf10 = Math.floor(Math.log10(num));
		let illionNum = Math.floor(powerOf10 / 3) - 1;
		return (num / 1000 ** (illionNum + 1)).toFixed(2 - (powerOf10 % 3)) + " " + illionPrefix(illionNum);
	}
}
export function shuffleArray(array) {
	let out = [];
	while (array.length > 0) {
		out.push(array.splice(Math.floor(Math.random() * array.length), 1)[0]);
	}
	return out;
}
export function arrayWeightedRandom(array) {
	// generate a random number R between 0 and the total weight; if R < weight 1, return item 1; if R < weight 1 + weight 2, return item 2; etc.
	let totalWeight = array.map(x => x[1]).reduce((a, b) => a + b);
	let determinant = totalWeight * Math.random();
	for (let item of array) {
		if (determinant <= item[1]) {
			return item[0];
		} else {
			determinant -= item[1];
		}
	}
}
export function toggleButtonActive(event) {
	if (event.target.classList.contains("active")) {
		event.target.classList.remove("active");
	} else {
		event.target.classList.add("active");
	}
}
export function toggleButtonOn(event) {
	if (event.target.classList.contains("on")) {
		event.target.classList.remove("on");
	} else {
		event.target.classList.add("on");
	}
}
