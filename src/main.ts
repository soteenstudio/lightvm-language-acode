import plugin from "../plugin.json";
import { parser } from "./lightvm-parser";

class AcodePlugin {
	baseUrl = "";
	private editorLanguages?: Acode.EditorLanguages;

	async init(
		_page: Acode.WCPage,
		_cacheFile: Acode.FileSystem,
		_cacheFileUrl: string,
	): Promise<void> {
		this.editorLanguages = acode.require("editorLanguages");
		this.editorLanguages.register("lightvm", "lvm", "LightVM", async () => {
			const { LRLanguage, syntaxTree } = acode.require("@codemirror/language");
			const { Decoration, EditorView, ViewPlugin } = acode.require(
				"@codemirror/view",
			);
			const { styleTags, tags } = acode.require("@lezer/highlight");

			const language = LRLanguage.define({
				parser: parser.configure({
					props: [
						styleTags({
							Opcode: tags.keyword,
							ValKeyword: tags.keyword,
							SetKeyword: tags.keyword,
							PrimitiveType: tags.typeName,
							Number: tags.number,
							String: tags.string,
							"OpenSquareBracket CloseSquareBracket": tags.squareBracket,
							"OpenParenthesis CloseParenthesis": tags.paren,
							"OpenBrace CloseBrace": tags.brace,
						}),
					],
				}),
			});

			const closingDelimiter: Record<string, string> = {
				OpenSquareBracket: "CloseSquareBracket",
				OpenParenthesis: "CloseParenthesis",
				OpenBrace: "CloseBrace",
			};
			const closingDelimiters = new Set(Object.values(closingDelimiter));
			const palette = ["red", "orange", "yellow", "green", "blue", "purple"];

			const buildDecorations = (view: any) => {
				const stack: Array<{
					close: string;
					depth: number;
					from: number;
					to: number;
				}> = [];
				const ranges: any[] = [];
				const cursor = syntaxTree(view.state).cursor();

				do {
					const expectedClose = closingDelimiter[cursor.name];
					if (expectedClose) {
						stack.push({
							close: expectedClose,
							depth: stack.length,
							from: cursor.from,
							to: cursor.to,
						});
					} else if (closingDelimiters.has(cursor.name)) {
						const opener = stack[stack.length - 1];
						if (opener?.close === cursor.name) {
							stack.pop();
							const className = `cm-lightvm-bracket-${palette[opener.depth % palette.length]}`;
							const decoration = Decoration.mark({ class: className });
							ranges.push(
								decoration.range(opener.from, opener.to),
								decoration.range(cursor.from, cursor.to),
							);
						}
					}
				} while (cursor.next());

				ranges.sort((left, right) => left.from - right.from);
				return Decoration.set(ranges, true);
			};

			const rainbowBrackets = ViewPlugin.fromClass(
				class {
					decorations: any;

					constructor(view: any) {
						this.decorations = buildDecorations(view);
					}

					update(update: any) {
						if (
							update.docChanged ||
							update.viewportChanged ||
							syntaxTree(update.startState) !== syntaxTree(update.state)
						) {
							this.decorations = buildDecorations(update.view);
						}
					}
				},
				{ decorations: (value: any) => value.decorations },
			);
			const rainbowBracketTheme = EditorView.baseTheme({
				".cm-lightvm-bracket-red": { color: "#e06c75" },
				".cm-lightvm-bracket-orange": { color: "#d19a66" },
				".cm-lightvm-bracket-yellow": { color: "#e5c07b" },
				".cm-lightvm-bracket-green": { color: "#98c379" },
				".cm-lightvm-bracket-blue": { color: "#61afef" },
				".cm-lightvm-bracket-purple": { color: "#c678dd" },
			});

			return [language, rainbowBrackets, rainbowBracketTheme];
		});
	}

	async destroy(): Promise<void> {
		this.editorLanguages?.unregister("lightvm");
		this.editorLanguages = undefined;
	}
}

if (window.acode) {
	const acodePlugin = new AcodePlugin();

	acode.setPluginInit(
		plugin.id,
		async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
			acodePlugin.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
			await acodePlugin.init($page, cacheFile, cacheFileUrl);
		},
	);

	acode.setPluginUnmount(plugin.id, () => {
		void acodePlugin.destroy();
	});
}
