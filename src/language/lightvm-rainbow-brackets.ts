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
interface RainbowBracketApis {
	Decoration: any;
	EditorView: any;
	ViewPlugin: any;
	syntaxTree: (state: any) => any;
}

export function createRainbowBracketExtensions(
	{ Decoration, EditorView, ViewPlugin, syntaxTree }: RainbowBracketApis,
	closingDelimiter: Record<string, string>,
	closingDelimiters: Set<string>,
) {
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
	return [rainbowBrackets, rainbowBracketTheme];
}
