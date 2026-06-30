import { Typography } from '@signozhq/ui/typography';
import {
	DashboardtypesFillModeDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';
import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';
import { SegmentIcon } from '../../controls/segmentIcons';
import type { SectionEditorContext } from '../../sectionContext';
import DisconnectValuesField from './DisconnectValuesField';

import styles from './ChartAppearanceSection.module.scss';

const LINE_STYLE_OPTIONS = [
	{
		value: DashboardtypesLineStyleDTO.solid,
		label: 'Solid',
		icon: 'solid-line' as const,
	},
	{
		value: DashboardtypesLineStyleDTO.dashed,
		label: 'Dashed',
		icon: 'dashed-line' as const,
	},
];

const LINE_INTERPOLATION_OPTIONS = [
	{
		value: DashboardtypesLineInterpolationDTO.linear,
		label: 'Linear',
		icon: <SegmentIcon name="interp-linear" />,
	},
	{
		value: DashboardtypesLineInterpolationDTO.spline,
		label: 'Spline',
		icon: <SegmentIcon name="interp-spline" />,
	},
	{
		value: DashboardtypesLineInterpolationDTO.step_before,
		label: 'Step before',
		icon: <SegmentIcon name="interp-step-before" />,
	},
	{
		value: DashboardtypesLineInterpolationDTO.step_after,
		label: 'Step after',
		icon: <SegmentIcon name="interp-step-after" />,
	},
];

const FILL_MODE_OPTIONS = [
	{
		value: DashboardtypesFillModeDTO.none,
		label: 'None',
		icon: 'fill-none' as const,
	},
	{
		value: DashboardtypesFillModeDTO.solid,
		label: 'Solid',
		icon: 'fill-solid' as const,
	},
	{
		value: DashboardtypesFillModeDTO.gradient,
		label: 'Gradient',
		icon: 'fill-gradient' as const,
	},
];

/**
 * Edits the `chartAppearance` slice of a TimeSeries panel spec: line style /
 * interpolation, fill mode, point markers, and the connect-null-gaps threshold. Each
 * control is gated by its `controls` flag.
 */
function ChartAppearanceSection({
	value,
	controls,
	onChange,
	stepInterval,
}: SectionEditorProps<SectionKind.ChartAppearance> &
	Pick<SectionEditorContext, 'stepInterval'>): JSX.Element {
	return (
		<>
			{controls.lineStyle && (
				<div className={styles.field}>
					<Typography.Text>Line style</Typography.Text>
					<ConfigSegmented
						testId="panel-editor-v2-line-style"
						value={value?.lineStyle}
						items={LINE_STYLE_OPTIONS}
						onChange={(next): void =>
							onChange({ ...value, lineStyle: next as DashboardtypesLineStyleDTO })
						}
					/>
				</div>
			)}

			{controls.lineInterpolation && (
				<div className={styles.field}>
					<Typography.Text>Line interpolation</Typography.Text>
					<ConfigSelect
						testId="panel-editor-v2-line-interpolation"
						placeholder="Select interpolation…"
						value={value?.lineInterpolation}
						items={LINE_INTERPOLATION_OPTIONS}
						onChange={(next): void =>
							onChange({
								...value,
								lineInterpolation: next,
							})
						}
					/>
				</div>
			)}

			{controls.fillMode && (
				<div className={styles.field}>
					<Typography.Text>Fill mode</Typography.Text>
					<ConfigSegmented
						testId="panel-editor-v2-fill-mode"
						value={value?.fillMode}
						items={FILL_MODE_OPTIONS}
						onChange={(next): void =>
							onChange({ ...value, fillMode: next as DashboardtypesFillModeDTO })
						}
					/>
				</div>
			)}

			{controls.showPoints && (
				<ConfigSwitch
					testId="panel-editor-v2-show-points"
					title="Show points"
					description="Display individual data points on the chart"
					value={value?.showPoints ?? false}
					onChange={(checked): void => onChange({ ...value, showPoints: checked })}
				/>
			)}

			{controls.spanGaps && (
				<DisconnectValuesField
					testId="panel-editor-v2-span-gaps"
					value={value?.spanGaps}
					stepInterval={stepInterval}
					onChange={(spanGaps): void => onChange({ ...value, spanGaps })}
				/>
			)}
		</>
	);
}

export default ChartAppearanceSection;
