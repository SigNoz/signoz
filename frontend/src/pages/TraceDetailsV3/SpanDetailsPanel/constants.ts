import { SPAN_ACTION } from './hooks/useSpanAttributeActions';

// Action identifiers for built-in PrettyView actions (copy, pin)
const PRETTY_VIEW_ACTION = {
	COPY: 'copy',
	PIN: 'pin',
} as const;

// Which actions are visible per node type — drives the entire menu
export const VISIBLE_ACTIONS = {
	leaf: [
		PRETTY_VIEW_ACTION.COPY,
		PRETTY_VIEW_ACTION.PIN,
		SPAN_ACTION.FILTER_IN,
		SPAN_ACTION.FILTER_OUT,
		SPAN_ACTION.GROUP_BY,
	],
	nested: [PRETTY_VIEW_ACTION.COPY],
} as const;

export enum SpanDetailVariant {
	DRAWER = 'drawer',
	DIALOG = 'dialog',
	DOCKED = 'docked',
	DOCKED_RIGHT = 'right',
}

// Fits the four span detail tabs without scroll arrows
export const SPAN_DETAILS_PANEL_MIN_WIDTH = 620;
