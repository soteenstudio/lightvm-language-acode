import { expect, test, test as describe } from "unitry";

import { createInstructionPointerExtensions } from "../src/language/lightvm-instruction-pointers.ts";

const createApis = () => {
	let Plugin: any;
	const widgets: any[] = [];
	return {
		widgets,
		apis: {
			Decoration: {
				none: [],
				widget: ({ widget }: any) => ({
					range: (to: number) => {
						const range = { to, widget };
						widgets.push(range);
						return range;
					},
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
			WidgetType: class {},
			syntaxTree: () => {
				const nodes = [
					{ name: "Opcode", to: 3 },
					{ name: "Identifier", to: 7 },
					{ name: "Opcode", to: 11 },
				];
				let index = 0;
				return {
					cursor: () => ({
						get name() {
							return nodes[index].name;
						},
						get to() {
							return nodes[index].to;
						},
						next: () => ++index < nodes.length,
					}),
				};
			},
		},
		getPlugin: () => Plugin,
	};
};

describe("LightVM instruction pointers", () => {
	test("creates pointers in opcode order and dispatches when toggled", () => {
		const mocks = createApis();
		const result = createInstructionPointerExtensions(mocks.apis);
		let dispatches = 0;
		const view = { state: {}, dispatch: () => dispatches++ };
		const plugin = new (mocks.getPlugin())(view);

		expect(result.toggleInstructionPointers(view)).toBe(true);
		expect(dispatches).toBe(1);
		expect(plugin.decorations.map((range: any) => range.to)).toEqual([3, 11]);
		expect(
			plugin.decorations.map((range: any) => range.widget.index),
		).toEqual([0, 1]);
	});

	test("returns false for an unregistered view", () => {
		const mocks = createApis();
		const result = createInstructionPointerExtensions(mocks.apis);

		expect(result.toggleInstructionPointers({ state: {} })).toBe(false);
	});
});
