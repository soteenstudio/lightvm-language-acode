interface InstructionPointerApis {
	Decoration: any;
	EditorView: any;
	ViewPlugin: any;
	WidgetType: any;
	syntaxTree: (state: any) => any;
}

export function createInstructionPointerExtensions({
	Decoration,
	EditorView,
	ViewPlugin,
	WidgetType,
	syntaxTree,
}: InstructionPointerApis) {
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
	const toggleInstructionPointers = (view: any) => {
		const plugin = instructionPointerPlugins.get(view);
		if (!plugin) return false;

		plugin.toggle();
		return true;
	};

	return {
		extensions: [instructionPointers, instructionPointerTheme],
		toggleInstructionPointers,
	};
}

