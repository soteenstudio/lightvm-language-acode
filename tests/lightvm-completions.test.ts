import { expect, test, test as describe } from "unitry";

import { createLightVMCompletions } from "../src/language/lightvm-completions.ts";

describe("LightVM completions", () => {
	test("registers opcode, primitive-type, and snippet entries", () => {
		let registered: any[] = [];
		const completionSource = createLightVMCompletions(
			{
				completeFromList: (completions) => {
					registered = completions;
					return () => completions;
				},
				snippetCompletion: (template, completion) => ({
					...completion,
					isSnippet: true,
					template,
				}),
			},
			() => ({ resolveInner: () => ({ name: "Program" }) }),
		);

		completionSource({
			state: {},
			pos: 1,
			explicit: true,
			matchBefore: () => ({ from: 0, to: 1 }),
		});

		expect(registered).toSatisfy((items) =>
			items.some((item: any) => item.label === "stop"),
		);
		expect(registered).toSatisfy((items) =>
			items.some((item: any) => item.label === "int" && item.type === "type"),
		);
		expect(registered).toSatisfy((items) =>
			items.some(
				(item: any) => item.label === "push" && item.isSnippet === true,
			),
		);
	});
});
