import { QuestionCircleFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import React from 'react';

const TextToolTip = ({ text, url }: TextToolTipProps) => (
	<Tooltip
		overlay={() => {
			return (
				<div>
					{`${text} `}
					<a href={url} target={'_blank'}>
						here
					</a>
				</div>
			);
		}}
	>
		<QuestionCircleFilled style={{ fontSize: '1.3125rem' }} />
	</Tooltip>
);

interface TextToolTipProps {
	url: string;
	text: string;
}

export default TextToolTip;
