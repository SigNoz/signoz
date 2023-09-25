import { Popover } from 'antd';
import copy from 'copy-to-clipboard';
import { useNotifications } from 'hooks/useNotifications';
import { ReactNode, useCallback } from 'react';

function CopyClipboardHOC({
	textToCopy,
	children,
}: CopyClipboardHOCProps): JSX.Element {
	const { notifications } = useNotifications();

	const handleCopy = useCallback(() => {
		try {
			copy(textToCopy);
			notifications.success({
				message: 'Copied to clipboard',
			});
		} catch (e) {
			//
		}
	}, [textToCopy, notifications]);

	return (
		<span onClick={handleCopy} role="presentation" tabIndex={-1}>
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
	children: ReactNode;
}

export default CopyClipboardHOC;
