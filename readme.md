# LightVM Language

[Acode](https://github.com/Acode-Foundation/acode) language support for LightVM [v0.1.0-alpha.9](https://github.com/soteenstudio/lightvm/tree/v0.1.0-alpha.9) bytecode.

## Features

- Syntax highlighting for the complete Acode LightVM opcode inventory, primitive types and aliases, numbers, strings, comments, and delimiters.
- LightVM-aware opcode, primitive-type, and snippet completions outside comments and strings. Built-in snippets cover every opcode documented for LightVM `v0.1.0-alpha.9`.
- Bracket matching, automatic closing, indentation, folding regions, and bracket pair colorization.
- Optional instruction-pointer inlay hints after each opcode.

Files ending in `.lightvm`, `lightvmb`, `.lvm` and `.lvmb` are recognized automatically.

## Commands

Run **LightVM: Toggle Instruction Pointers** (`lightvm.showInstructionPointers`) from the Command Palette to show or hide `[IP n]` hints. Instruction pointers are numbered from zero in document order.

## Language support

The extension supports canonical primitive types (`sht`, `int`, `lng`, `oct`, `hlf`, `flt`, `dbl`, `str`) and numeric aliases (`i16`, `i32`, `i64`, `i128`, `f16`, `f32`, `f64`). Line comments begin with `;;`.

Opcode snippets include documented instruction arguments and `push` setup for values consumed from the stack. Every instruction emitted by an editor snippet is terminated with a semicolon. Press Tab to move through editable placeholders for values, names, types, counts, properties, modules, function metadata, aliases, and instruction-pointer targets. Required type arguments default to `int`.

The `import`, `export`, and `instantiate` snippets are included for completeness, but these opcodes are marked as nightly by LightVM and their APIs may change.
