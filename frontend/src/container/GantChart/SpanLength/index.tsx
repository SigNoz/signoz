import { Tooltip, Typography } from 'antd';
import React from 'react';
import { SpanBorder, SpanText, SpanWrapper } from './styles';

interface SpanLengthProps {
	width: string;
	leftOffset: string;
	bgColor: string;
	toolTipText: string;
	id: string;
	inMsCount: number;
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
			<SpanText leftOffset={leftOffset}>{`${props.inMsCount} ms`}</SpanText>
		</SpanWrapper>
	);
};

export default SpanLength;
