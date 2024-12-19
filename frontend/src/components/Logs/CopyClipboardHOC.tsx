import { Popover } from 'antd';
import { useNotifications } from 'hooks/useNotifications';
import { ReactNode, useCallback, useEffect } from 'react';
import { useCopyToClipboard } from 'react-use';

function CopyClipboardHOC({
	entityKey,
	textToCopy,
	children,
}: CopyClipboardHOCProps): JSX.Element {
	const [value, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();
	useEffect(() => {
		if (value.value) {
			const key = entityKey || '';

			const notificationMessage = `${key} copied to clipboard`;

			notifications.success({
				message: notificationMessage,
			});
		}
	}, [value, notifications, entityKey]);

	const onClick = useCallback((): void => {
		setCopy(textToCopy);
	}, [setCopy, textToCopy]);

	return (
		<span onClick={onClick} role="presentation" tabIndex={-1}>
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
	entityKey: string | undefined;
	textToCopy: string;
	children: ReactNode;
}

export default CopyClipboardHOC;
