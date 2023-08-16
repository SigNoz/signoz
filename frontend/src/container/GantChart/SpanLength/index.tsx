import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { toFixed } from 'utils/toFixed';

import { SpanBorder, SpanLine, SpanText, SpanWrapper } from './styles';

interface SpanLengthProps {
	width: string;
	leftOffset: string;
	bgColor: string;
	inMsCount: number;
}

function SpanLength(props: SpanLengthProps): JSX.Element {
	const { width, leftOffset, bgColor, inMsCount } = props;
	const isDarkMode = useIsDarkMode();
	const { time, timeUnitName } = convertTimeToRelevantUnit(inMsCount);
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
			<SpanText isDarkMode={isDarkMode} leftOffset={leftOffset}>{`${toFixed(
				time,
				2,
			)} ${timeUnitName}`}</SpanText>
		</SpanWrapper>
	);
}

export default SpanLength;
