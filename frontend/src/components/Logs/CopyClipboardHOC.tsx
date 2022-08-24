import { Popover } from 'antd';
import React from 'react';
import { useCopyToClipboard } from 'react-use';

interface CopyClipboardHOCProps {
	textToCopy: string;
	children: React.ReactNode;
}
function CopyClipboardHOC({
	textToCopy,
	children,
}: CopyClipboardHOCProps): JSX.Element {
	const [, setCopy] = useCopyToClipboard();

	return (
		<span
			style={{
				margin: 0,
				padding: 0,
				cursor: 'pointer',
			}}
			onClick={(): void => setCopy(textToCopy)}
			onKeyDown={(): void => setCopy(textToCopy)}
			role="button"
			tabIndex={0}
		>
			<Popover
				placement="top"
				content={<span style={{ fontSize: '0.9rem' }}>Copy to clipboard</span>}
			>
				{children}
			</Popover>
		</span>
	);
}

export default CopyClipboardHOC;
