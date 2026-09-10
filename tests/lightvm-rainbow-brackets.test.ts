import { expect, test, test as describe } from "unitry";

import { createRainbowBracketExtensions } from "../src/language/lightvm-rainbow-brackets.ts";

interface TreeNode {
	name: string;
	from: number;
	to: number;
}

const createPlugin = (nodes: TreeNode[]) => {
	let Plugin: any;
	const apis = {
		Decoration: {
			mark: ({ class: className }: any) => ({
				range: (from: number, to: number) => ({ from, to, className }),
			}),
			set: (ranges: any[]) => ranges,
		},
		EditorView: { baseTheme: (theme: any) => theme },
		ViewPlugin: {
			fromClass: (plugin: any) => {
				Plugin = plugin;
				return { plugin };
			},
		},
		syntaxTree: () => {
			let index = 0;
			return {
				cursor: () => ({
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
				}),
			};
		},
	};
	createRainbowBracketExtensions(
		apis,
		{ OpenBrace: "CloseBrace", OpenParenthesis: "CloseParenthesis" },
		new Set(["CloseBrace", "CloseParenthesis"]),
	);
	return Plugin;
};

describe("LightVM rainbow brackets", () => {
	test("colors matching delimiters according to nesting depth", () => {
		const Plugin = createPlugin([
			{ name: "OpenBrace", from: 0, to: 1 },
			{ name: "OpenParenthesis", from: 2, to: 3 },
			{ name: "CloseParenthesis", from: 4, to: 5 },
			{ name: "CloseBrace", from: 6, to: 7 },
		]);
		const plugin = new Plugin({ state: {} });

		expect(plugin.decorations).toEqual([
			{ from: 0, to: 1, className: "cm-lightvm-bracket-red" },
			{ from: 2, to: 3, className: "cm-lightvm-bracket-orange" },
			{ from: 4, to: 5, className: "cm-lightvm-bracket-orange" },
			{ from: 6, to: 7, className: "cm-lightvm-bracket-red" },
		]);
	});

	test("does not decorate unmatched delimiters", () => {
		const Plugin = createPlugin([
			{ name: "OpenBrace", from: 0, to: 1 },
			{ name: "CloseParenthesis", from: 2, to: 3 },
		]);
		const plugin = new Plugin({ state: {} });

		expect(plugin.decorations).toEqual([]);
	});
});
