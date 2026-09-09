/// <reference lib="webworker" />

const worker = self as unknown as DedicatedWorkerGlobalScope;

const keywords = new Map<string, string>([
	["val", "declaration keyword"],
	["set", "assignment keyword"],
]);
const opcodes = new Set([
	"push", "get", "dup", "swap", "shrink", "truncate", "add", "sub", "mul", "div", "mod", "neg", "inc", "dec",
	"gt", "lt", "ge", "le", "eq", "neq", "shl", "shr", "rol", "ror", "and", "or", "xor", "not", "pow", "powi", "powf",
	"sin", "cos", "tan", "sinh", "cosh", "tanh", "asin", "acos", "atan", "atan2", "asinh", "acosh", "atanh", "sqrt", "cbrt",
	"ln", "log2", "log10", "exp", "print", "println", "stdin", "stdout", "stdoutln", "clear_screen", "break", "nop", "jump",
	"if_false", "func", "call", "return", "stop", "make_obj", "make_array", "access", "access_index", "length", "typeof", "concat",
	"import", "export", "set_prop", "instantiate", "inspect_obj", "inspect_array", "to_short", "to_integer", "to_long", "to_octa",
	"to_half", "to_float", "to_double", "to_string",
]);
const primitiveTypes = new Set([
	"sht", "int", "lng", "oct", "hlf", "flt", "dbl", "str", "i16", "i32", "i64", "i128", "f16", "f32", "f64",
]);
const documents = new Map<string, string>();

type LspRequest = { jsonrpc: "2.0"; id?: number | string; method: string; params?: any };

function send(message: object): void {
	worker.postMessage(JSON.stringify(message));
}

function reply(request: LspRequest, result: unknown): void {
	if (request.id !== undefined) send({ jsonrpc: "2.0", id: request.id, result });
}

function wordAt(text: string, position: { line: number; character: number }): string {
	const line = text.split(/\r?\n/)[position.line] ?? "";
	const before = line.slice(0, position.character).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? "";
	const after = line.slice(position.character).match(/^[A-Za-z0-9_]*/)?.[0] ?? "";
	return before + after;
}

function positionAt(text: string, offset: number): { line: number; character: number } {
	const before = text.slice(0, offset).split(/\r?\n/);
	return { line: before.length - 1, character: before[before.length - 1]?.length ?? 0 };
}

function publishDiagnostics(uri: string, text: string): void {
	const diagnostics: object[] = [];
	const stack: Array<{ delimiter: string; offset: number }> = [];
	const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
	let quote = "";
	let escaped = false;
	let comment = false;

	for (let offset = 0; offset < text.length; offset++) {
		const character = text[offset];
		if (comment) {
			if (character === "\n") comment = false;
			continue;
		}
		if (quote) {
			if (escaped) escaped = false;
			else if (character === "\\") escaped = true;
			else if (character === quote) quote = "";
			continue;
		}
		if (character === ";" && text[offset + 1] === ";") {
			comment = true;
			offset++;
		} else if (character === '"' || character === "'") quote = character;
		else if ("([{ ".includes(character) && character !== " ") stack.push({ delimiter: character, offset });
		else if (pairs[character]) {
			const opener = stack.pop();
			if (!opener || opener.delimiter !== pairs[character]) {
				const start = positionAt(text, offset);
				diagnostics.push({ range: { start, end: { ...start, character: start.character + 1 } }, severity: 1, source: "lightvm", message: `Unmatched '${character}'` });
			}
		}
	}
	for (const opener of stack) {
		const start = positionAt(text, opener.offset);
		diagnostics.push({ range: { start, end: { ...start, character: start.character + 1 } }, severity: 1, source: "lightvm", message: `Unmatched '${opener.delimiter}'` });
	}
	send({ jsonrpc: "2.0", method: "textDocument/publishDiagnostics", params: { uri, diagnostics } });
}

const completionItems = [
	...[...keywords.keys()].map((label) => ({ label, kind: 14, detail: `LightVM ${keywords.get(label)}` })),
	...[...opcodes].map((label) => ({ label, kind: 3, detail: "LightVM opcode" })),
	...[...primitiveTypes].map((label) => ({ label, kind: 7, detail: "LightVM primitive type" })),
];

worker.onmessage = (event: MessageEvent<string>) => {
	if (typeof event.data !== "string") return;
	const request = JSON.parse(event.data) as LspRequest;
	const params = request.params ?? {};

	switch (request.method) {
		case "initialize":
			reply(request, { capabilities: { textDocumentSync: 1, completionProvider: {}, hoverProvider: true, documentSymbolProvider: true } });
			break;
		case "shutdown":
			reply(request, null);
			break;
		case "exit":
			worker.close();
			break;
		case "textDocument/didOpen": {
			const { uri, text } = params.textDocument;
			documents.set(uri, text);
			publishDiagnostics(uri, text);
			break;
		}
		case "textDocument/didChange": {
			const uri = params.textDocument.uri;
			const text = params.contentChanges[params.contentChanges.length - 1]?.text ?? documents.get(uri) ?? "";
			documents.set(uri, text);
			publishDiagnostics(uri, text);
			break;
		}
		case "textDocument/didClose":
			documents.delete(params.textDocument.uri);
			send({ jsonrpc: "2.0", method: "textDocument/publishDiagnostics", params: { uri: params.textDocument.uri, diagnostics: [] } });
			break;
		case "textDocument/completion":
			reply(request, completionItems);
			break;
		case "textDocument/hover": {
			const text = documents.get(params.textDocument.uri) ?? "";
			const word = wordAt(text, params.position);
			const description = keywords.get(word) ?? (opcodes.has(word) ? "opcode" : primitiveTypes.has(word) ? "primitive type" : "");
			reply(request, description ? { contents: { kind: "markdown", value: `**${word}** — LightVM ${description}` } } : null);
			break;
		}
		case "textDocument/documentSymbol": {
			const text = documents.get(params.textDocument.uri) ?? "";
			const symbols = [...text.matchAll(/^\s*(?:val|func)\s+([A-Za-z_][A-Za-z0-9_]*)/gm)].map((match) => {
				const start = positionAt(text, match.index + match[0].lastIndexOf(match[1]));
				const range = { start, end: { ...start, character: start.character + match[1].length } };
				return { name: match[1], kind: match[0].trimStart().startsWith("func") ? 12 : 13, range, selectionRange: range };
			});
			reply(request, symbols);
			break;
		}
		default:
			reply(request, null);
	}
};

worker.postMessage({ kind: "ready" });
