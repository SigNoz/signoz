import { Popover } from 'antd';
import { useNotifications } from 'hooks/useNotifications';
import { ReactNode, useCallback, useEffect } from 'react';
import { useCopyToClipboard } from 'react-use';

function CopyClipboardHOC({
	textToCopy,
	children,
}: CopyClipboardHOCProps): JSX.Element {
	const [value, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();
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
	textToCopy: string;
	children: ReactNode;
}

export default CopyClipboardHOC;
