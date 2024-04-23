import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import { defaultTo } from 'lodash-es';
import { HelpCircle } from 'lucide-react';

export interface FacingIssueBtnProps {
	eventName: string;
	attributes: Record<string, unknown>;
	message?: string;
	buttonText?: string;
}

function FacingIssueBtn({
	attributes,
	eventName,
	message = '',
	buttonText = '',
}: FacingIssueBtnProps): JSX.Element {
	const handleFacingIssuesClick = (): void => {
		logEvent(eventName, attributes);

		if (window.Intercom) {
			window.Intercom('showNewMessage', defaultTo(message, ''));
		}
	};

	return (
		<Button
			className="periscope-btn"
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
};

export default FacingIssueBtn;
