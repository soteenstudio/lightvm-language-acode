import plugin from "../plugin.json";
import { parser } from "./lightvm-parser";

class AcodePlugin {
	baseUrl = "";
	private editorLanguages?: Acode.EditorLanguages;
	private lsp?: Acode.LspApi;

	private registerLanguageServer(): void {
		const serverId = "lightvm-lsp";
		const runtimeId = "lightvm-worker";
		const lsp = acode.require("lsp");

		lsp.runtimes.unregister(runtimeId);
		lsp.runtimes.register({
			id: runtimeId,
			label: "LightVM Language Server",
			priority: 200,
			canHandle: (server: Acode.LspServerDefinition) => server.id === serverId,
			start: async () => {
				const handle = lsp.workers.createTransport({
					url: `${this.baseUrl}lightvm-language.worker.js`,
					name: "LightVM Language Server",
					serverId,
					startupTimeout: 10_000,
				});

				return {
					kind: "transport",
					providerId: runtimeId,
					transport: handle,
					dispose: () => handle.dispose(),
				};
			},
		});

		lsp.upsert(
			lsp.defineServer({
				id: serverId,
				label: "LightVM",
				languages: ["lvm"],
				runtimes: [runtimeId],
				transport: { kind: "external" },
				useWorkspaceFolders: true,
				enabled: true,
				startupTimeout: 10_000,
			}),
		);
		this.lsp = lsp;
	}

	async init(
		_page: Acode.WCPage,
		_cacheFile: Acode.FileSystem,
		_cacheFileUrl: string,
	): Promise<void> {
		this.registerLanguageServer();
		this.editorLanguages = acode.require("editorLanguages");
		this.editorLanguages.register("lightvm", "lvm", "LightVM", async () => {
			const { LRLanguage, syntaxTree } = acode.require("@codemirror/language");
			const { completeFromList } = acode.require("@codemirror/autocomplete");
			const { Decoration, EditorView, ViewPlugin } = acode.require(
				"@codemirror/view",
			);
			const { styleTags, tags } = acode.require("@lezer/highlight");
			const keywords = ["val", "set"];
			const opcodes = [
				"push", "get", "dup", "swap", "shrink", "truncate",
				"add", "sub", "mul", "div", "mod", "neg", "inc", "dec",
				"gt", "lt", "ge", "le", "eq", "neq", "shl", "shr",
				"rol", "ror", "and", "or", "xor", "not", "pow", "powi",
				"powf", "sin", "cos", "tan", "sinh", "cosh", "tanh",
				"asin", "acos", "atan", "atan2", "asinh", "acosh", "atanh",
				"sqrt", "cbrt", "ln", "log2", "log10", "exp",
				"print", "println", "stdin", "stdout", "stdoutln",
				"clear_screen", "break", "nop",
				"jump", "if_false", "func", "call", "return", "stop",
				"make_obj", "make_array", "access", "access_index", "length",
				"typeof", "concat", "import", "export",
				"set_prop", "instantiate", "inspect_obj", "inspect_array",
				"to_short", "to_integer", "to_long", "to_octa", "to_half",
				"to_float", "to_double", "to_string",
			];
			const canonicalTypes = [
				"sht", "int", "lng", "oct", "hlf", "flt", "dbl", "str",
			];
			const typeAliases = [
				"i16", "i32", "i64", "i128", "f16", "f32", "f64",
			];
			const completionList = [
				...keywords.map((label: string) => ({
					label,
					type: "keyword",
					detail: "LightVM declaration keyword",
				})),
				...opcodes.map((label: string) => ({
					label,
					type: "keyword",
					detail: "LightVM opcode",
				})),
				...canonicalTypes.map((label: string) => ({
					label,
					type: "type",
					detail: "LightVM primitive type",
				})),
				...typeAliases.map((label: string) => ({
					label,
					type: "type",
					detail: "LightVM primitive type alias",
				})),
			];
			const completeLightVM = completeFromList(completionList);
			const lightVMCompletions = (context: any) => {
				const nodeName = syntaxTree(context.state).resolveInner(
					context.pos,
					-1,
				).name;
				if (nodeName === "Comment" || nodeName === "String") return null;

				const prefix = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*$/);
				if (!prefix && !context.explicit) return null;

				return completeLightVM(context);
			};

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
							Comment: tags.lineComment,
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

			return [
				language,
				language.data.of({ autocomplete: lightVMCompletions }),
				rainbowBrackets,
				rainbowBracketTheme,
			];
		});
	}

	async destroy(): Promise<void> {
		this.lsp?.servers.unregister("lightvm-lsp");
		this.lsp?.runtimes.unregister("lightvm-worker");
		this.lsp = undefined;
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
