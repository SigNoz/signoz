import { PANEL_TYPES } from 'constants/queryBuilder';

const PANEL_TYPE_VALUES = new Set<string>(Object.values(PANEL_TYPES));

// The param is JSON encoded, but older alert links and bookmarks carry it as a plain string.
export const parsePanelType = (value: string): PANEL_TYPES | null => {
	let parsed: unknown = value;

	try {
		parsed = JSON.parse(value);
	} catch {
		parsed = value;
	}

	return typeof parsed === 'string' && PANEL_TYPE_VALUES.has(parsed)
		? (parsed as PANEL_TYPES)
		: null;
};
