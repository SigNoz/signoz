import { QuestionCircleFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import React from 'react';

function TextToolTip({ text, url }: TextToolTipProps) {
	return (
		<Tooltip
			overlay={() => {
				return (
					<div>
						{`${text} `}
						<a href={url} rel="noopener noreferrer" target="_blank">
							here
						</a>
					</div>
				);
			}}
		>
			<QuestionCircleFilled style={{ fontSize: '1.3125rem' }} />
		</Tooltip>
	);
}

interface TextToolTipProps {
	url: string;
	text: string;
}

export default TextToolTip;
