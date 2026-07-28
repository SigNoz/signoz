import { type ReactNode, useCallback, useRef, useState } from 'react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import {
	type PanelFormattingSlice,
	SECTION_METADATA,
	type SectionConfig,
	SectionKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import type { SectionEditorContext } from '../sectionContext';
import { resolveSectionEditor } from '../sectionRegistry';
import SettingsSection from '../SettingsSection/SettingsSection';
import SectionHeaderQuickAdd from './SectionHeaderQuickAdd';

type SectionSlotProps = {
	config: SectionConfig;
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
} & Omit<SectionEditorContext, 'yAxisUnit' | 'registerHeaderAction'>;

// Per-section header content; `trigger` expands the section and runs the editor's handler.
const SECTION_HEADER_SLOT: Partial<
	Record<SectionKind, (trigger: () => void) => ReactNode>
> = {
	[SectionKind.Thresholds]: (trigger): ReactNode => (
		<SectionHeaderQuickAdd
			action={{
				label: 'Add Threshold',
				testId: 'panel-editor-v2-add-threshold-header',
			}}
			onClick={trigger}
		/>
	),
	[SectionKind.ContextLinks]: (trigger): ReactNode => (
		<SectionHeaderQuickAdd
			action={{
				label: 'Add Context Link',
				testId: 'panel-editor-v2-add-link-header',
			}}
			onClick={trigger}
		/>
	),
};

/**
 * Renders one configuration section: its collapsible wrapper plus the registered editor
 * for `config.kind`. Renders nothing when the kind has no editor yet.
 */
function SectionSlot({
	config,
	spec,
	onChangeSpec,
	legendSeries,
	tableColumns,
	signal,
	panelKind,
	onChangePanelKind,
	queryType,
	stepInterval,
	metricUnit,
}: SectionSlotProps): JSX.Element | null {
	const editor = resolveSectionEditor(config.kind);
	// Controlled so the header slot can expand on click; list sections open when populated.
	const [open, setOpen] = useState(() => {
		if (config.kind === SectionKind.Visualization) {
			return true;
		}
		const value = editor?.get(spec);
		return Array.isArray(value) && value.length > 0;
	});
	// The editor mounts only while open, so a collapsed-click defers the handler until it registers.
	const actionHandlerRef = useRef<(() => void) | null>(null);
	const pendingActionRef = useRef(false);

	const registerHeaderAction = useCallback(
		(handler: (() => void) | null): void => {
			actionHandlerRef.current = handler;
			if (handler && pendingActionRef.current) {
				pendingActionRef.current = false;
				handler();
			}
		},
		[],
	);

	const triggerHeaderAction = useCallback((): void => {
		setOpen(true);
		if (actionHandlerRef.current) {
			actionHandlerRef.current();
		} else {
			pendingActionRef.current = true;
		}
	}, []);

	if (config.isHidden?.(spec)) {
		return null;
	}

	if (!editor) {
		return null;
	}

	const { title, icon: Icon } = SECTION_METADATA[config.kind];
	const { Component, get, update } = editor;
	// Atomic sections carry no `controls`; controlled ones do.
	const controls = 'controls' in config ? config.controls : undefined;
	// Forwarded to editors that scope to the panel's unit (e.g. the thresholds unit picker).
	const yAxisUnit = (spec.plugin.spec as { formatting?: PanelFormattingSlice })
		.formatting?.unit;

	const headerSlot = SECTION_HEADER_SLOT[config.kind]?.(triggerHeaderAction);

	return (
		<SettingsSection
			title={title}
			icon={<Icon size={15} />}
			open={open}
			onOpenChange={setOpen}
			headerSlot={headerSlot}
		>
			<Component
				value={get(spec)}
				controls={controls}
				onChange={(next): void => onChangeSpec(update(spec, next))}
				legendSeries={legendSeries}
				yAxisUnit={yAxisUnit}
				tableColumns={tableColumns}
				signal={signal}
				panelKind={panelKind}
				onChangePanelKind={onChangePanelKind}
				queryType={queryType}
				stepInterval={stepInterval}
				metricUnit={metricUnit}
				registerHeaderAction={registerHeaderAction}
			/>
		</SettingsSection>
	);
}

export default SectionSlot;
