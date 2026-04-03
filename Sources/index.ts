import * as Kagome from "kagome-wasm";

export interface KagomeOptions {
	sysdict: "ipa" | "uni";
}

const reWord = /^[ァ-ヾ]+$/;
const reIgnoreText = /[[\]「」『』、。？！]/g;
const reIgnoreChar = /[ァィゥェォャュョ]/g;
const reKana = /^[ァ-タダ-ヶ]+$/;

const allowedPoS = [
	"名詞",
	"形容詞",
	"形状詞",
	"形容動詞",
	"副詞",
	"連体詞",
	"接続詞",
	"感動詞",
	"接頭詞",
	"フィラー",
];

const disallowedParticles = [
	"副助詞",
	"準体助詞",
	"終助詞",
	"係助詞",
	"格助詞",
	"接続助詞",
	"連体化",
	"副助詞／並立助詞／終助詞",
];

function countChars(s: string): number {
	return [...s.replace(reIgnoreChar, "")].length;
}

function isIgnore(token: Kagome.Token): boolean {
	const c = token.pos;
	return (
		(c.length > 0) &&
		(
			(c[0] === "空白") ||
			(c[0] === "補助記号") ||
			(
				(c[0] === "記号") &&
				(c[1] === "空白")
			)
		)
	);
}

function isWord(token: Kagome.Token): boolean {
	const c = token.pos;

	if (
		(c[0] !== "名詞") &&
		(c[1] === "非自立")
	) return false;

	if (
		(allowedPoS.includes(c[0]!)) &&
		(c[1] !== "接尾")
	) return true;

	if (
		(c[0] === "接頭辞") ||
		(
			(c[0] === "接続詞") &&
			(c[1] === "名詞接続")
		)
	) return false;

	if (
		(c[0] === "形状詞") &&
		(c[1] !== "助動詞語幹")
	) return true;

	if (c[0] === "代名詞") return true;

	if (
		(c[0] === "記号") &&
		(c[1] === "一般")
	) return true;

	if (
		(c[0] === "助詞") &&
		(!disallowedParticles.includes(c[1]!))
	) return true;

	if (
		(c[0] === "動詞") &&
		(
			(c[1] !== "接尾") &&
			(c[1] !== "非自立")
		)
	) return true;

	if (
		(c[0] === "カスタム人名") ||
		(c[0] === "カスタム名詞")
	) return true;

	return false;
}

function isEnd(token: Kagome.Token): boolean {
	const c = token.pos;

	if (c[0] === "接頭辞") {
		if (
			(token.pronunciation) &&
			(token.surface.includes("御"))
		) return false;
		return true;
	}

	if (c[1] === "非自立") {
		if (
			(c[0] === "名詞") ||
			(c[0] === "動詞")
		) return true;
		if (token.pronunciation === "ノ") return true;
		return false;
	}

	/*
	if (c[Kagome.FeatureIndex.InflectionalForm]) {
		if (c[Kagome.FeatureIndex.InflectionalForm] === "未然形") return false;
		// if (c[Kagome.FeatureIndex.InflectionalForm].startsWith("連用")) return false;
	}
	*/
	return true;
}

export interface MatchOptions {
	rule: number[];
	kagome?: Partial<KagomeOptions>;
}

const defaultMatchOptions: MatchOptions = {
	rule: [5, 7, 5]
};

/**
 * Initializes the library.
 */
export async function init(): Promise<void> {
	await Kagome.init();
	Kagome.tokenize("dummy", "ipa");
	Kagome.tokenize("dummy", "uni");
}

/**
 * Determines whether the given text matches a specified mora (syllable) pattern.  
 * This is mainly used for validating *Haiku* structures (e.g., `5-7-5`).
 * 
 * @param text The input text to be analyzed (typically Japanese).
 * @param rule An array representing the mora pattern (e.g., `[5, 7, 5]` for a haiku).
 * @returns Returns true if the text matches the specified pattern, otherwise false.
 * 
 * @example
 * match("古池や蛙飛び込む水の音", { rule: [5, 7, 5] }) // => true
 */
