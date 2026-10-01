import { DashboardtypesTimePreferenceDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { EQueryType } from 'types/common/dashboard';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { SWITCH_SKETCHES } from '../../controls/drawings/switchSketches';
import PanelTypeSwitcher from '../../PanelTypeSwitcher/PanelTypeSwitcher';
import type { SectionEditorContext } from '../../sectionContext';
import { createFieldResetter } from '../../utils/changes';
import {
	BAR_LAYOUT_HELP,
	BAR_LAYOUT_OPTIONS,
	BarLayout,
	STACK_MODE_HELP,
	STACK_MODE_OPTIONS,
} from './options';
import { TIME_PREFERENCE_OPTIONS } from './timePreferenceOptions';

type VisualizationSectionProps = SectionEditorProps<SectionKind.Visualization> &
	Pick<
		SectionEditorContext,
		| 'panelKind'
		| 'onChangePanelKind'
		| 'originalPanelKind'
		| 'signal'
		| 'queryType'
	>;

/**
 * Edits the `visualization` slice: the panel-type switcher (`switchPanelKind`, every
 * kind), the per-panel time preference, bar stacking (`stackedBarChart`, Bar only),
 * area stacking (`stack`, Area only) and gap filling (`fillSpans`). Each control is
 * gated by its `controls` flag, so a kind only renders — and only writes — the fields
 * its spec supports.
 */
function VisualizationSection({
	value,
	defaultValue,
	controls,
	onChange,
	panelKind,
	onChangePanelKind,
	originalPanelKind,
	queryType,
	signal,
}: VisualizationSectionProps): JSX.Element {
	const reset = createFieldResetter(value, defaultValue, onChange);
	const timePreference =
		value?.timePreference ?? DashboardtypesTimePreferenceDTO.global_time;
	const barLayout = value?.stackedBarChart
		? BarLayout.STACKED
		: BarLayout.SIDE_BY_SIDE;
	const stack = value?.stack ?? defaultValue?.stack;

	return (
		<>
			{controls.switchPanelKind && panelKind && onChangePanelKind && (
				<PanelTypeSwitcher
					panelKind={panelKind}
					// queryType is optional on the kind-erased section context, but always
					// supplied in practice; default to Query Builder at this boundary.
					queryType={queryType ?? EQueryType.QUERY_BUILDER}
					signal={signal}
					originalPanelKind={originalPanelKind}
					onChange={onChangePanelKind}
				/>
			)}

			{controls.timePreference && (
				<ConfigField
					label="Time range"
					help={
						timePreference === DashboardtypesTimePreferenceDTO.global_time
							? 'Follows the dashboard time picker.'
							: 'Pinned. This panel ignores the dashboard time picker.'
					}
					{...reset('timePreference')}
				>
					<ConfigSelect
						testId="panel-editor-v2-time-preference"
						value={timePreference}
						items={TIME_PREFERENCE_OPTIONS}
						onChange={(next): void => onChange({ ...value, timePreference: next })}
					/>
				</ConfigField>
			)}

			{controls.fillSpans && (
				<ConfigSwitch
					testId="panel-editor-v2-fill-spans"
					title="Treat missing data as 0"
					description="Empty intervals plot as 0 instead of a gap. Pulls averages down."
					sketch={SWITCH_SKETCHES.fillGaps}
					changed={reset('fillSpans').changed}
					value={value?.fillSpans ?? false}
					onChange={(fillSpans): void => onChange({ ...value, fillSpans })}
				/>
			)}

			{controls.stacking && (
				<ConfigField
					label="Series layout"
					help={BAR_LAYOUT_HELP[barLayout]}
					{...reset('stackedBarChart')}
				>
					<ConfigTiles
						testId="panel-editor-v2-stacked-bar-chart"
						aria-label="Series layout"
						value={barLayout}
						items={BAR_LAYOUT_OPTIONS}
						onChange={(next): void =>
							onChange({ ...value, stackedBarChart: next === BarLayout.STACKED })
						}
					/>
				</ConfigField>
			)}

			{controls.stackMode && (
				<ConfigField
					label="Series layout"
					help={stack && STACK_MODE_HELP[stack]}
					{...reset('stack')}
				>
					<ConfigTiles
						testId="panel-editor-v2-stack-mode"
						aria-label="Series layout"
						value={stack}
						items={STACK_MODE_OPTIONS}
						onChange={(next): void => onChange({ ...value, stack: next })}
					/>
				</ConfigField>
			)}
		</>
	);
}

export default VisualizationSection;
