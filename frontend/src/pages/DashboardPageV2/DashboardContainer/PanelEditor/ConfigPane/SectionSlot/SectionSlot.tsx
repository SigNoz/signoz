import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import {
	SECTION_METADATA,
	type SectionConfig,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import type { LegendSeries } from '../../useLegendSeries';
import { resolveSectionEditor } from '../sectionRegistry';
import SettingsSection from '../SettingsSection/SettingsSection';

interface SectionSlotProps {
	config: SectionConfig;
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
	/** Resolved series, forwarded to editors that need them (legend colors). */
	legendSeries: LegendSeries[];
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
}: SectionSlotProps): JSX.Element | null {
	const editor = resolveSectionEditor(config.kind);
	if (!editor) {
		return null;
	}

	const { title, icon: Icon } = SECTION_METADATA[config.kind];
	const { Component, read, write } = editor;
	// Atomic sections carry no `controls`; controlled ones do.
	const controls = 'controls' in config ? config.controls : undefined;

	return (
		<SettingsSection title={title} icon={<Icon size={15} />}>
			<Component
				value={read(spec)}
				controls={controls}
				onChange={(next): void => onChangeSpec(write(spec, next))}
				legendSeries={legendSeries}
			/>
		</SettingsSection>
	);
}

export default SectionSlot;
