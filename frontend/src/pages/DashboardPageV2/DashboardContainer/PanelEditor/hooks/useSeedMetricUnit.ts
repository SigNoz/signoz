import { useEffect, useRef } from 'react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import useGetYAxisUnit from 'hooks/useGetYAxisUnit';
import type {
	SectionControls,
	SectionKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import { readFormatting, writeFormatting } from '../utils/formattingSpec';
import type { TableColumnOption } from './useTableColumns';

type FormattingControls = SectionControls[SectionKind.Formatting];

interface UseSeedMetricUnitArgs {
	/** Only a new panel auto-seeds; editing never overwrites a saved unit. */
	isNewPanel: boolean;
	/**
	 * The current kind's Formatting controls — the single source of truth for which
	 * field a metric unit seeds into: `unit` (panel-wide) vs `columnUnits` (Table).
	 * A kind with neither (Histogram/List) seeds nothing.
	 */
	formattingControls: FormattingControls | undefined;
	/** Resolved value columns (Table only; empty before results arrive / for other kinds). */
	columns: TableColumnOption[];
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
}

interface UseSeedMetricUnitResult {
	metricUnit: string | undefined;
	isLoading: boolean;
}

/**
 * Resolves the selected metric's unit and, on a new panel only, seeds it into the panel's
 * formatting — into `formatting.unit` for kinds with a panel-wide unit control, or into
 * `formatting.columnUnits` (per value column) for a Table, which has no panel-wide unit.
 * The kind's Formatting `controls` decide which applies, mirroring `buildPluginSpec`'s
 * switch-time seeding so the two never diverge. Returns the unit for the FormattingSection's
 * mismatch warning.
 */
export function useSeedMetricUnit({
	isNewPanel,
	formattingControls,
	columns,
	spec,
	onChangeSpec,
}: UseSeedMetricUnitArgs): UseSeedMetricUnitResult {
	const { yAxisUnit: metricUnit, isLoading } = useGetYAxisUnit();

	const seedsUnit = isNewPanel && !!formattingControls?.unit;
	const seedsColumnUnits = isNewPanel && !!formattingControls?.columnUnits;

	// Panel-wide unit: seed (and re-seed) whenever the resolved metric unit changes. Kept
	// off `spec` so a manual unit edit doesn't re-run this and fight the user.
	useEffect(() => {
		if (!seedsUnit || !metricUnit || metricUnit === readFormatting(spec)?.unit) {
			return;
		}
		onChangeSpec(writeFormatting(spec, { unit: metricUnit }));
		// Re-seed only when the resolved metric unit changes, not on every unit edit.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [seedsUnit, metricUnit]);

	// Per-column units (Table): seed once, only for columns without a unit yet, so it
	// never clobbers a user's edit or a cleared column. Waits for results to resolve them.
	const seededColumnsRef = useRef(false);
	useEffect(() => {
		if (
			!seedsColumnUnits ||
			seededColumnsRef.current ||
			!metricUnit ||
			columns.length === 0
		) {
			return;
		}
		const columnUnits = readFormatting(spec)?.columnUnits ?? {};
		const unset = columns.filter(
			(column) => columnUnits[column.key] === undefined,
		);
		seededColumnsRef.current = true;
		if (unset.length === 0) {
			return;
		}
		const nextColumnUnits = { ...columnUnits };
		unset.forEach((column) => {
			nextColumnUnits[column.key] = metricUnit;
		});
		onChangeSpec(writeFormatting(spec, { columnUnits: nextColumnUnits }));
		// Seed once columns first resolve with a unit; not on later spec edits.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [seedsColumnUnits, metricUnit, columns]);

	return { metricUnit, isLoading };
}
