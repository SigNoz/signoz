import { EditorView } from '@uiw/react-codemirror';

/**
 * CodeMirror extension to stop DOM events from propagating to global shortcuts.
 * Used by QuerySearch to keep editor keyboard/focus/blur handling local.
 */
export const stopEventsExtension = EditorView.domEventHandlers({
	keydown: (event) => {
		event.stopPropagation();
		event.stopImmediatePropagation();
		return false;
	},
	input: (event) => {
		event.stopPropagation();
		return false;
	},
	focus: (event) => {
		event.stopPropagation();
		return false;
	},
	blur: (event) => {
		event.stopPropagation();
		return false;
	},
});
