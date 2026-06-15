import type { ChangeEvent } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import {
	DashboardtypesFillModeDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { SectionEditorProps } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';
import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';

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
		icon: 'interp-linear' as const,
	},
	{
		value: DashboardtypesLineInterpolationDTO.spline,
		label: 'Spline',
		icon: 'interp-spline' as const,
	},
	{
		value: DashboardtypesLineInterpolationDTO.step_before,
		label: 'Step before',
		icon: 'interp-step-before' as const,
	},
	{
		value: DashboardtypesLineInterpolationDTO.step_after,
		label: 'Step after',
		icon: 'interp-step-after' as const,
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
}: SectionEditorProps<'chartAppearance'>): JSX.Element {
	// `spanGaps.fillLessThan` is a stringified seconds threshold: empty means "connect
	// every gap" (the chart default), a number means "only bridge gaps shorter than this".
	const handleSpanGaps = (e: ChangeEvent<HTMLInputElement>): void => {
		const raw = e.target.value;
		onChange({
			...value,
			spanGaps: raw === '' ? undefined : { ...value?.spanGaps, fillLessThan: raw },
		});
	};
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
								lineInterpolation: next as DashboardtypesLineInterpolationDTO,
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
				<div className={styles.field}>
					<Typography.Text>Connect gaps shorter than (s)</Typography.Text>
					<Input
						data-testid="panel-editor-v2-span-gaps"
						type="number"
						placeholder="All gaps"
						value={value?.spanGaps?.fillLessThan ?? ''}
						onChange={handleSpanGaps}
					/>
				</div>
			)}
		</>
	);
}

export default ChartAppearanceSection;
