import type { ChangeEvent } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import { DashboardtypesHeatmapYScaleDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';
import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';

import styles from './AxesSection.module.scss';

type SoftBound = 'softMin' | 'softMax';

const SCALE_OPTIONS = [
	{ value: 'linear', label: 'Linear', icon: 'scale-linear' as const },
	{ value: 'log', label: 'Log', icon: 'scale-log' as const },
];

// How the bucket axis distributes its row heights. Auto is the only one that reads
// the boundaries; the other three state what to do with them.
const Y_SCALE_OPTIONS = [
	{
		value: DashboardtypesHeatmapYScaleDTO.auto,
		label: 'Auto',
		tooltip:
			'Log when every bucket bound is positive, symmetric log when they cross zero',
	},
	{
		value: DashboardtypesHeatmapYScaleDTO.linear,
		label: 'Linear',
		tooltip: 'Row heights proportional to the bucket range',
	},
	{
		value: DashboardtypesHeatmapYScaleDTO.log,
		label: 'Log',
		tooltip:
			'Log-proportional row heights; a zero bucket sits one bucket below the smallest positive bound',
	},
	{
		value: DashboardtypesHeatmapYScaleDTO.symlog,
		label: 'Symmetric log',
		tooltip:
			'Linear within the smallest non-zero bound, logarithmic beyond, mirrored across zero',
	},
];

/**
 * Edits the `axes` slice of a panel spec: soft Y-axis min/max bounds, the
 * linear/logarithmic scale toggle, and the heatmap's bucket-axis distribution.
 * Each control is gated by its `controls` flag.
 */
function AxesSection({
	value,
	controls,
	onChange,
}: SectionEditorProps<SectionKind.Axes>): JSX.Element {
	// An empty field clears the bound (null); otherwise parse to a number, ignoring
	// transient non-numeric input (e.g. a lone "-") by leaving the bound unset.
	const handleBound =
		(bound: SoftBound) =>
		(e: ChangeEvent<HTMLInputElement>): void => {
			const raw = e.target.value;
			const next = raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw);
			onChange({ ...value, [bound]: next });
		};

	return (
		<>
			{controls.minMax && (
				<div className={styles.bounds}>
					<div className={styles.field}>
						<Typography.Text>Soft min</Typography.Text>
						<Input
							data-testid="panel-editor-v2-soft-min"
							type="number"
							placeholder="Auto"
							value={value?.softMin ?? ''}
							onChange={handleBound('softMin')}
						/>
					</div>
					<div className={styles.field}>
						<Typography.Text>Soft max</Typography.Text>
						<Input
							data-testid="panel-editor-v2-soft-max"
							type="number"
							placeholder="Auto"
							value={value?.softMax ?? ''}
							onChange={handleBound('softMax')}
						/>
					</div>
				</div>
			)}

			{controls.logScale && (
				<div className={styles.field}>
					<Typography.Text>Y-axis scale</Typography.Text>
					<ConfigSegmented
						testId="panel-editor-v2-log-scale"
						value={value?.isLogScale ? 'log' : 'linear'}
						items={SCALE_OPTIONS}
						onChange={(next): void =>
							onChange({ ...value, isLogScale: next === 'log' })
						}
					/>
				</div>
			)}

			{controls.yScale && (
				<div className={styles.field}>
					<Typography.Text>Y-axis scale</Typography.Text>
					<ConfigSelect
						testId="panel-editor-v2-y-scale"
						placeholder="Select scale…"
						value={value?.yScale}
						items={Y_SCALE_OPTIONS}
						onChange={(next): void => onChange({ ...value, yScale: next })}
					/>
				</div>
			)}
		</>
	);
}

export default AxesSection;
