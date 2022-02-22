import { Tooltip } from 'antd';
import React from 'react';
import { SpanBorder, SpanWrapper } from './styles';

interface SpanLengthProps {
	width: string;
	leftOffset: string;
	bgColor: string;
	toolTipText: string;
	id: string;
}
const SpanLength = (props: SpanLengthProps): JSX.Element => {
	const { width, leftOffset, bgColor } = props;
	return (
		<SpanWrapper>
			<Tooltip
				placement="top"
				overlayStyle={{
					whiteSpace: 'pre-line',
					fontSize: '0.7rem',
				}}
				title={props.toolTipText}
				key={props.id}
			>
				<SpanBorder bgColor={bgColor} leftOffset={leftOffset} width={width} />
			</Tooltip>
		</SpanWrapper>
	);
};

export default SpanLength;
