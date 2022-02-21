import React from 'react';
import { SpanBorder, SpanWrapper } from './styles';

interface SpanLengthProps {
	percentage: string;
	leftOffset: string;
}
const SpanLength = (props: SpanLengthProps): JSX.Element => {
	const { percentage, leftOffset } = props;
	return (
		<SpanWrapper>
			<SpanBorder leftOffset={leftOffset} percentage={percentage} />
		</SpanWrapper>
	);
};

export default SpanLength;
