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
	inMsCount: number;
	intervalUnit: IIntervalUnit;
}

function SpanLength(props: SpanLengthProps): JSX.Element {
	const { width, leftOffset, bgColor, intervalUnit, inMsCount } = props;
	const { isDarkMode } = useThemeMode();
	return (
		<SpanWrapper>
			<SpanLine
				isDarkMode={isDarkMode}
				bgColor={bgColor}
				leftOffset={leftOffset}
				width={width}
			/>
			<SpanBorder
				isDarkMode={isDarkMode}
				bgColor={bgColor}
				leftOffset={leftOffset}
				width={width}
			/>
			<SpanText leftOffset={leftOffset}>{`${toFixed(
				resolveTimeFromInterval(inMsCount, intervalUnit),
				2,
			)} ${intervalUnit.name}`}</SpanText>
		</SpanWrapper>
	);
}

export default SpanLength;
