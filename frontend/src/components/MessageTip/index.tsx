import React from 'react';

import { StyledAlert } from './styles';

interface MessageTipProps {
	show?: boolean;
	message: React.ReactNode | string;
	action: React.ReactNode | undefined;
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
