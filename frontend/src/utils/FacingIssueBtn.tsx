import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { defaultTo } from 'lodash-es';
import { HelpCircle } from 'lucide-react';

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
}: FacingIssueBtnProps): JSX.Element {
	const handleFacingIssuesClick = (): void => {
		logEvent(eventName, attributes);

		if (window.Intercom) {
			window.Intercom('showNewMessage', defaultTo(message, ''));
		}
	};

	return (
		<Button
			className={cx('periscope-btn', className)}
			onClick={handleFacingIssuesClick}
			danger
			icon={<HelpCircle size={14} />}
		>
			{buttonText || 'Facing issues sending data to SigNoz?'}
		</Button>
	);
}

FacingIssueBtn.defaultProps = {
	message: '',
	buttonText: '',
	className: '',
};

export default FacingIssueBtn;
