import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff } from '@signozhq/icons';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';

import type { ActiveMute } from './useActiveMute';

import './StateBanners.styles.scss';

const PLANNED_DOWNTIMES_URL = `${ROUTES.LIST_ALL_ALERT}?tab=Configuration&subTab=planned-downtime`;

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
		return `${days}d ${hours}h LEFT`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m LEFT`;
	}
	return `${minutes}m LEFT`;
};

const isIndefinite = (endTime: string | undefined): boolean => {
	if (!endTime) {
		return true;
	}
	// If end is more than 5 years away, treat as indefinite (matches "Forever" sentinel).
	return dayjs(endTime).diff(dayjs(), 'year') >= 5;
};

interface MutedBannerProps {
	activeMute: ActiveMute;
}

function MutedBanner({ activeMute }: MutedBannerProps): JSX.Element {
	const endTime = activeMute.effectiveEndTime;
	const indefinite = isIndefinite(endTime);
	const [remaining, setRemaining] = useState<string | null>(
		indefinite ? null : formatRemaining(endTime),
	);

	useEffect(() => {
		if (indefinite) {
			return undefined;
		}
		const interval = setInterval(() => {
			setRemaining(formatRemaining(endTime));
		}, 60_000);
		return (): void => clearInterval(interval);
	}, [endTime, indefinite]);

	const titleText = useMemo(() => {
		if (indefinite) {
			return 'Notifications muted indefinitely';
		}
		if (!endTime) {
			return 'Notifications muted';
		}
		return `Notifications muted until ${dayjs(endTime).format('MMM D, h:mm A')}`;
	}, [endTime, indefinite]);

	const reason = activeMute.description || activeMute.name;

	return (
		<div className="state-banner state-banner--muted" role="status">
			<div className="state-banner__icon-disc state-banner__icon-disc--muted">
				<BellOff size={18} color="var(--bg-amber-500)" />
			</div>
			<div className="state-banner__body">
				<div className="state-banner__title">
					<span>{titleText}</span>
					{!indefinite && remaining && (
						<span className="state-banner__pill state-banner__pill--muted">
							{remaining}
						</span>
					)}
				</div>
				<div className="state-banner__meta">
					<span>
						Rule is still evaluating — fires will appear in <strong>History</strong>.
					</span>
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
