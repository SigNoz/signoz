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
				isdarkmode={isDarkMode}
				bgColor={bgColor}
				leftoffset={leftOffset}
				width={width}
			/>
			<SpanBorder
				isdarkmode={isDarkMode}
				bgColor={bgColor}
				leftoffset={leftOffset}
				width={width}
			/>
			<SpanText isDarkMode={isDarkMode} leftoffset={leftOffset}>{`${toFixed(
				resolveTimeFromInterval(inMsCount, intervalUnit),
				2,
			)} ${intervalUnit.name}`}</SpanText>
		</SpanWrapper>
	);
}

export default SpanLength;
