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
				snippetCompletion("val ${1:name};", { label: "val", type: "snippet" }),
				snippetCompletion("push ${1:value};\nset ${2:name};", { label: "set", type: "snippet" }),
				snippetCompletion("push ${1:value};", { label: "push", type: "snippet" }),
				snippetCompletion("get ${1:name};", { label: "get", type: "snippet" }),
				snippetCompletion("push ${1:value};\ndup;", { label: "dup", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nswap;", { label: "swap", type: "snippet" }),
				snippetCompletion("push ${1:target};\npush ${2:length};\nshrink;", { label: "shrink", type: "snippet" }),
				snippetCompletion("push ${1:target_size};\ntruncate;", { label: "truncate", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nadd ${3:int};", { label: "add", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nsub ${3:int};", { label: "sub", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nmul ${3:int};", { label: "mul", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\ndiv ${3:int};", { label: "div", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nmod ${3:int};", { label: "mod", type: "snippet" }),
				snippetCompletion("push ${1:val};\nneg ${2:int};", { label: "neg", type: "snippet" }),
				snippetCompletion("inc ${1:name} ${2:int};", { label: "inc", type: "snippet" }),
				snippetCompletion("dec ${1:name} ${2:int};", { label: "dec", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\ngt ${3:int};", { label: "gt", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nlt ${3:int};", { label: "lt", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nge ${3:int};", { label: "ge", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nle ${3:int};", { label: "le", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\neq ${3:int};", { label: "eq", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nneq ${3:int};", { label: "neq", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nshl ${3:int};", { label: "shl", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nshr ${3:int};", { label: "shr", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nrol ${3:int};", { label: "rol", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nror ${3:int};", { label: "ror", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nand;", { label: "and", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nor;", { label: "or", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nxor;", { label: "xor", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nnot;", { label: "not", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\npow ${3:int};", { label: "pow", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\npowi ${3:int};", { label: "powi", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\npowf ${3:int};", { label: "powf", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nsin ${3:int};", { label: "sin", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\ncos ${3:int};", { label: "cos", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\ntan ${3:int};", { label: "tan", type: "snippet" }),
				snippetCompletion("push ${1:val};\nsinh ${2:int};", { label: "sinh", type: "snippet" }),
				snippetCompletion("push ${1:val};\ncosh ${2:int};", { label: "cosh", type: "snippet" }),
				snippetCompletion("push ${1:val};\ntanh ${2:int};", { label: "tanh", type: "snippet" }),
				snippetCompletion("push ${1:val};\nasin ${2:int};", { label: "asin", type: "snippet" }),
				snippetCompletion("push ${1:val};\nacos ${2:int};", { label: "acos", type: "snippet" }),
				snippetCompletion("push ${1:val};\natan ${2:int};", { label: "atan", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\natan2 ${3:int};", { label: "atan2", type: "snippet" }),
				snippetCompletion("push ${1:val};\nasinh ${2:int};", { label: "asinh", type: "snippet" }),
				snippetCompletion("push ${1:val};\nacosh ${2:int};", { label: "acosh", type: "snippet" }),
				snippetCompletion("push ${1:val};\natanh ${2:int};", { label: "atanh", type: "snippet" }),
				snippetCompletion("push ${1:val};\nsqrt ${2:int};", { label: "sqrt", type: "snippet" }),
				snippetCompletion("push ${1:val};\ncbrt ${2:int};", { label: "cbrt", type: "snippet" }),
				snippetCompletion("push ${1:val};\nln ${2:int};", { label: "ln", type: "snippet" }),
				snippetCompletion("push ${1:val};\nlog2 ${2:int};", { label: "log2", type: "snippet" }),
				snippetCompletion("push ${1:val};\nlog10 ${2:int};", { label: "log10", type: "snippet" }),
				snippetCompletion("push ${1:val};\nexp ${2:int};", { label: "exp", type: "snippet" }),
				snippetCompletion("push ${1:val};\nprint;", { label: "print", type: "snippet" }),
				snippetCompletion("push ${1:val};\nprintln;", { label: "println", type: "snippet" }),
				snippetCompletion("stdin;", { label: "stdin", type: "snippet" }),
				snippetCompletion("push ${1:val};\nstdout;", { label: "stdout", type: "snippet" }),
				snippetCompletion("push ${1:val};\nstdoutln;", { label: "stdoutln", type: "snippet" }),
				snippetCompletion("clear_screen;", { label: "clear_screen", type: "snippet" }),
				snippetCompletion("push ${1:target_ip};\nbreak;", { label: "break", type: "snippet" }),
				snippetCompletion("nop;", { label: "nop", type: "snippet" }),
				snippetCompletion("jump ${1:target_ip};", { label: "jump", type: "snippet" }),
				snippetCompletion("push ${1:cond};\nif_false ${2:target_ip};", { label: "if_false", type: "snippet" }),
				snippetCompletion("func ${1:name} ${2:argc} ${3:start} ${4:end} ${5:params};", { label: "func", type: "snippet" }),
				snippetCompletion("call ${1:name} ${2:argc};", { label: "call", type: "snippet" }),
				snippetCompletion("push ${1:val};\nreturn;", { label: "return", type: "snippet" }),
				snippetCompletion("stop;", { label: "stop", type: "snippet" }),
				snippetCompletion("push ${1:key};\npush ${2:value};\nmake_obj ${3:count};", { label: "make_obj", type: "snippet" }),
				snippetCompletion("push ${1:value};\nmake_array ${2:count};", { label: "make_array", type: "snippet" }),
				snippetCompletion("push ${1:target_obj};\naccess ${2:prop_name};", { label: "access", type: "snippet" }),
				snippetCompletion("push ${1:target_arr};\npush ${2:index};\naccess_index;", { label: "access_index", type: "snippet" }),
				snippetCompletion("push ${1:val};\nlength;", { label: "length", type: "snippet" }),
				snippetCompletion("push ${1:val};\ntypeof;", { label: "typeof", type: "snippet" }),
				snippetCompletion("push ${1:val1};\npush ${2:val2};\nconcat;", { label: "concat", type: "snippet" }),
				snippetCompletion("push ${1:target};\npush ${2:length};\nimport ${3:module_name} ${4:alias_idx};", { label: "import", type: "snippet" }),
				snippetCompletion("export ${1:name};", { label: "export", type: "snippet" }),
				snippetCompletion("push ${1:val};\npush ${2:obj};\nset_prop ${3:prop_name};", { label: "set_prop", type: "snippet" }),
				snippetCompletion("push ${1:arg};\ninstantiate ${2:class_name} ${3:argc};", { label: "instantiate", type: "snippet" }),
				snippetCompletion("push ${1:obj};\ninspect_obj;", { label: "inspect_obj", type: "snippet" }),
				snippetCompletion("push ${1:arr};\ninspect_array;", { label: "inspect_array", type: "snippet" }),
				snippetCompletion("push ${1:val};\nto_short;", { label: "to_short", type: "snippet" }),
				snippetCompletion("push ${1:val};\nto_integer;", { label: "to_integer", type: "snippet" }),
				snippetCompletion("push ${1:val};\nto_long;", { label: "to_long", type: "snippet" }),
				snippetCompletion("push ${1:val};\nto_octa;", { label: "to_octa", type: "snippet" }),
				snippetCompletion("push ${1:val};\nto_half;", { label: "to_half", type: "snippet" }),
				snippetCompletion("push ${1:val};\nto_float;", { label: "to_float", type: "snippet" }),
				snippetCompletion("push ${1:val};\nto_double;", { label: "to_double", type: "snippet" }),
				snippetCompletion("push ${1:val};\nto_string;", { label: "to_string", type: "snippet" }),
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
