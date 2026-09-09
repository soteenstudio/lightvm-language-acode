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
			const { LRLanguage } = acode.require("@codemirror/language");
			const { styleTags, tags } = acode.require("@lezer/highlight");

			return LRLanguage.define({
				parser: parser.configure({
					props: [
						styleTags({
							Opcode: tags.keyword,
							ValKeyword: tags.keyword,
							SetKeyword: tags.keyword,
							PrimitiveType: tags.typeName,
							Number: tags.number,
							String: tags.string,
							"OpenSquareBracket CloseSquareBracket OpenBrace CloseBrace OpenParenthesis CloseParenthesis":
								tags.punctuation,
						}),
					],
				}),
			});
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
