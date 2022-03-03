import { Tooltip, Typography } from 'antd';
import React from 'react';
import { SpanBorder, SpanText, SpanWrapper, SpanLine } from './styles';
import { toFixed } from 'utils/toFixed'
import { IIntervalUnit, resolveTimeFromInterval } from 'container/TraceDetail/utils';
import useThemeMode from 'hooks/useThemeMode';
interface SpanLengthProps {
	width: string;
	leftOffset: string;
	bgColor: string;
	toolTipText: string;
	id: string;
	inMsCount: number;
	intervalUnit: IIntervalUnit;
}

const SpanLength = (props: SpanLengthProps): JSX.Element => {
	const { width, leftOffset, bgColor, intervalUnit } = props;
	const { isDarkMode } = useThemeMode()
	return (
		<SpanWrapper>
			<SpanLine leftOffset={leftOffset} isDarkMode={isDarkMode} />
			<SpanBorder bgColor={bgColor} leftOffset={leftOffset} width={width} />
			<SpanText leftOffset={leftOffset} isDarkMode={isDarkMode}>{`${toFixed(resolveTimeFromInterval(props.inMsCount, intervalUnit), 2)} ${intervalUnit.name}`}</SpanText>
		</SpanWrapper>
	);
};

export default SpanLength;
