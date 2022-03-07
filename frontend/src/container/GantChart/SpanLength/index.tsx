import React from 'react';
import { SpanBorder, SpanText, SpanWrapper, SpanLine } from './styles';
import { toFixed } from 'utils/toFixed';
import {
	IIntervalUnit,
	resolveTimeFromInterval,
} from 'container/TraceDetail/utils';
import useThemeMode from 'hooks/useThemeMode';
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
			<SpanLine leftoffset={leftOffset} isdarkmode={isDarkMode} />
			<SpanBorder bgColor={bgColor} leftoffset={leftOffset} width={width} />
			<SpanText leftoffset={leftOffset} $isdarkmode={isDarkMode}>{`${toFixed(
				resolveTimeFromInterval(props.inMsCount, intervalUnit),
				2,
			)} ${intervalUnit.name}`}</SpanText>
		</SpanWrapper>
	);
};

export default SpanLength;
