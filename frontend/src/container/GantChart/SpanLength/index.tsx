import { Tooltip, Typography } from 'antd';
import React from 'react';
import { SpanBorder, SpanText, SpanWrapper, SpanLine } from './styles';

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
			<SpanLine leftOffset={leftOffset} />
			<SpanBorder bgColor={bgColor} leftOffset={leftOffset} width={width} />
			<SpanText leftOffset={leftOffset}>{`${props.inMsCount} ms`}</SpanText>
		</SpanWrapper>
	);
};

export default SpanLength;
