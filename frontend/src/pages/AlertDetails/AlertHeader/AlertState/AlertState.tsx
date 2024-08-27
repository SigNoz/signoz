import './AlertState.styles.scss';

import { useIsDarkMode } from 'hooks/useDarkMode';
import { BellOff, CircleCheck, CircleOff, Flame } from 'lucide-react';

type AlertStateProps = {
	state: string;
	showLabel?: boolean;
};

export default function AlertState({
	state,
	showLabel,
}: AlertStateProps): JSX.Element {
	let icon;
	let label;
	const isDarkMode = useIsDarkMode();
	switch (state) {
		case 'no-data':
			icon = (
				<CircleOff
					size={18}
					fill="var(--bg-sienna-400)"
					color="var(--bg-sienna-400)"
				/>
			);
			label = <span style={{ color: 'var(--bg-sienna-400)' }}>No Data</span>;
			break;

		case 'disabled':
			icon = (
				<BellOff
					size={18}
					fill="var(--bg-vanilla-400)"
					color="var(--bg-vanilla-400)"
				/>
			);
			label = <span style={{ color: 'var(--bg-vanilla-400)' }}>Muted</span>;
			break;
		case 'firing':
			icon = (
				<Flame size={18} fill="var(--bg-cherry-500)" color="var(--bg-cherry-500)" />
			);
			label = <span style={{ color: 'var(--bg-cherry-500)' }}>Firing</span>;
			break;

		case 'normal':
			icon = (
				<CircleCheck
					size={18}
					fill="var(--bg-forest-500)"
					color={isDarkMode ? 'var(--bg-ink-400)' : 'var(--bg-vanilla-100)'}
				/>
			);
			label = <span style={{ color: 'var(--bg-forest-500)' }}>Resolved</span>;
			break;

		default:
			icon = <div />;
	}

	return (
		<div className="alert-state">
			{icon} {showLabel && <div className="alert-state__label">{label}</div>}
		</div>
	);
}

AlertState.defaultProps = {
	showLabel: false,
};
