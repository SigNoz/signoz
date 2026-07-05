import type { Monaco } from '@monaco-editor/react';
import permissionsType from 'lib/authz/hooks/useAuthZ/permissions.type';
import transactionGroupSchema from 'schemas/generated/transactionGroups.schema.json';

export const TRANSACTION_GROUP_SCHEMA = transactionGroupSchema;

const SCHEMA_URI = 'inmemory://model/transaction-groups-schema.json';
export const ROLE_PERMISSIONS_MODEL_PATH = 'role-permissions.json';

export function registerJsonSchema(monaco: Monaco): void {
	monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
		validate: true,
		schemaValidation: 'error',
		schemas: [
			{
				uri: SCHEMA_URI,
				fileMatch: [ROLE_PERMISSIONS_MODEL_PATH],
				schema: TRANSACTION_GROUP_SCHEMA,
			},
		],
	});
}

interface SnippetDef {
	label: string;
	insertText: string;
	documentation: string;
}

type BasePermissionTypeDataResourcesType =
	(typeof permissionsType.data)['resources'][number];

function createGrantAllPermissionSnippet(
	kind: BasePermissionTypeDataResourcesType['kind'],
	allowedVerbs: BasePermissionTypeDataResourcesType['allowedVerbs'],
	type: BasePermissionTypeDataResourcesType['type'],
): SnippetDef {
	return {
		label: `${kind}:all`,
		insertText: allowedVerbs
			.map(
				(verb) => `{
  "objectGroup": {
    "resource": { "kind": "${kind}", "type": "${type}" },
    "selectors": ["*"]
  },
  "relation": "${verb}"
}`,
			)
			.join(',\n'),
		documentation: `Grant all permissions (${allowedVerbs.join(', ')}) on ${kind}`,
	};
}

function createGrantPermissionToVerbAndKind(
	kind: BasePermissionTypeDataResourcesType['kind'],
	verb: string,
	type: BasePermissionTypeDataResourcesType['type'],
): SnippetDef {
	return {
		label: `${kind}:${verb}`,
		insertText: `{
  "objectGroup": {
    "resource": { "kind": "${kind}", "type": "${type}" },
    "selectors": ["*"]
  },
  "relation": "${verb}"
}`,
		documentation: `${verb} permission on ${kind}`,
	};
}

function createGrantPermissionAsReadonly(
	resources: (typeof permissionsType.data)['resources'],
): SnippetDef {
	return {
		label: 'readonly',
		insertText: resources
			.filter(
				(r) => r.allowedVerbs.includes('read') || r.allowedVerbs.includes('list'),
			)
			.flatMap((r) => {
				const verbs = r.allowedVerbs.filter((v) => v === 'read' || v === 'list');
				return verbs.map(
					(verb) => `{
  "objectGroup": {
    "resource": { "kind": "${r.kind}", "type": "${r.type}" },
    "selectors": ["*"]
  },
  "relation": "${verb}"
}`,
				);
			})
			.join(',\n'),
		documentation: 'Read-only access to all resources (read + list)',
	};
}

function buildResourceSnippets(): SnippetDef[] {
	const { resources } = permissionsType.data;
	const snippets: SnippetDef[] = [];

	for (const resource of resources) {
		const { kind, type, allowedVerbs } = resource;

		snippets.push(createGrantAllPermissionSnippet(kind, allowedVerbs, type));

		for (const verb of allowedVerbs) {
			snippets.push(createGrantPermissionToVerbAndKind(kind, verb, type));
		}
	}

	snippets.push(createGrantPermissionAsReadonly(resources));

	return snippets;
}

const SNIPPETS = buildResourceSnippets();

type MonacoModel = Parameters<
	Parameters<
		Monaco['languages']['registerCompletionItemProvider']
	>[1]['provideCompletionItems']
>[0];
type MonacoPosition = Parameters<
	Parameters<
		Monaco['languages']['registerCompletionItemProvider']
	>[1]['provideCompletionItems']
>[1];

interface Disposable {
	dispose(): void;
}

/**
 * Check if completions should be provided based on model path and cursor position.
 * Pure function for testability.
 */
export function shouldProvideCompletions(
	modelPath: string,
	textBeforeCursor: string,
): boolean {
	if (!modelPath.endsWith(ROLE_PERMISSIONS_MODEL_PATH)) {
		return false;
	}

	const trimmed = textBeforeCursor.trim();
	const endsAtArrayPosition = trimmed.endsWith('[') || trimmed.endsWith(',');

	if (!endsAtArrayPosition) {
		return false;
	}

	let braceDepth = 0;
	for (const char of textBeforeCursor) {
		if (char === '{') {
			braceDepth++;
		} else if (char === '}') {
			braceDepth--;
		}
	}

	return braceDepth === 0;
}

/**
 * Register completion provider for smart snippets.
 * Returns disposable to clean up on unmount.
 */
export function registerCompletionProvider(monaco: Monaco): Disposable {
	return monaco.languages.registerCompletionItemProvider('json', {
		triggerCharacters: ['"', '{', '['],
		provideCompletionItems(model: MonacoModel, position: MonacoPosition) {
			const textBeforeCursor = model.getValueInRange({
				startLineNumber: 1,
				startColumn: 1,
				endLineNumber: position.lineNumber,
				endColumn: position.column,
			});

			if (!shouldProvideCompletions(model.uri.path, textBeforeCursor)) {
				return { suggestions: [] };
			}

			const word = model.getWordUntilPosition(position);
			const range = {
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: word.startColumn,
				endColumn: word.endColumn,
			};

			const suggestions = SNIPPETS.map((snippet, index) => ({
				label: snippet.label,
				kind: monaco.languages.CompletionItemKind.Snippet,
				insertText: snippet.insertText,
				insertTextRules:
					monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				documentation: snippet.documentation,
				range,
				sortText: String(index).padStart(3, '0'),
			}));

			return { suggestions };
		},
	});
}
