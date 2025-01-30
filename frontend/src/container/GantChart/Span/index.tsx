import '../GantChart.styles.scss';

import { Popover, Typography } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTimezone } from 'providers/Timezone';
import { useEffect } from 'react';
import { toFixed } from 'utils/toFixed';

import { SpanBorder, SpanLine, SpanText, SpanWrapper } from './styles';

interface SpanLengthProps {
	globalStart: number;
	startTime: number;
	name: string;
	width: string;
	leftOffset: string;
	bgColor: string;
	inMsCount: number;
}

function Span(props: SpanLengthProps): JSX.Element {
	const {
		width,
		leftOffset,
		bgColor,
		inMsCount,
		startTime,
		name,
		globalStart,
	} = props;
	const isDarkMode = useIsDarkMode();
	const { time, timeUnitName } = convertTimeToRelevantUnit(inMsCount);

	const { timezone } = useTimezone();

	useEffect(() => {
		document.documentElement.scrollTop = document.documentElement.clientHeight;
		document.documentElement.scrollLeft = document.documentElement.clientWidth;
	}, []);

	const getContent = (): JSX.Element => {
		const timeStamp = dayjs(startTime)
			.tz(timezone.value)
			.format(DATE_TIME_FORMATS.TIME_UTC_MS);
		const startTimeInMs = startTime - globalStart;
		return (
			<div>
				<Typography.Text style={{ marginBottom: '8px' }}>
					{' '}
					Duration : {inMsCount}
				</Typography.Text>
				<br />
				<Typography.Text style={{ marginBottom: '8px' }}>
					Start Time: {startTimeInMs}ms [{timeStamp}]{' '}
				</Typography.Text>
			</div>
		);
	};

	return (
		<SpanWrapper className="span-container">
			<SpanLine
				className="spanLine"
				isDarkMode={isDarkMode}
				bgColor={bgColor}
				leftOffset={leftOffset}
				width={width}
			/>

			<div>
				<Popover
					style={{
						left: `${leftOffset}%`,
					}}
					title={name}
					content={getContent()}
					trigger="hover"
					placement="left"
					autoAdjustOverflow
				>
					<SpanBorder
						className="spanTrack"
						isDarkMode={isDarkMode}
						bgColor={bgColor}
						leftOffset={leftOffset}
						width={width}
					/>
				</Popover>
			</div>

			<SpanText isDarkMode={isDarkMode} leftOffset={leftOffset}>{`${toFixed(
				time,
				2,
			)} ${timeUnitName}`}</SpanText>
		</SpanWrapper>
	);
}

export default Span;
