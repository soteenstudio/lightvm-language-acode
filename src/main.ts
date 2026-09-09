import plugin from "../plugin.json";

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
			const { StreamLanguage } = acode.require("@codemirror/language");
			const { tags } = acode.require("@lezer/highlight");

			return StreamLanguage.define({
				token(stream) {
					if (stream.match(/^\b(?:val|set)\b/)) {
						return "lightvmKeyword";
					}

					stream.next();
					return null;
				},
				tokenTable: {
					lightvmKeyword: tags.keyword,
				},
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
