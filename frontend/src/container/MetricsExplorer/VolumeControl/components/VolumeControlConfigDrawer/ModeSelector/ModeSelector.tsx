import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import { RuleMode } from '../../../types';
import styles from './ModeSelector.module.scss';

interface ModeOption {
	mode: RuleMode;
	title: string;
	description: string;
}

const MODE_OPTIONS: ModeOption[] = [
	{
		mode: 'all',
		title: 'Allow all attributes',
		description: 'All attributes stay queryable. Removes any existing rule.',
	},
	{
		mode: 'include',
		title: 'Include',
		description: 'Allowlist: only the selected attributes stay queryable.',
	},
	{
		mode: 'exclude',
		title: 'Exclude',
		description: 'Blocklist: the selected attributes are aggregated away.',
	},
];

interface ModeSelectorProps {
	mode: RuleMode;
	onChange: (mode: RuleMode) => void;
}

function ModeSelector({ mode, onChange }: ModeSelectorProps): JSX.Element {
	return (
		<div
			className={styles.modeOptions}
			data-testid="volume-control-mode-selector"
		>
			{MODE_OPTIONS.map((option) => (
				<button
					type="button"
					key={option.mode}
					className={cx(styles.modeOption, {
						[styles.modeOptionSelected]: mode === option.mode,
					})}
					onClick={(): void => onChange(option.mode)}
					data-testid={`volume-control-mode-${option.mode}`}
				>
					<Typography.Text size="small" weight="semibold">
						{option.title}
					</Typography.Text>
					<Typography.Text size="sm" color="muted">
						{option.description}
					</Typography.Text>
				</button>
			))}
		</div>
	);
}

export default ModeSelector;
