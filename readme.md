# LightVM Language

[Acode](https://github.com/Acode-Foundation/acode) language support for LightVM [v0.1.0-alpha.9](https://github.com/soteenstudio/lightvm/tree/v0.1.0-alpha.9) bytecode.

## Features

- Syntax highlighting for the complete Acode LightVM opcode inventory, primitive types and aliases, numbers, strings, comments, and delimiters.
- LightVM-aware opcode and primitive-type completions outside comments and strings.
- Bracket matching, automatic closing, indentation, folding regions, and bracket pair colorization.
- Optional instruction-pointer inlay hints after each opcode.

Files ending in `.lightvm`, `lightvmb`, `.lvm` and `.lvmb` are recognized automatically.

## Commands

Run **LightVM: Toggle Instruction Pointers** (`lightvm.showInstructionPointers`) from the Command Palette to show or hide `[IP n]` hints. Instruction pointers are numbered from zero in document order.

## Language support

The extension supports canonical primitive types (`sht`, `int`, `lng`, `oct`, `hlf`, `flt`, `dbl`, `str`) and numeric aliases (`i16`, `i32`, `i64`, `i128`, `f16`, `f32`, `f64`). Line comments begin with `;;`.
