import { Button, Popover, Tooltip } from 'antd';
import React from 'react';
import { useCopyToClipboard } from 'react-use';

function CopyClipboardHOC({ textToCopy, children }) {
	const [_state, setCopy] = useCopyToClipboard();

	return (
		<Button
			size="small"
			type="text"
			style={{
				margin: 0,
				padding: 0,
			}}
			onClick={() => setCopy(textToCopy)}
		>
			<Popover
				placement="top"
				content={<span style={{ fontSize: '0.7rem' }}>Copy to clipboard</span>}
			>
				{children}
			</Popover>
		</Button>
	);
}

export default CopyClipboardHOC;