export function match(text: string, options: Partial<MatchOptions> = {}): boolean {
	const _options = { ...defaultMatchOptions, ...options };
	if (_options.rule.length === 0) return false;

	text = text.replace(reIgnoreText, " ");
	let tokens: Kagome.Token[] = Kagome.tokenize(text, _options.kagome?.sysdict);

	tokens = tokens.filter((t) => !isIgnore(t));

	let pos: number = 0;
	const r = [..._options.rule];

	for (let i: number = 0; i < tokens.length; i++) {
		const tok = tokens[i]!;

		let y: string;

		if (reKana.test(tok.surface)) {
			y = tok.surface;
		} else if (tok.pronunciation) {
			y = tok.pronunciation;
		} else {
			y = tok.surface;
		}

		if (!reWord.test(y)) {
			if (y === "、") continue;
			return false;
		}

		if (
			(pos >= r.length) ||
			(
				(r[pos] === _options.rule[pos]) &&
				(!isWord(tok))
			)
		) return false;

		const n = countChars(y);
		r[pos]! -= n;

		if (r[pos] === 0) {
			if (!isEnd(tok)) return false;

			pos++;
			if (
				(pos === r.length) &&
				(i === tokens.length - 1)
			) return true;
		}
	}

	return false;
}

export interface FindOptions {
	rule: number[];
	kagome?: Partial<KagomeOptions>;
}

const defaultFindOptions: FindOptions = {
	rule: [5, 7, 5]
};

/**
 * Extracts substrings from the given text that match a specified mora (syllable) pattern.  
 * This is mainly used for finding *Haiku*-like phrases (e.g., `5-7-5`) within a sentence.
 * 
 * @param text The input text to be analyzed (typically Japanese).
 * @param options The options for the find operation.
 * @returns Returns an array of matched substrings. If no match is found, an empty array is returned.
 * 
 * @example
 * find("古池や蛙飛び込む水の音", { rule: [5, 7, 5] }) // => ["古池や 蛙飛び込む 水の音"]
 */
export function find(text: string, options: Partial<FindOptions> = {}): string[] {
	const _options = { ...defaultFindOptions, ...options };
	if (_options.rule.length === 0) return [];

	text = text.replace(reIgnoreText, " ");

	let tokens: Kagome.Token[] = Kagome.tokenize(text, _options.kagome?.sysdict);
	tokens = tokens.filter((t) => !isIgnore(t));


	for (let i: number = 0; i < tokens.length; i++) {
		if (reKana.test(tokens[i]!.surface)) {
			let surface: string = tokens[i]!.surface;
			let j: number = i + 1;
			for (; j < tokens.length; j++) {
				if (reKana.test(tokens[j]!.surface)) {
					surface += tokens[j]!.surface;
				} else break;
			}
			tokens[i]!.surface = surface;

			const removeCount = j - i - 1;
			if (removeCount > 0) tokens.splice(i + 1, removeCount);
		}
	}

	const ret: string[] = [];

	let pos: number = 0;
	let r: number[] = [..._options.rule];
	let sentence: string = "";
	let start: number = 0;
	let ambigous: number = 0;

	for (let i: number = 0; i < tokens.length; i++) {
		const tok = tokens[i]!;

		const hasYomi = tok.pronunciation || tok.reading || tok.surface;
		if (!hasYomi) continue;

		let y: string;

		if (reKana.test(tok.surface)) {
			y = tok.surface;
		} else if (tok.pronunciation) {
			y = tok.pronunciation;
		} else {
			y = tok.surface;
		}

		if (!reWord.test(y)) {
			if (y === "、") continue;
			pos = 0;
			ambigous = 0;
			sentence = "";
			r = [..._options.rule];
			continue;
		}

		if (
			(pos >= _options.rule.length) ||
			(
				(r[pos] === _options.rule[pos]) &&
				(!isWord(tok))
			)
		) {
			pos = 0;
			ambigous = 0;
			sentence = "";
			r = [..._options.rule];
			continue;
		}

		ambigous += (y.match(/ッ/g)?.length || 0) + (y.match(/ー/g)?.length || 0);

		const n = countChars(y);
		r[pos]! -= n;

		sentence += tok.surface;

		if (
			(r[pos]! >= 0) && (
				(r[pos] === 0) ||
				(r[pos]! + ambigous === 0)
			)
		) {
			pos++;

			if (pos === r.length) {
				if (isEnd(tok)) {
					ret.push(sentence);
					start = i + 1;
				}

				pos = 0;
				ambigous = 0;
				sentence = "";
				r = [..._options.rule];
				continue;
			}

			sentence += " ";
		} else if (r[pos]! < 0) {
			i = start + 1;
			start++;

			pos = 0;
			ambigous = 0;
			sentence = "";
			r = [..._options.rule];
		}
	}

	return ret;
}