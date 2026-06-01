import type {
	DashboardtypesVariableDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

export type V2VariableKind = 'QUERY' | 'CUSTOM' | 'DYNAMIC' | 'TEXT';

/**
 * Internal editor state. Holds every per-kind field so that switching `kind`
 * does not discard user input. Only the fields relevant to the active kind
 * are written into the resulting V2 envelope on save.
 */
export interface VariableDraft {
	id: string; // local identifier for list keys; not persisted to V2
	kind: V2VariableKind;
	name: string;
	displayName: string;

	// Shared by all List variants (QUERY / CUSTOM / DYNAMIC)
	allowAllValue: boolean;
	allowMultiple: boolean;
	sort: string;
	defaultValue: string;
	// V2-only: literal value emitted when the user picks "ALL"
	customAllValue: string;
	// V2-only: regex applied to query/dynamic results to extract the actual value
	capturingRegexp: string;

	// QUERY
	queryValue: string;

	// CUSTOM
	customValue: string;

	// DYNAMIC
	dynamicName: string;
	dynamicSignal: TelemetrytypesSignalDTO | undefined;

	// TEXT
	textValue: string;
}

export type SaveCallback = (dto: DashboardtypesVariableDTO) => void;

export const VARIABLE_KIND_LABEL: Record<V2VariableKind, string> = {
	QUERY: 'Query',
	CUSTOM: 'Custom',
	DYNAMIC: 'Dynamic',
	TEXT: 'Text',
};

// V2 supports a finer sort taxonomy than V1: separate alphabetical and
// numerical orderings (V1 only exposed Disabled / Ascending / Descending).
// Values match the strings used in the perses fixture and backend.
export const SORT_OPTIONS: { label: string; value: string }[] = [
	{ label: 'Disabled', value: 'none' },
	{ label: 'Alphabetical ascending', value: 'alphabetical-asc' },
	{ label: 'Alphabetical descending', value: 'alphabetical-desc' },
	{ label: 'Numerical ascending', value: 'numerical-asc' },
	{ label: 'Numerical descending', value: 'numerical-desc' },
];
