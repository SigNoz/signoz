import './alertState.styles.scss';

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
	// TODO(shaheer): implement the states UI based on updated designs after the designs are updated

	switch (state) {
		case 'no-data':
		case 'pending':
			icon = (
				<CircleOff
					size={18}
					fill="var(--bg-sienna-400)"
					color="var(--bg-sienna-400)"
				/>
			);
			label = <span style={{ color: 'var(--bg-sienna-400)' }}>No Data</span>;
			break;
		case 'muted':
		case 'disabled':
		case 'inactive':
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
		case 'resolved':
			icon = (
				<CircleCheck
					size={18}
					fill="var(--bg-forest-500)"
					color="var(--bg-ink-400)"
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
