import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff } from '@signozhq/icons';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';

import type { ActiveMute } from './useActiveMutes';

import './StateBanners.styles.scss';

const PLANNED_DOWNTIMES_URL = `${ROUTES.LIST_ALL_ALERT}?tab=PlannedDowntime`;

const formatRemaining = (endTime: string): string | null => {
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
		return `${days}d ${hours}h LEFT`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m LEFT`;
	}
	return `${minutes}m LEFT`;
};

interface MutedBannerProps {
	activeMute: ActiveMute;
	onExpire?: () => void;
}

function MutedBanner({ activeMute, onExpire }: MutedBannerProps): JSX.Element {
	const endTime = activeMute.end;
	const [remaining, setRemaining] = useState(
		endTime ? formatRemaining(endTime) : null,
	);

	useEffect(() => {
		if (!endTime) {
			return;
		}
		const interval = setInterval(() => {
			const next = formatRemaining(endTime);
			setRemaining(next);
			if (next === null) {
				clearInterval(interval);
				onExpire?.();
			}
		}, 60_000);
		return (): void => clearInterval(interval);
	}, [endTime, onExpire]);

	const titleText = useMemo(() => {
		if (!endTime) {
			return 'Notifications muted';
		}
		return `Notifications muted until ${dayjs(endTime).format('MMM D, h:mm A')}`;
	}, [endTime]);

	const reason = activeMute.description || activeMute.name;

	return (
		<div className="state-banner state-banner--muted" role="status">
			<div className="state-banner__icon-disc state-banner__icon-disc--muted">
				<BellOff size={18} color="var(--bg-amber-500)" />
			</div>
			<div className="state-banner__body">
				<div className="state-banner__title">
					<span>{titleText}</span>
					{remaining && (
						<span className="state-banner__pill state-banner__pill--muted">
							{remaining}
						</span>
					)}
				</div>
				<div className="state-banner__meta">
					<span>Rule is still evaluating — alerts will appear in History</span>
					{reason && (
						<>
							{' · '}
							<span>
								Name: <strong>{reason}</strong>
							</span>
						</>
					)}
					{' · '}
					<Link to={PLANNED_DOWNTIMES_URL} className="state-banner__link">
						Manage in Planned Downtimes
					</Link>
				</div>
			</div>
		</div>
	);
}

export default MutedBanner;
