import type {
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	type PanelFormattingSlice,
	SECTION_METADATA,
	type SectionConfig,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import type { LegendSeries } from '../../hooks/useLegendSeries';
import type { TableColumnOption } from '../../hooks/useTableColumns';
import { resolveSectionEditor } from '../sectionRegistry';
import SettingsSection from '../SettingsSection/SettingsSection';

interface SectionSlotProps {
	config: SectionConfig;
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
	/** Resolved series, forwarded to editors that need them (legend colors). */
	legendSeries: LegendSeries[];
	/** Table panel's resolved value columns, for the table-only editors. */
	tableColumns: TableColumnOption[];
	/** Panel's telemetry signal, for editors that fetch field suggestions (List columns). */
	signal?: TelemetrytypesSignalDTO;
}

/**
 * Renders one configuration section: its collapsible wrapper plus the registered editor
 * for `config.kind`, wired through the registry's spec lens. Renders nothing when the
 * kind has no editor yet (sections roll out incrementally), so a kind can declare a
 * section before its editor exists.
 */
function SectionSlot({
	config,
	spec,
	onChangeSpec,
	legendSeries,
	tableColumns,
	signal,
}: SectionSlotProps): JSX.Element | null {
	// A kind can hide a section based on current spec state (e.g. Histogram legend once
	// queries are merged) — skip it before resolving the editor.
	if (config.isHidden?.(spec)) {
		return null;
	}

	const editor = resolveSectionEditor(config.kind);
	if (!editor) {
		return null;
	}

	const { title, icon: Icon } = SECTION_METADATA[config.kind];
	const { Component, get, update } = editor;
	// Atomic sections carry no `controls`; controlled ones do.
	const controls = 'controls' in config ? config.controls : undefined;
	// The panel's formatting unit, forwarded to editors that scope to it (thresholds
	// restrict their unit picker to this unit's category, as in V1).
	const yAxisUnit = (spec.plugin.spec as { formatting?: PanelFormattingSlice })
		.formatting?.unit;

	return (
		<SettingsSection title={title} icon={<Icon size={15} />}>
			<Component
				value={get(spec)}
				controls={controls}
				onChange={(next): void => onChangeSpec(update(spec, next))}
				legendSeries={legendSeries}
				yAxisUnit={yAxisUnit}
				tableColumns={tableColumns}
				signal={signal}
			/>
		</SettingsSection>
	);
}

export default SectionSlot;
