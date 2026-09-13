# Changelogs

## v0.1.1

### Features

- Add Unitry test support and configuration.
- Add unit coverage for LightVM completions, delimiters, instruction pointers, and rainbow brackets.
- Add unit coverage for plugin initialization, registration, and cleanup in `src/main.ts`.

### Fixes

- Type-check test sources before running the unit test suite.
- Prevent plugin bootstrap when `window` is unavailable.
- Convert `pack-zip.js` to ESM for compatibility with the module-based package.

## v0.1.0

- Add complete LightVM v0.1.0-alpha.9 opcode and primitive-type highlighting.
- Add LightVM-aware completions, language configuration, bracket colorization, and instruction-pointer inlay hints.
