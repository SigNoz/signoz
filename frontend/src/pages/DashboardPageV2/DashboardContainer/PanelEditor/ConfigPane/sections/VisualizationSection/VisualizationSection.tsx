import { Typography } from '@signozhq/ui/typography';
import { DashboardtypesTimePreferenceDTO } from 'api/generated/services/sigNoz.schemas';
import type { SectionEditorProps } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';
import { TIME_PREFERENCE_OPTIONS } from './timePreferenceOptions';

import styles from './VisualizationSection.module.scss';

/**
 * Edits the `visualization` slice: the per-panel time preference (all kinds), bar
 * stacking (`stackedBarChart`, Bar only), and gap filling (`fillSpans`, TimeSeries
 * only). Each control is gated by its `controls` flag, so a kind only renders — and only
 * writes — the visualization fields its spec actually supports.
 */
function VisualizationSection({
	value,
	controls,
	onChange,
}: SectionEditorProps<'visualization'>): JSX.Element {
	return (
		<>
			{controls.timePreference && (
				<div className={styles.field}>
					<Typography.Text>Panel time preference</Typography.Text>
					<ConfigSelect
						testId="panel-editor-v2-time-preference"
						placeholder="Select time scope…"
						value={value?.timePreference}
						items={TIME_PREFERENCE_OPTIONS}
						onChange={(next): void =>
							onChange({
								...value,
								timePreference: next as DashboardtypesTimePreferenceDTO,
							})
						}
					/>
				</div>
			)}

			{controls.stacking && (
				<ConfigSwitch
					testId="panel-editor-v2-stacked-bar-chart"
					title="Stack series"
					description="Stack bars from all series on top of each other"
					value={value?.stackedBarChart ?? false}
					onChange={(checked): void =>
						onChange({ ...value, stackedBarChart: checked })
					}
				/>
			)}

			{controls.fillSpans && (
				<ConfigSwitch
					testId="panel-editor-v2-fill-spans"
					title="Fill gaps"
					description="Fill gaps in data with 0 for continuity"
					value={value?.fillSpans ?? false}
					onChange={(checked): void => onChange({ ...value, fillSpans: checked })}
				/>
			)}
		</>
	);
}

export default VisualizationSection;
