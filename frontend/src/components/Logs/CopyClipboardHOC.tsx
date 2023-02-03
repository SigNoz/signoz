import { notification, Popover } from 'antd';
import React, { useCallback, useEffect } from 'react';
import { useCopyToClipboard } from 'react-use';

function CopyClipboardHOC({
	textToCopy,
	children,
}: CopyClipboardHOCProps): JSX.Element {
	const [value, setCopy] = useCopyToClipboard();
	const [notifications, NotificationElement] = notification.useNotification();
	useEffect(() => {
		if (value.value) {
			notifications.success({
				message: 'Copied to clipboard',
			});
		}
	}, [value, notifications]);

	const onClick = useCallback((): void => {
		setCopy(textToCopy);
	}, [setCopy, textToCopy]);

	return (
		<span onClick={onClick} onKeyDown={onClick} role="button" tabIndex={0}>
			{NotificationElement}
			<Popover
				placement="top"
				content={<span style={{ fontSize: '0.9rem' }}>Copy to clipboard</span>}
			>
				{children}
			</Popover>
		</span>
	);
}

interface CopyClipboardHOCProps {
	textToCopy: string;
	children: React.ReactNode;
}

export default CopyClipboardHOC;
