# Contribution guidelines

- When making Go changes, always ensure they follow the contributing guildelines in [`docs/contributing/go/`](../../docs/contributing/go/).
- If any API contract is modified, generate the OpenAPI specs with `make gen-openapi-specs`.
- Always keep the OpenAPI spec generated in a separate commit, so the whole commit can be dropped in case of conflicts during merge. Do not try to resolve conflict in generated files, instead just generate them again.
- Avoid breaking function calls unncessarily into multilines for couple of arguments.
- Try to keep most computational only logic in types package itself related to a domain type, use modules as the orchestraction layer cordinating different layers and all db queries in store layer. Check the serviceaccount modules for inspiration when confused.
- When defining types, keep the structure of file to have any constants and variables first, then exported types and exported methods and then finally the unexported types and methods.
- Never import types or other modules in migration files, duplicate the required type or method to keep migration free from changes.
