import { CircleOff } from '@signozhq/icons';
import type { RuletypesRuleDTO } from 'api/generated/services/sigNoz.schemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import './StateBanners.styles.scss';

dayjs.extend(relativeTime);

interface DisabledBannerProps {
	rule: RuletypesRuleDTO;
}

function DisabledBanner({ rule }: DisabledBannerProps): JSX.Element {
	const updatedAt = rule.updatedAt ? dayjs(rule.updatedAt) : null;

	return (
		<div className="state-banner state-banner--disabled" role="status">
			<div className="state-banner__icon-disc state-banner__icon-disc--disabled">
				<CircleOff size={18} color="var(--bg-slate-50)" />
			</div>
			<div className="state-banner__body">
				<div className="state-banner__title">
					<span>Rule disabled</span>
					<span className="state-banner__pill state-banner__pill--disabled">
						NOT EVALUATING
					</span>
				</div>
				<div className="state-banner__meta">
					<span>Evaluation paused — no fires will be recorded.</span>
					{updatedAt && (
						<>
							{' · '}
							<span>{updatedAt.fromNow()}</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default DisabledBanner;
