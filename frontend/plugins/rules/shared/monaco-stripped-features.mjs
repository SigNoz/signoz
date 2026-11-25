/**
 * Monaco editor contributions the production build drops (vite.config.ts marks
 * them side-effect free), with the API that would need them at runtime.
 * `signoz/no-monaco-stripped-features` reports those APIs, since the build
 * leaves them without an error and without an effect.
 *
 * To use one, delete its entry here.
 */
export const MONACO_STRIPPED_FEATURES = {
	codelens: { providers: ['registerCodeLensProvider'] },
	dropOrPasteInto: {},
	gpu: { options: ['experimentalGpuAcceleration'] },
	inlayHints: { providers: ['registerInlayHintsProvider'] },
	inlineCompletions: { providers: ['registerInlineCompletionsProvider'] },
	linkedEditing: { providers: ['registerLinkedEditingRangeProvider'] },
	parameterHints: { providers: ['registerSignatureHelpProvider'] },
	rename: {
		providers: ['registerRenameProvider', 'registerNewSymbolNameProvider'],
	},
	sectionHeaders: {
		options: ['showRegionSectionHeaders', 'showMarkSectionHeaders'],
	},
	semanticTokens: {
		providers: [
			'registerDocumentSemanticTokensProvider',
			'registerDocumentRangeSemanticTokensProvider',
		],
	},
};
