import type { ChangeEvent } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import type { SectionEditorProps } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';

import styles from './AxesSection.module.scss';

type SoftBound = 'softMin' | 'softMax';

const SCALE_OPTIONS = [
	{ value: 'linear', label: 'Linear', icon: 'scale-linear' as const },
	{ value: 'log', label: 'Log', icon: 'scale-log' as const },
];

/**
 * Edits the `axes` slice of a panel spec: soft Y-axis min/max bounds and the
 * linear/logarithmic scale toggle. Each control is gated by its `controls` flag.
 */
function AxesSection({
	value,
	controls,
	onChange,
}: SectionEditorProps<'axes'>): JSX.Element {
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
		</>
	);
}

export default AxesSection;
