import plugin from "../plugin.json";
import { createLightVMLanguage } from "./language/lightvm-language";

const languageId = "lightvm";
const commandId = "lightvm.showInstructionPointers";

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
			name: commandId,
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
		this.editorLanguages.register(
			languageId,
			["lvm", "lvmb", "lightvm", "lightvmb"],
			"LightVM",
			async () => {
				const language = createLightVMLanguage();
				this.toggleInstructionPointers = language.toggleInstructionPointers;
				return language.extensions;
			},
		);
	}

	async destroy(): Promise<void> {
		this.fileIconStyle?.remove();
		this.fileIconStyle = undefined;
		this.commands?.removeCommand(commandId);
		this.commands = undefined;
		this.toggleInstructionPointers = undefined;
		this.editorLanguages?.unregister(languageId);
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
