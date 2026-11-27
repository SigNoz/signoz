import { ruleTester } from './rule-tester.mjs';

const IMPORT = 'Import Monaco from lib/monaco/setup';
const STRIPPED = 'which the production build strips';

await ruleTester({
	rule: 'no-monaco-stripped-features',
	valid: [
		{
			name: 'setup import',
			code: "import { monaco } from 'lib/monaco/setup';",
		},
		{
			name: 'type-only import',
			code: "import type { editor } from 'monaco-editor';",
		},
		{
			name: 'inline type specifiers only',
			code: "import { type editor, type languages } from 'monaco-editor';",
		},
		{
			name: 'type-only re-export',
			code: "export type { editor } from 'monaco-editor';",
		},
		{
			name: 'react wrapper',
			code: "import Editor from '@monaco-editor/react';",
		},
		{
			name: 'kept provider',
			code: "monaco.languages.registerCompletionItemProvider('json', {});",
		},
		{
			name: 'stripped option turned off',
			code:
				"const o = { experimentalGpuAcceleration: 'off', minimap: { showMarkSectionHeaders: false } };",
		},
	],
	invalid: [
		{
			name: 'package entry import',
			code: "import * as monaco from 'monaco-editor';",
			errors: [{ message: IMPORT, line: 1, column: 25 }],
		},
		{
			name: 'deep import',
			code:
				"import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js';",
			errors: [{ message: IMPORT }],
		},
		{
			name: 'mixed value and type specifiers',
			code: "import { editor, type languages } from 'monaco-editor';",
			errors: [{ message: IMPORT }],
		},
		{
			name: 'dynamic import',
			code: "const m = await import('monaco-editor');",
			errors: [{ message: IMPORT }],
		},
		{
			name: 'require',
			code: "const m = require('monaco-editor');",
			errors: [{ message: IMPORT }],
		},
		{
			name: 're-export',
			code: "export { editor } from 'monaco-editor';",
			errors: [{ message: IMPORT }],
		},
		{
			name: 'export all',
			code: "export * from 'monaco-editor';",
			errors: [{ message: IMPORT }],
		},
		{
			name: 'stripped provider on monaco.languages',
			code: "monaco.languages.registerInlayHintsProvider('sql', {});",
			errors: [
				{
					message: 'needs the Monaco `inlayHints` contribution',
					line: 1,
					column: 1,
				},
			],
		},
		{
			name: 'stripped provider on a destructured languages',
			code: "languages.registerSignatureHelpProvider('sql', {});",
			errors: [{ message: '`parameterHints`' }],
		},
		{
			name: 'stripped provider called bare',
			code: "registerRenameProvider('json', {});",
			errors: [{ message: '`rename`' }],
		},
		{
			name: 'stripped provider through a string key',
			code: "monaco.languages['registerRenameProvider']('json', {});",
			errors: [{ message: '`rename`' }],
		},
		{
			name: 'semantic tokens provider',
			code: "monaco.languages.registerDocumentSemanticTokensProvider('json', {});",
			errors: [{ message: '`semanticTokens`' }],
		},
		{
			name: 'stripped option turned on',
			code: "const o = { experimentalGpuAcceleration: 'on' };",
			errors: [{ message: '`gpu`', line: 1, column: 13 }],
		},
		{
			name: 'stripped option with a variable value',
			code: 'const o = { minimap: { showRegionSectionHeaders: enabled } };',
			errors: [{ message: STRIPPED }],
		},
		{
			name: 'quoted option key',
			code: "const o = { 'showMarkSectionHeaders': true };",
			errors: [{ message: '`sectionHeaders`' }],
		},
	],
});
