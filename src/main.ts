import plugin from "../plugin.json";
import { parser } from "./language/lightvm-parser";

class AcodePlugin {
	baseUrl = "";
	private editorLanguages?: Acode.EditorLanguages;
	private commands?: Acode.Commands;
	private toggleInstructionPointers?: (view: any) => boolean;
	private fileIconStyle?: HTMLStyleElement;

	async init(
		_page: Acode.WCPage,
		_cacheFile: Acode.FileSystem,
		_cacheFileUrl: string,
	): Promise<void> {
		this.fileIconStyle = document.createElement("style");
		this.fileIconStyle.textContent = `
.file.file_type_lvm::before,
.file.file_type_lvmb::before,
.file.file_type_lightvm::before,
.file.file_type_lightvmb::before {
	content: "";
	display: inline-block;
	width: 1.2em;
	height: 1.2em;
	vertical-align: middle;
	background-image: url(${JSON.stringify(`${this.baseUrl}icon.png`)});
	background-position: center;
	background-size: contain;
	background-repeat: no-repeat;
}`;
		document.head.appendChild(this.fileIconStyle);
		this.editorLanguages = acode.require("editorLanguages");
		this.commands = acode.require("commands");
		this.commands.addCommand({
			name: "lightvm.showInstructionPointers",
			description: "Toggle LightVM instruction pointers",
			bindKey: {
				win: "Shift-I",
				linux: "Shift-I",
				mac: "Shift-I",
			},
			readOnly: true,
			requiresView: true,
			exec: (view) => this.toggleInstructionPointers?.(view) ?? false,
		});
		this.editorLanguages.register("lightvm", ["lvm", "lvmb", "lightvm", "lightvmb"], "LightVM", async () => {
			const { foldService, indentService, LRLanguage, syntaxTree } =
				acode.require("@codemirror/language");
			const { completeFromList, snippetCompletion } = acode.require(
				"@codemirror/autocomplete",
			);
			const { Decoration, EditorView, ViewPlugin, WidgetType } = acode.require(
				"@codemirror/view",
			);
			const { styleTags, tags } = acode.require("@lezer/highlight");
			const opcodes = [
				"val", "set",
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
			const snippetCompletions = [
				snippetCompletion("push ${1:0}\nval ${2:variable}\nset ${2}", {
					label: "variable",
					type: "snippet",
					detail: "Declare and assign a variable",
				}),
				snippetCompletion("get ${1:left}\nget ${2:right}\nadd ${3:int}", {
					label: "add",
					type: "snippet",
					detail: "Add two variables",
				}),
				snippetCompletion("get ${1:variable}\nprintln", {
					label: "println",
					type: "snippet",
					detail: "Print a variable with a newline",
				}),
			];
			const completionList = [
				...snippetCompletions,
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
			const delimiterStackBefore = (state: any, before: number) => {
				const stack: Array<{ close: string; from: number; to: number }> = [];
				const cursor = syntaxTree(state).cursor();

				do {
					if (cursor.from >= before) break;
					const expectedClose = closingDelimiter[cursor.name];
					if (expectedClose) {
						stack.push({ close: expectedClose, from: cursor.from, to: cursor.to });
					} else if (closingDelimiters.has(cursor.name)) {
						const opener = stack[stack.length - 1];
						if (opener?.close === cursor.name) stack.pop();
					}
				} while (cursor.next());

				return stack;
			};
			const lightVMIndent = indentService.of((context: any, pos: number) => {
				const line = context.lineAt(pos);
				let previousLine = null;
				for (let lineNumber = line.number - 1; lineNumber > 0; lineNumber--) {
					const candidate = context.state.doc.line(lineNumber);
					if (candidate.text.trim()) {
						previousLine = candidate;
						break;
					}
				}
				const previousIndent = previousLine
					? /^\s*/.exec(previousLine.text)?.[0].length ?? 0
					: 0;
				const stack = delimiterStackBefore(context.state, line.from);
				const beginsWithClose = /^\s*[\]\)}]/.test(line.text);

				if (stack.length > 0) {
					const openerLine = context.state.doc.lineAt(stack[stack.length - 1].from);
					const openerIndent = /^\s*/.exec(openerLine.text)?.[0].length ?? 0;
					return openerIndent + (beginsWithClose ? 0 : context.unit);
				}

				return Math.max(0, previousIndent - (beginsWithClose ? context.unit : 0));
			});
			const lightVMFold = foldService.of(
				(state: any, lineStart: number, lineEnd: number) => {
					const stack: Array<{ close: string; from: number; to: number }> = [];
					const cursor = syntaxTree(state).cursor();

					do {
						const expectedClose = closingDelimiter[cursor.name];
						if (expectedClose) {
							stack.push({ close: expectedClose, from: cursor.from, to: cursor.to });
						} else if (closingDelimiters.has(cursor.name)) {
							const opener = stack[stack.length - 1];
							if (opener?.close !== cursor.name) continue;

							stack.pop();
							if (
								opener.from >= lineStart &&
								opener.from <= lineEnd &&
								state.doc.lineAt(opener.from).number < state.doc.lineAt(cursor.from).number
							) {
								return { from: opener.to, to: cursor.from };
							}
						}
					} while (cursor.next());

					return null;
				},
			);

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

			class InstructionPointerWidget extends WidgetType {
				constructor(private readonly index: number) {
					super();
				}

				eq(other: InstructionPointerWidget) {
					return this.index === other.index;
				}

				toDOM() {
					const element = document.createElement("span");
					element.className = "cm-lightvm-instruction-pointer";
					element.textContent = `[IP ${this.index}]`;
					element.setAttribute("aria-label", `Instruction pointer ${this.index}`);
					return element;
				}

				ignoreEvent() {
					return true;
				}
			}

			const instructionPointerPlugins = new WeakMap<any, any>();
			const buildInstructionPointers = (view: any, enabled: boolean) => {
				if (!enabled) return Decoration.none;

				const ranges: any[] = [];
				const cursor = syntaxTree(view.state).cursor();
				let index = 0;

				do {
					if (cursor.name !== "Opcode") continue;
					ranges.push(
						Decoration.widget({
							widget: new InstructionPointerWidget(index++),
							side: 1,
						}).range(cursor.to),
					);
				} while (cursor.next());

				return Decoration.set(ranges, true);
			};
			const instructionPointers = ViewPlugin.fromClass(
				class {
					decorations: any;
					private enabled = false;

					constructor(private readonly view: any) {
						this.decorations = Decoration.none;
						instructionPointerPlugins.set(view, this);
					}

					toggle() {
						this.enabled = !this.enabled;
						this.decorations = buildInstructionPointers(this.view, this.enabled);
						this.view.dispatch({});
					}

					update(update: any) {
						if (
							this.enabled &&
							(update.docChanged ||
								update.viewportChanged ||
								syntaxTree(update.startState) !== syntaxTree(update.state))
						) {
							this.decorations = buildInstructionPointers(update.view, true);
						}
					}

					destroy() {
						instructionPointerPlugins.delete(this.view);
					}
				},
				{ decorations: (value: any) => value.decorations },
			);
			const instructionPointerTheme = EditorView.baseTheme({
				".cm-lightvm-instruction-pointer": {
					color: "#7f8c98",
					fontSize: "0.8em",
					fontStyle: "italic",
					marginLeft: "0.6em",
					userSelect: "none",
				},
			});
			this.toggleInstructionPointers = (view: any) => {
				const plugin = instructionPointerPlugins.get(view);
				if (!plugin) return false;

				plugin.toggle();
				return true;
			};

			return [
				language,
				language.data.of({ autocomplete: lightVMCompletions }),
				lightVMIndent,
				lightVMFold,
				rainbowBrackets,
				rainbowBracketTheme,
				instructionPointers,
				instructionPointerTheme,
			];
		});
	}

	async destroy(): Promise<void> {
		this.fileIconStyle?.remove();
		this.fileIconStyle = undefined;
		this.commands?.removeCommand("lightvm.showInstructionPointers");
		this.commands = undefined;
		this.toggleInstructionPointers = undefined;
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
