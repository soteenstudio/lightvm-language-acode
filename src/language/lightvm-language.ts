import { parser } from "./lightvm-parser";
import { createLightVMCompletions } from "./lightvm-completions";
import {
	closingDelimiter,
	closingDelimiters,
	createDelimiterExtensions,
} from "./lightvm-delimiters";
import { createRainbowBracketExtensions } from "./lightvm-rainbow-brackets";
import { createInstructionPointerExtensions } from "./lightvm-instruction-pointers";

export interface LightVMLanguage {
	extensions: any[];
	toggleInstructionPointers: (view: any) => boolean;
}

export function createLightVMLanguage(): LightVMLanguage {
	const { foldService, indentService, LRLanguage, syntaxTree } =
		acode.require("@codemirror/language");
	const { completeFromList, snippetCompletion } = acode.require(
		"@codemirror/autocomplete",
	);
	const { Decoration, EditorView, ViewPlugin, WidgetType } = acode.require(
		"@codemirror/view",
	);
	const { styleTags, tags } = acode.require("@lezer/highlight");

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
	const completions = createLightVMCompletions(
		{ completeFromList, snippetCompletion },
		syntaxTree,
	);
	const delimiterExtensions = createDelimiterExtensions({
		foldService,
		indentService,
		syntaxTree,
	});
	const rainbowBracketExtensions = createRainbowBracketExtensions(
		{ Decoration, EditorView, ViewPlugin, syntaxTree },
		closingDelimiter,
		closingDelimiters,
	);
	const instructionPointers = createInstructionPointerExtensions({
		Decoration,
		EditorView,
		ViewPlugin,
		WidgetType,
		syntaxTree,
	});

	return {
		extensions: [
			language,
			language.data.of({ autocomplete: completions }),
			...delimiterExtensions,
			...rainbowBracketExtensions,
			...instructionPointers.extensions,
		],
		toggleInstructionPointers: instructionPointers.toggleInstructionPointers,
	};
}
