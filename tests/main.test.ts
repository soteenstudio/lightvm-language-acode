import { expect, test, test as describe } from "unitry";

const importMain = (scenario: string) =>
	import(`../src/main.ts?scenario=${scenario}`);

describe("plugin entry point", () => {
	test("registers, initializes, and unmounts the LightVM plugin", async () => {
		let initHandler: any;
		let unmountHandler: any;
		let languageRegistration: any;
		let commandRegistration: any;
		const removedCommands: string[] = [];
		const unregisteredLanguages: string[] = [];
		const appendedStyles: any[] = [];
		const style = {
			textContent: "",
			removed: false,
			remove() {
				this.removed = true;
			},
		};
		const editorLanguages = {
			register: (...args: any[]) => {
				languageRegistration = args;
			},
			unregister: (id: string) => unregisteredLanguages.push(id),
		};
		const commands = {
			addCommand: (command: any) => {
				commandRegistration = command;
			},
			removeCommand: (id: string) => removedCommands.push(id),
		};
		const syntaxTree = () => ({
			cursor: () => ({ name: "Program", from: 0, to: 0, next: () => false }),
			resolveInner: () => ({ name: "Program" }),
		});
		const acodeMock = {
			setPluginInit: (_id: string, handler: any) => {
				initHandler = handler;
			},
			setPluginUnmount: (_id: string, handler: any) => {
				unmountHandler = handler;
			},
			require: (name: string) => {
				if (name === "editorLanguages") return editorLanguages;
				if (name === "commands") return commands;
				if (name === "@codemirror/language") {
					return {
						foldService: { of: (provider: any) => provider },
						indentService: { of: (provider: any) => provider },
						LRLanguage: {
							define: () => ({
								data: { of: (value: any) => ({ languageData: value }) },
							}),
						},
						syntaxTree,
					};
				}
				if (name === "@codemirror/autocomplete") {
					return {
						completeFromList: (items: any[]) => () => items,
						snippetCompletion: (template: string, item: any) => ({
							...item,
							template,
						}),
					};
				}
				if (name === "@codemirror/view") {
					return {
						Decoration: {
							mark: () => ({ range: () => ({}) }),
							none: [],
							set: (ranges: any[]) => ranges,
							widget: () => ({ range: () => ({}) }),
						},
						EditorView: { baseTheme: (theme: any) => theme },
						ViewPlugin: {
							fromClass: (plugin: any, options?: any) => ({ plugin, options }),
						},
						WidgetType: class {},
					};
				}
				if (name === "@lezer/highlight") {
					return {
						styleTags: () => () => null,
						tags: new Proxy({}, { get: (_target, property) => property }),
					};
				}
				throw new Error(`Unexpected acode module: ${name}`);
			},
		};

		(globalThis as any).window = { acode: acodeMock };
		(globalThis as any).acode = acodeMock;
		(globalThis as any).document = {
			createElement: (tag: string) => {
				expect(tag).toBe("style");
				return style;
			},
			head: {
				appendChild: (element: any) => appendedStyles.push(element),
			},
		};

		await importMain("with-acode");

		expect(typeof initHandler).toBe("function");
		expect(typeof unmountHandler).toBe("function");
		await initHandler(
			"/plugins/lightvm",
			{},
			{ cacheFile: {}, cacheFileUrl: "" },
		);
		expect(languageRegistration.slice(0, 3)).toEqual([
			"lightvm",
			["lvm", "lvmb", "lightvm", "lightvmb"],
			"LightVM",
		]);
		expect(commandRegistration.name).toBe("lightvm.showInstructionPointers");
		const extensions = await languageRegistration[3]();
		expect(Array.isArray(extensions)).toBe(true);
		expect(extensions.length).toBe(8);
		expect(appendedStyles).toEqual([style]);

		unmountHandler();
		expect(removedCommands).toEqual(["lightvm.showInstructionPointers"]);
		expect(unregisteredLanguages).toEqual(["lightvm"]);
		expect(style.removed).toBe(true);
	});

	test("does not register plugin handlers without window.acode", async () => {
		let registrations = 0;
		const acodeMock = {
			setPluginInit: () => registrations++,
			setPluginUnmount: () => registrations++,
		};
		delete (globalThis as any).window;
		(globalThis as any).acode = acodeMock;

		await importMain("without-window");

		expect(registrations).toBe(0);
	});
});
