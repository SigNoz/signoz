import { RefreshCw } from '@signozhq/icons';
import { SelectSimple } from '@signozhq/ui/select';
import { refreshIntervalOptions } from 'container/TopNav/AutoRefreshV2/constants';

import styles from './AutoRefresh.module.scss';

const REFRESH_ITEMS = refreshIntervalOptions.map((option) => ({
	value: option.key,
	label: option.key === 'off' ? 'Off' : option.label,
}));

interface AutoRefreshProps {
	value: string;
	disabled?: boolean;
	onChange: (value: string) => void;
}

// Interval selector for the public dashboard. Self-contained (no Redux global
// time); the container advances its own time window on each tick.
function AutoRefresh({
	value,
	disabled = false,
	onChange,
}: AutoRefreshProps): JSX.Element {
	return (
		<div className={styles.autoRefresh}>
			<RefreshCw size={14} className={styles.icon} />
			<SelectSimple
				className={styles.select}
				testId="public-dashboard-auto-refresh"
				items={REFRESH_ITEMS}
				value={value}
				disabled={disabled}
				withPortal={false}
				onChange={(next): void => onChange(next as string)}
			/>
		</div>
	);
}

export default AutoRefresh;
