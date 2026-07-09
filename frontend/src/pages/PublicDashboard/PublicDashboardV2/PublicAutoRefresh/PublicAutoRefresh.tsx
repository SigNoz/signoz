import { Check, ChevronDown, RefreshCw } from '@signozhq/icons';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Typography } from '@signozhq/ui/typography';
import { Button, Popover } from 'antd';
import { refreshIntervalOptions } from 'container/TopNav/AutoRefreshV2/constants';
import { popupContainer } from 'utils/selectPopupContainer';

import styles from './PublicAutoRefresh.module.scss';

// Reuse the app-wide auto-refresh popover styling (menu, checkbox, interval buttons).
import 'container/TopNav/AutoRefreshV2/AutoRefreshV2.styles.scss';

interface PublicAutoRefreshProps {
	/** Auto-refresh on/off (the "Auto Refresh" checkbox). */
	enabled: boolean;
	/** Selected interval key, e.g. `30s`. */
	interval: string;
	/** Paused (e.g. a fixed custom range) — greys the menu controls. */
	disabled?: boolean;
	onToggle: (enabled: boolean) => void;
	onIntervalChange: (key: string) => void;
	/** Manual "refresh now". */
	onRefresh: () => void;
}

/**
 * Read-only public dashboard's refresh + auto-refresh control. Mirrors the app's
 * `DateTimeSelectionV2` refresh cluster (grouped refresh button + auto-refresh popover) but is
 * fully prop-driven — the public viewer manages its own time window, not Redux global time.
 */
function PublicAutoRefresh({
	enabled,
	interval,
	disabled = false,
	onToggle,
	onIntervalChange,
	onRefresh,
}: PublicAutoRefreshProps): JSX.Element {
	return (
		<div className={styles.refreshActions}>
			<div className={styles.refreshButton}>
				<Button
					icon={<RefreshCw size={16} />}
					onClick={onRefresh}
					title="Refresh"
					data-testid="public-dashboard-refresh"
				/>
			</div>
			<Popover
				getPopupContainer={popupContainer}
				placement="bottomRight"
				rootClassName="auto-refresh-root"
				trigger={['click']}
				content={
					<div className="auto-refresh-menu">
						<Checkbox
							onChange={(value): void => onToggle(value === true)}
							value={enabled}
							disabled={disabled}
							className="auto-refresh-checkbox"
						>
							Auto Refresh
						</Checkbox>
						<Typography.Text disabled={disabled} className="refresh-interval-text">
							Refresh Interval
						</Typography.Text>
						{refreshIntervalOptions
							.filter((option) => option.label !== 'off')
							.map((option) => (
								<Button
									type="text"
									className="refresh-interval-btns"
									key={option.label + option.value}
									onClick={(): void => onIntervalChange(option.key)}
								>
									{option.label}
									{option.key === interval && enabled && <Check size={14} />}
								</Button>
							))}
					</div>
				}
			>
				<Button
					title="Set auto refresh"
					data-testid="public-dashboard-auto-refresh"
				>
					<ChevronDown size={14} />
				</Button>
			</Popover>
		</div>
	);
}

export default PublicAutoRefresh;
