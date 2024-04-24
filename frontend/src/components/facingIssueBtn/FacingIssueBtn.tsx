import './FacingIssueBtn.style.scss';

import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { FeatureKeys } from 'constants/features';
import useFeatureFlags from 'hooks/useFeatureFlag';
import { defaultTo } from 'lodash-es';
import { HelpCircle } from 'lucide-react';
import { isCloudUser } from 'utils/app';

export interface FacingIssueBtnProps {
	eventName: string;
	attributes: Record<string, unknown>;
	message?: string;
	buttonText?: string;
	className?: string;
}

function FacingIssueBtn({
	attributes,
	eventName,
	message = '',
	buttonText = '',
	className = '',
}: FacingIssueBtnProps): JSX.Element | null {
	const handleFacingIssuesClick = (): void => {
		logEvent(eventName, attributes);

		if (window.Intercom) {
			window.Intercom('showNewMessage', defaultTo(message, ''));
		}
	};

	const isChatSupportEnabled = useFeatureFlags(FeatureKeys.CHAT_SUPPORT)?.active;
	const isCloudUserVal = isCloudUser();

	return isCloudUserVal && isChatSupportEnabled ? ( // Note: we would need to move this condition to license based in future
		<div className="facing-issue-button">
			<Button
				className={cx('periscope-btn', 'facing-issue-button', className)}
				onClick={handleFacingIssuesClick}
				icon={<HelpCircle size={14} />}
			>
				{buttonText || 'Facing issues?'}
			</Button>
		</div>
	) : null;
}

FacingIssueBtn.defaultProps = {
	message: '',
	buttonText: '',
	className: '',
};

export default FacingIssueBtn;
