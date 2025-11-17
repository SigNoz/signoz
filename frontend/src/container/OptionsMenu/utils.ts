import { SelectProps } from 'antd';
import { TelemetryFieldKey } from 'api/v5/v5';
import {
	FieldContext,
	FieldDataType,
	SignalType,
} from 'types/api/v5/queryRange';

/**
 * Display name mapping for log fieldContext columns
 * Provides user-friendly names for standard log fields
 */
const LOG_FIELD_DISPLAY_NAMES: Record<string, string> = {
	body: 'Body',
	severity_number: 'Severity Number',
	severity_text: 'Severity Text',
	span_id: 'Span ID',
	trace_flags: 'Trace Flags',
	trace_id: 'Trace ID',
	scope_name: 'Scope Name',
	scope_version: 'Scope Version',
};

/**
 * Helper function to create a TelemetryFieldKey with properly formatted key and displayName
 * Ensures consistent key format: fieldContext.name:fieldDataType
 * Uses display name map for log fieldContext columns
 * @param suggestion - The raw suggestion data from the API
 * @returns A TelemetryFieldKey with key and displayName fields properly set
 */
export function createTelemetryFieldKey(suggestion: any): TelemetryFieldKey {
	let displayName = suggestion.displayName || suggestion.name;

	// Use mapped display name for log fieldContext columns
	// We need to check the fieldContext to avoid overriding non-log fields coming from attributes
	if (
		(suggestion.fieldContext === 'log' || suggestion.fieldContext === 'scope') &&
		LOG_FIELD_DISPLAY_NAMES[suggestion.name]
	) {
		displayName = LOG_FIELD_DISPLAY_NAMES[suggestion.name];
	}

	return {
		name: suggestion.name,
		displayName,
		key: `${suggestion.fieldContext}.${suggestion.name}:${suggestion.fieldDataType}`,
		signal: suggestion.signal as SignalType,
		fieldDataType: suggestion.fieldDataType as FieldDataType,
		fieldContext: suggestion.fieldContext as FieldContext,
	};
}

/**
 * Generates a suffix for a column display name based on conflicts
 * @param column - The column to generate suffix for
 * @param hasContextConflict - Whether there's a conflict in fieldContext
 * @param hasDataTypeConflict - Whether there's a conflict in fieldDataType
 * @returns The suffix string to append to the column name
 */
function generateColumnSuffix(
	column: TelemetryFieldKey,
	hasContextConflict: boolean,
	hasDataTypeConflict: boolean,
): string {
	if (hasContextConflict && column.fieldContext) {
		return ` (${column.fieldContext})`;
	}
	if (!hasContextConflict && hasDataTypeConflict && column.fieldDataType) {
		return ` (${column.fieldDataType})`;
	}
	return '';
}

/**
 * Updates display names for conflicting columns in the columnsByKey map
 * @param columns - Array of columns with the same name
 * @param columnsByKey - Map to update with new display names
 */
function updateConflictingDisplayNames(
	columns: TelemetryFieldKey[],
	columnsByKey: Map<string, TelemetryFieldKey>,
): void {
	const contexts = new Set(columns.map((c) => c.fieldContext));
	const dataTypes = new Set(columns.map((c) => c.fieldDataType));
	const hasContextConflict = contexts.size > 1;
	const hasDataTypeConflict = dataTypes.size > 1;

	if (!hasContextConflict && !hasDataTypeConflict) {
		return;
	}

	columns.forEach((column) => {
		// Skip if already has a custom displayName (not just the name)
		if (column.displayName && column.displayName !== column.name) {
			return;
		}

		const suffix = generateColumnSuffix(
			column,
			hasContextConflict,
			hasDataTypeConflict,
		);

		if (suffix) {
			columnsByKey.set(column.key || column.name, {
				...column,
				displayName: `${column.name}${suffix}`,
			});
		}
	});
}

/**
 * Processes a list of TelemetryFieldKeys and updates displayName for conflicting columns
 * Adds suffix with fieldContext and/or fieldDataType when columns have the same name
 * but different context or data type.
 * Note: 'log' & 'scope' fieldContext suffix is hidden as it's the default context for logs.
 * Also deduplicates columns with the same key.
 * @param suggestions - Array of TelemetryFieldKey objects to process
 * @returns Array with updated displayNames for conflicting columns and no duplicates
 */
export function resolveColumnConflicts(
	suggestions: TelemetryFieldKey[],
): TelemetryFieldKey[] {
	// Use Map for O(1) deduplication by key
	const columnsByKey = new Map<string, TelemetryFieldKey>();
	// Track columns by name to detect conflicts
	const columnsByName = new Map<string, TelemetryFieldKey[]>();

	// First pass: deduplicate by key and group by name
	suggestions.forEach((suggestion) => {
		// Skip duplicates (same key)
		if (columnsByKey.has(suggestion.key || suggestion.name)) {
			return;
		}

		columnsByKey.set(suggestion.key || suggestion.name, suggestion);

		// Group by name for conflict detection
		const existing = columnsByName.get(suggestion.name) || [];
		columnsByName.set(suggestion.name, [...existing, suggestion]);
	});

	// Second pass: resolve conflicts for columns with same name
	columnsByName.forEach((columns) => {
		if (columns.length > 1) {
			updateConflictingDisplayNames(columns, columnsByKey);
		}
	});

	return Array.from(columnsByKey.values());
}

export const getOptionsFromKeys = (
	keys: TelemetryFieldKey[],
	selectedKeys: (string | undefined)[],
): SelectProps['options'] => {
	const options = keys.map(({ key, displayName, name }) => ({
		label: displayName || name,
		value: key,
	}));

	return options.filter(
		({ value }) => !selectedKeys.find((key) => key === value),
	);
};
