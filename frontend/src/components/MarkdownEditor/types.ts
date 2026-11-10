/** The value every editor command reads and returns. */
export interface EditorSnapshot {
	text: string;
	selectionStart: number;
	selectionEnd: number;
}

export type EditorTransform = (snapshot: EditorSnapshot) => EditorSnapshot;

export interface EditorVariable {
	name: string;
	/** Short tag for the variable's kind, e.g. "QUERY". */
	badge?: string;
}

export interface EditorCommand {
	id: string;
	/** Accessible name and tooltip for the toolbar button. */
	label: string;
	run: EditorTransform;
}

/** 1-based, as the status bar reports it. */
export interface CursorPosition {
	line: number;
	column: number;
}
