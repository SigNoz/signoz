import { ReactNode } from 'react';

import { StyledAlert } from './styles';

interface MessageTipProps {
	show?: boolean;
	message: ReactNode | string;
	action: ReactNode | undefined;
}

function MessageTip({
	show,
	message,
	action,
}: MessageTipProps): JSX.Element | null {
	if (!show) return null;

	return (
		<StyledAlert showIcon description={message} type="info" action={action} />
	);
}

MessageTip.defaultProps = {
	show: false,
};

export default MessageTip;
