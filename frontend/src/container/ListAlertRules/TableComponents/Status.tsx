import { BellOff } from '@signozhq/icons';
import { Tag } from 'antd';
import type { RuletypesRuleDTO } from 'api/generated/services/sigNoz.schemas';
import dayjs from 'dayjs';

import './Status.styles.scss';

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

interface StatusProps {
	status: RuletypesRuleDTO['state'];
	muteEndTime?: string;
}

function Status({ status, muteEndTime }: StatusProps): JSX.Element {
	if (status !== 'disabled' && muteEndTime !== undefined) {
		const remaining = formatRemaining(muteEndTime);
		return (
			<span className="alert-list-muted-badge">
				<BellOff size={10} />
				<span>MUTED{remaining ? ` · ${remaining}` : ''}</span>
			</span>
		);
	}

	switch (status) {
		case 'inactive': {
			return <Tag color="green">OK</Tag>;
		}

		case 'pending': {
			return <Tag color="orange">Pending</Tag>;
		}

		case 'firing': {
			return <Tag color="red">Firing</Tag>;
		}

		case 'disabled': {
			return <Tag>Disabled</Tag>;
		}

		default: {
			return <Tag color="default">Unknown</Tag>;
		}
	}
}

export default Status;
