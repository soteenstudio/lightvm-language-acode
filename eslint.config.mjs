import header from "@tony.ganchev/eslint-plugin-header";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

const apacheLicenseHeader = [
	'\n * Licensed under the Apache License, Version 2.0 (the "License");',
	" * you may not use this file except in compliance with the License.",
	" * You may obtain a copy of the License at",
	" *",
	" *     http://www.apache.org/licenses/LICENSE-2.0",
	" *",
	" * Unless required by applicable law or agreed to in writing, software",
	' * distributed under the License is distributed on an "AS IS" BASIS,',
	" * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.",
	" * See the License for the specific language governing permissions and",
	" * limitations under the License.",
	" ",
];

export default [
	{
		ignores: [
			"dist/**",
			"src/language/lightvm-parser.ts",
			"src/language/lightvm-parser.terms.ts",
		],
	},
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
		plugins: {
			"@tony.ganchev": header,
			"@typescript-eslint": typescriptEslint,
		},
		rules: {
			...typescriptEslint.configs.recommended.rules,
			...prettier.rules,
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_" },
			],
			"@tony.ganchev/header": [
				"error",
				{
					header: {
						commentType: "block",
						lines: apacheLicenseHeader,
					},
				},
			],
		},
	},
];
