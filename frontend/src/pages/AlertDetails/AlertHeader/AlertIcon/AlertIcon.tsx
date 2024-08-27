import { BellOff, CircleCheck, CircleOff, Flame } from 'lucide-react';

export default function AlertIcon({ state }: { state: string }): JSX.Element {
	let icon;
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
			break;
		case 'firing':
			icon = (
				<Flame size={18} fill="var(--bg-cherry-500)" color="var(--bg-cherry-500)" />
			);
			break;
		case 'resolved':
			icon = (
				<CircleCheck
					size={18}
					fill="var(--bg-forest-500)"
					color="var(--bg-ink-400)"
				/>
			);
			break;

		default:
			icon = <div />;
	}

	return <div className="alert-icon">{icon}</div>;
}
