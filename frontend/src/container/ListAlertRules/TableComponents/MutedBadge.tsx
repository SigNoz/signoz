import { BellOff } from '@signozhq/icons';
import dayjs from 'dayjs';

import './MutedBadge.styles.scss';

const formatRemaining = (endTime: string | undefined): string | null => {
	if (!endTime) {
		return null;
	}
	const end = dayjs(endTime);
	const now = dayjs();
	const diffMs = end.diff(now);
	if (diffMs <= 0) {
		return null;
	}
	const totalMinutes = Math.floor(diffMs / 60000);
	const days = Math.floor(totalMinutes / (60 * 24));
	const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
	const minutes = totalMinutes % 60;
	if (days > 0) {
		return `${days}d ${hours}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
};

interface MutedBadgeProps {
	muteEndTime?: string;
}

function MutedBadge({ muteEndTime }: MutedBadgeProps): JSX.Element | null {
	const remaining = formatRemaining(muteEndTime);
	return (
		<span className="alert-list-muted-badge">
			<BellOff size={10} />
			<span>MUTED{remaining ? ` · ${remaining}` : ''}</span>
		</span>
	);
}

export default MutedBadge;
