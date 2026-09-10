/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export const closingDelimiter: Record<string, string> = {
	OpenSquareBracket: "CloseSquareBracket",
	OpenParenthesis: "CloseParenthesis",
	OpenBrace: "CloseBrace",
};

export const closingDelimiters = new Set(Object.values(closingDelimiter));

interface DelimiterApis {
	foldService: { of: (provider: any) => any };
	indentService: { of: (provider: any) => any };
	syntaxTree: (state: any) => any;
}

export function createDelimiterExtensions({
	foldService,
	indentService,
	syntaxTree,
}: DelimiterApis) {
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
			? (/^\s*/.exec(previousLine.text)?.[0].length ?? 0)
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
					stack.push({
						close: expectedClose,
						from: cursor.from,
						to: cursor.to,
					});
				} else if (closingDelimiters.has(cursor.name)) {
					const opener = stack[stack.length - 1];
					if (opener?.close !== cursor.name) continue;

					stack.pop();
					if (
						opener.from >= lineStart &&
						opener.from <= lineEnd &&
						state.doc.lineAt(opener.from).number <
							state.doc.lineAt(cursor.from).number
					) {
						return { from: opener.to, to: cursor.from };
					}
				}
			} while (cursor.next());

			return null;
		},
	);
	return [lightVMIndent, lightVMFold];
}
