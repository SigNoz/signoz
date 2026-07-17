import { useCallback, useEffect, useState } from 'react';

import type { VariableUsage } from '../utils/variableUsages';

/** A usage row plus whether its edit will be applied on confirm. */
export interface EditableVariableUsage extends VariableUsage {
	included: boolean;
}

interface UseVariableImpactState {
	rows: EditableVariableUsage[];
	setResultingText: (id: string, text: string) => void;
	toggleIncluded: (id: string) => void;
	/** The included rows, as plain usages, to build the patch from. */
	resolvedUsages: VariableUsage[];
}

/**
 * Editable state for the impact dialog: a per-usage copy the user can edit
 * (`resultingText`) and include/exclude before applying. Resets whenever the
 * dialog (re)opens for a fresh usage set.
 */
export function useVariableImpactState(
	usages: VariableUsage[],
	open: boolean,
): UseVariableImpactState {
	const [rows, setRows] = useState<EditableVariableUsage[]>([]);

	useEffect(() => {
		if (open) {
			setRows(usages.map((usage) => ({ ...usage, included: true })));
		}
	}, [open, usages]);

	const setResultingText = useCallback((id: string, text: string): void => {
		setRows((prev) =>
			prev.map((row) => (row.id === id ? { ...row, resultingText: text } : row)),
		);
	}, []);

	const toggleIncluded = useCallback((id: string): void => {
		setRows((prev) =>
			prev.map((row) =>
				row.id === id ? { ...row, included: !row.included } : row,
			),
		);
	}, []);

	const resolvedUsages: VariableUsage[] = rows.filter((row) => row.included);

	return { rows, setResultingText, toggleIncluded, resolvedUsages };
}
