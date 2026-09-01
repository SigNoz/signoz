// The body is persisted inline in the dashboard JSON, so its length is capped.
export const MARKDOWN_MAX_LENGTH = 16000;

/** The canonical syntax; the renderer resolves the other three too. */
export const formatVariableToken = (name: string): string => `$${name}`;

export const MARKDOWN_HELP_ITEMS: { syntax: string; label: string }[] = [
	// First: consecutive lines joining into one paragraph is the CommonMark rule
	// authors trip over before any of the formatting syntax.
	{ syntax: 'blank line', label: 'New paragraph' },
	{ syntax: '2 spaces + ⏎', label: 'Line break' },
	{ syntax: '# Heading', label: 'Heading (1–6 #)' },
	{ syntax: '**bold**', label: 'Bold' },
	{ syntax: '_italic_', label: 'Italic' },
	{ syntax: '- item', label: 'Bulleted list' },
	{ syntax: '1. item', label: 'Numbered list' },
	{ syntax: '- [ ] task', label: 'Task list' },
	{ syntax: '[label](url)', label: 'Link' },
	{ syntax: '![alt](url)', label: 'Image' },
	{ syntax: '`code`', label: 'Inline code' },
	{ syntax: '```lang', label: 'Code block' },
	{ syntax: '> quote', label: 'Blockquote' },
	{ syntax: '| a | b |', label: 'Table' },
];
