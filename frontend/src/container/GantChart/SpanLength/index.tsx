import {
	IIntervalUnit,
	resolveTimeFromInterval,
} from 'container/TraceDetail/utils';
import useThemeMode from 'hooks/useThemeMode';
import React from 'react';
import { toFixed } from 'utils/toFixed';

import { SpanBorder, SpanLine, SpanText, SpanWrapper } from './styles';
interface SpanLengthProps {
	width: string;
	leftOffset: string;
	bgColor: string;
	id: string;
	inMsCount: number;
	intervalUnit: IIntervalUnit;
}

const SpanLength = (props: SpanLengthProps): JSX.Element => {
	const { width, leftOffset, bgColor, intervalUnit } = props;
	const { isDarkMode } = useThemeMode();
	return (
		<SpanWrapper>
			<SpanLine
				bgColor=""
				width=""
				leftOffset={leftOffset}
				isDarkMode={isDarkMode}
			/>
			<SpanBorder
				isDarkMode={isDarkMode}
				bgColor={bgColor}
				leftOffset={leftOffset}
				width={width}
			/>
			<SpanText leftOffset={leftOffset} isDarkMode={isDarkMode}>{`${toFixed(
				resolveTimeFromInterval(props.inMsCount, intervalUnit),
				2,
			)} ${intervalUnit.name}`}</SpanText>
		</SpanWrapper>
	);
};

export default SpanLength;
