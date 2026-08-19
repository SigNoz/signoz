---
paths:
  - "**/*.go"
---

# Go comments

The bar is the [`comments`](comments.md) rule: nothing where the code is self-explanatory.

- **Names carry the meaning.** Make function, type, and variable names self-explanatory so the comment is unnecessary in the first place. If a comment is needed to explain what a function does, fix the name, not the comment.
- **Godoc**: Skip comments that merely restate the identifier. Document only non-obvious behavior, constraints, formats, and edge cases.
- **Generated code**: If the comment is emitted by an external codegen tool, leave it as-is — do not add or trim comments in generated files.
