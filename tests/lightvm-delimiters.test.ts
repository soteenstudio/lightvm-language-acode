import { expect, test, test as describe } from "unitry";

import {
	closingDelimiter,
	closingDelimiters,
	createDelimiterExtensions,
} from "../src/language/lightvm-delimiters.ts";

interface TreeNode {
	name: string;
	from: number;
	to: number;
}

const syntaxTreeFor = (nodes: TreeNode[]) => () => ({
	cursor: () => {
		let index = 0;
		return {
			get name() {
				return nodes[index].name;
			},
			get from() {
				return nodes[index].from;
			},
			get to() {
				return nodes[index].to;
			},
			next: () => ++index < nodes.length,
		};
	},
});

const documentFor = (text: string) => {
	const lines = text.split("\n");
	const starts = lines.map((_, index) =>
		lines.slice(0, index).reduce((total, line) => total + line.length + 1, 0),
	);
	const line = (number: number) => ({
		number,
		from: starts[number - 1],
		to: starts[number - 1] + lines[number - 1].length,
		text: lines[number - 1],
	});
	return {
		line,
		lineAt: (position: number) => {
			let index = starts.length - 1;
			while (index > 0 && starts[index] > position) index--;
			return line(index + 1);
		},
	};
};

describe("LightVM delimiters", () => {
	test("maps opening delimiters to their closing delimiters", () => {
		expect(closingDelimiter).toEqual({
			OpenSquareBracket: "CloseSquareBracket",
			OpenParenthesis: "CloseParenthesis",
			OpenBrace: "CloseBrace",
		});
	});

	test("contains every closing delimiter name", () => {
		expect([...closingDelimiters]).toEqual([
			"CloseSquareBracket",
			"CloseParenthesis",
			"CloseBrace",
		]);
	});

	test("indents inside a pair and aligns a closing delimiter", () => {
		const indentProviders: any[] = [];
		const state = { doc: documentFor("push {\nvalue\n}") };
		createDelimiterExtensions({
			indentService: { of: (provider: any) => indentProviders.push(provider) },
			foldService: { of: (provider: any) => provider },
			syntaxTree: syntaxTreeFor([
				{ name: "OpenBrace", from: 5, to: 6 },
				{ name: "CloseBrace", from: 13, to: 14 },
			]),
		});
		const context = { state, unit: 2, lineAt: state.doc.lineAt };

		expect(indentProviders[0](context, 7)).toBe(2);
		expect(indentProviders[0](context, 13)).toBe(0);
	});

	test("folds a delimiter pair spanning multiple lines", () => {
		const foldProviders: any[] = [];
		const state = { doc: documentFor("push {\nvalue\n}") };
		createDelimiterExtensions({
			indentService: { of: (provider: any) => provider },
			foldService: { of: (provider: any) => foldProviders.push(provider) },
			syntaxTree: syntaxTreeFor([
				{ name: "OpenBrace", from: 5, to: 6 },
				{ name: "CloseBrace", from: 13, to: 14 },
			]),
		});

		expect(foldProviders[0](state, 0, 6)).toEqual({ from: 6, to: 13 });
	});
});
