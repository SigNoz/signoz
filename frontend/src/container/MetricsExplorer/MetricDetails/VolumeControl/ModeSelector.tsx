import { Typography } from '@signozhq/ui/typography';

import { RuleMode } from './types';
import styles from './VolumeControlConfig.module.scss';

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
		title: 'Include attributes',
		description: 'Allowlist: only the selected attributes stay queryable.',
	},
	{
		mode: 'exclude',
		title: 'Exclude attributes',
		description: 'Blocklist: the selected attributes are aggregated away.',
	},
];

interface ModeSelectorProps {
	mode: RuleMode;
	onChange: (mode: RuleMode) => void;
}

function ModeSelector({ mode, onChange }: ModeSelectorProps): JSX.Element {
	return (
		<div className={styles.modeCards} data-testid="volume-control-mode-selector">
			{MODE_OPTIONS.map((option) => (
				<button
					type="button"
					key={option.mode}
					className={`${styles.modeCard} ${
						mode === option.mode ? styles.modeCardActive : ''
					}`}
					onClick={(): void => onChange(option.mode)}
					data-testid={`volume-control-mode-${option.mode}`}
				>
					<Typography.Text className={styles.modeTitle}>
						{option.title}
					</Typography.Text>
					<Typography.Text className={styles.modeDesc}>
						{option.description}
					</Typography.Text>
				</button>
			))}
		</div>
	);
}

export default ModeSelector;
