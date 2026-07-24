import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
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

// `yAxisUnit` is derived from the spec below; `registerHeaderAction` is wired here.
type SectionSlotProps = {
	config: SectionConfig;
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
} & Omit<SectionEditorContext, 'yAxisUnit' | 'registerHeaderAction'>;

// Per-section header control (beside the chevron). A render fn, so a section shows
// whatever it wants; `trigger` expands the section and runs the editor's handler.
const SECTION_HEADER_ACTION: Partial<
	Record<SectionKind, (trigger: () => void) => ReactNode>
> = {
	[SectionKind.Thresholds]: (trigger): ReactNode => (
		<Button
			type="button"
			variant="ghost"
			color="secondary"
			size="icon"
			aria-label="Add threshold"
			testId="panel-editor-v2-add-threshold-header"
			onClick={trigger}
		>
			<Plus size={15} />
		</Button>
	),
	[SectionKind.ContextLinks]: (trigger): ReactNode => (
		<Button
			type="button"
			variant="ghost"
			color="secondary"
			size="icon"
			aria-label="Add Context Link"
			testId="panel-editor-v2-add-link-header"
			onClick={trigger}
		>
			<Plus size={15} />
		</Button>
	),
};

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
	panelKind,
	onChangePanelKind,
	queryType,
	stepInterval,
	metricUnit,
}: SectionSlotProps): JSX.Element | null {
	const editor = resolveSectionEditor(config.kind);
	// Controlled so the header quick-add can expand on click. Visualization opens by
	// default; list sections (Thresholds/Context Links) open when already populated.
	const [open, setOpen] = useState(() => {
		if (config.kind === SectionKind.Visualization) {
			return true;
		}
		const value = editor?.get(spec);
		return Array.isArray(value) && value.length > 0;
	});
	// The editor mounts only while open; `pendingAction` runs the add after a collapsed-click expand.
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

	// A kind can hide a section based on current spec state (e.g. Histogram legend once
	// queries are merged) — skip it before resolving the editor.
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
	// The panel's formatting unit, forwarded to editors that scope to it (thresholds
	// restrict their unit picker to this unit's category, as in V1).
	const yAxisUnit = (spec.plugin.spec as { formatting?: PanelFormattingSlice })
		.formatting?.unit;

	const headerAction = SECTION_HEADER_ACTION[config.kind]?.(triggerHeaderAction);

	return (
		<SettingsSection
			title={title}
			icon={<Icon size={15} />}
			open={open}
			onOpenChange={setOpen}
			headerAction={headerAction}
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
