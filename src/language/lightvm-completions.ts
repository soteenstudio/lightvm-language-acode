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
interface CompletionApis {
	completeFromList: (completions: any[]) => (context: any) => any;
	snippetCompletion: (template: string, completion: any) => any;
}

export function createLightVMCompletions(
	{ completeFromList, snippetCompletion }: CompletionApis,
	syntaxTree: (state: any) => any,
) {
	const opcodes = [
		"val",
		"set",
		"push",
		"get",
		"dup",
		"swap",
		"shrink",
		"truncate",
		"add",
		"sub",
		"mul",
		"div",
		"mod",
		"neg",
		"inc",
		"dec",
		"gt",
		"lt",
		"ge",
		"le",
		"eq",
		"neq",
		"shl",
		"shr",
		"rol",
		"ror",
		"and",
		"or",
		"xor",
		"not",
		"pow",
		"powi",
		"powf",
		"sin",
		"cos",
		"tan",
		"sinh",
		"cosh",
		"tanh",
		"asin",
		"acos",
		"atan",
		"atan2",
		"asinh",
		"acosh",
		"atanh",
		"sqrt",
		"cbrt",
		"ln",
		"log2",
		"log10",
		"exp",
		"print",
		"println",
		"stdin",
		"stdout",
		"stdoutln",
		"clear_screen",
		"break",
		"nop",
		"jump",
		"if_false",
		"func",
		"call",
		"return",
		"stop",
		"make_obj",
		"make_array",
		"access",
		"access_index",
		"length",
		"typeof",
		"concat",
		"import",
		"export",
		"set_prop",
		"instantiate",
		"inspect_obj",
		"inspect_array",
		"to_short",
		"to_integer",
		"to_long",
		"to_octa",
		"to_half",
		"to_float",
		"to_double",
		"to_string",
	];
	const canonicalTypes = [
		"sht",
		"int",
		"lng",
		"oct",
		"hlf",
		"flt",
		"dbl",
		"str",
	];
	const typeAliases = ["i16", "i32", "i64", "i128", "f16", "f32", "f64"];
	const snippetCompletions = [
		snippetCompletion("val ${1:name};", { label: "val", type: "snippet" }),
		snippetCompletion("push ${1:value};\nset ${2:name};", {
			label: "set",
			type: "snippet",
		}),
		snippetCompletion("push ${1:value};", { label: "push", type: "snippet" }),
		snippetCompletion("get ${1:name};", { label: "get", type: "snippet" }),
		snippetCompletion("push ${1:value};\ndup;", {
			label: "dup",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nswap;", {
			label: "swap",
			type: "snippet",
		}),
		snippetCompletion("push ${1:target};\npush ${2:length};\nshrink;", {
			label: "shrink",
			type: "snippet",
		}),
		snippetCompletion("push ${1:target_size};\ntruncate;", {
			label: "truncate",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nadd ${3:int};", {
			label: "add",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nsub ${3:int};", {
			label: "sub",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nmul ${3:int};", {
			label: "mul",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\ndiv ${3:int};", {
			label: "div",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nmod ${3:int};", {
			label: "mod",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nneg ${2:int};", {
			label: "neg",
			type: "snippet",
		}),
		snippetCompletion("inc ${1:name} ${2:int};", {
			label: "inc",
			type: "snippet",
		}),
		snippetCompletion("dec ${1:name} ${2:int};", {
			label: "dec",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\ngt ${3:int};", {
			label: "gt",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nlt ${3:int};", {
			label: "lt",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nge ${3:int};", {
			label: "ge",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nle ${3:int};", {
			label: "le",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\neq ${3:int};", {
			label: "eq",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nneq ${3:int};", {
			label: "neq",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nshl ${3:int};", {
			label: "shl",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nshr ${3:int};", {
			label: "shr",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nrol ${3:int};", {
			label: "rol",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nror ${3:int};", {
			label: "ror",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nand;", {
			label: "and",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nor;", {
			label: "or",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nxor;", {
			label: "xor",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nnot;", {
			label: "not",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\npow ${3:int};", {
			label: "pow",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\npowi ${3:int};", {
			label: "powi",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\npowf ${3:int};", {
			label: "powf",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nsin ${3:int};", {
			label: "sin",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\ncos ${3:int};", {
			label: "cos",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\ntan ${3:int};", {
			label: "tan",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nsinh ${2:int};", {
			label: "sinh",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\ncosh ${2:int};", {
			label: "cosh",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\ntanh ${2:int};", {
			label: "tanh",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nasin ${2:int};", {
			label: "asin",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nacos ${2:int};", {
			label: "acos",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\natan ${2:int};", {
			label: "atan",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\natan2 ${3:int};", {
			label: "atan2",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nasinh ${2:int};", {
			label: "asinh",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nacosh ${2:int};", {
			label: "acosh",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\natanh ${2:int};", {
			label: "atanh",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nsqrt ${2:int};", {
			label: "sqrt",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\ncbrt ${2:int};", {
			label: "cbrt",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nln ${2:int};", {
			label: "ln",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nlog2 ${2:int};", {
			label: "log2",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nlog10 ${2:int};", {
			label: "log10",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nexp ${2:int};", {
			label: "exp",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nprint;", {
			label: "print",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nprintln;", {
			label: "println",
			type: "snippet",
		}),
		snippetCompletion("stdin;", { label: "stdin", type: "snippet" }),
		snippetCompletion("push ${1:val};\nstdout;", {
			label: "stdout",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nstdoutln;", {
			label: "stdoutln",
			type: "snippet",
		}),
		snippetCompletion("clear_screen;", {
			label: "clear_screen",
			type: "snippet",
		}),
		snippetCompletion("push ${1:target_ip};\nbreak;", {
			label: "break",
			type: "snippet",
		}),
		snippetCompletion("nop;", { label: "nop", type: "snippet" }),
		snippetCompletion("jump ${1:target_ip};", {
			label: "jump",
			type: "snippet",
		}),
		snippetCompletion("push ${1:cond};\nif_false ${2:target_ip};", {
			label: "if_false",
			type: "snippet",
		}),
		snippetCompletion(
			"func ${1:name} ${2:argc} ${3:start} ${4:end} ${5:params};",
			{ label: "func", type: "snippet" },
		),
		snippetCompletion("call ${1:name} ${2:argc};", {
			label: "call",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nreturn;", {
			label: "return",
			type: "snippet",
		}),
		snippetCompletion("stop;", { label: "stop", type: "snippet" }),
		snippetCompletion(
			"push ${1:key};\npush ${2:value};\nmake_obj ${3:count};",
			{ label: "make_obj", type: "snippet" },
		),
		snippetCompletion("push ${1:value};\nmake_array ${2:count};", {
			label: "make_array",
			type: "snippet",
		}),
		snippetCompletion("push ${1:target_obj};\naccess ${2:prop_name};", {
			label: "access",
			type: "snippet",
		}),
		snippetCompletion(
			"push ${1:target_arr};\npush ${2:index};\naccess_index;",
			{ label: "access_index", type: "snippet" },
		),
		snippetCompletion("push ${1:val};\nlength;", {
			label: "length",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\ntypeof;", {
			label: "typeof",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val1};\npush ${2:val2};\nconcat;", {
			label: "concat",
			type: "snippet",
		}),
		snippetCompletion(
			"push ${1:target};\npush ${2:length};\nimport ${3:module_name} ${4:alias_idx};",
			{ label: "import", type: "snippet" },
		),
		snippetCompletion("export ${1:name};", {
			label: "export",
			type: "snippet",
		}),
		snippetCompletion(
			"push ${1:val};\npush ${2:obj};\nset_prop ${3:prop_name};",
			{ label: "set_prop", type: "snippet" },
		),
		snippetCompletion(
			"push ${1:arg};\ninstantiate ${2:class_name} ${3:argc};",
			{ label: "instantiate", type: "snippet" },
		),
		snippetCompletion("push ${1:obj};\ninspect_obj;", {
			label: "inspect_obj",
			type: "snippet",
		}),
		snippetCompletion("push ${1:arr};\ninspect_array;", {
			label: "inspect_array",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nto_short;", {
			label: "to_short",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nto_integer;", {
			label: "to_integer",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nto_long;", {
			label: "to_long",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nto_octa;", {
			label: "to_octa",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nto_half;", {
			label: "to_half",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nto_float;", {
			label: "to_float",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nto_double;", {
			label: "to_double",
			type: "snippet",
		}),
		snippetCompletion("push ${1:val};\nto_string;", {
			label: "to_string",
			type: "snippet",
		}),
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
	return lightVMCompletions;
}
