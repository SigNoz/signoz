import { Button, Popover, Tooltip } from 'antd';
import React from 'react';
import { useCopyToClipboard } from 'react-use';

function CopyClipboardHOC({ textToCopy, children }) {
	const [_state, setCopy] = useCopyToClipboard();

	return (
		<span
			style={{
				margin: 0,
				padding: 0,
				cursor: 'pointer'
			}}
			onClick={() => setCopy(textToCopy)}
			role="button"
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
