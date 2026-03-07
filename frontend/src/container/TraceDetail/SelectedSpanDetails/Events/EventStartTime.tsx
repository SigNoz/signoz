import { Popover } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { CustomSubText, CustomSubTitle } from '../styles';

function EventStartTime({ timeUnixNano }: EventStartTimeProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const humanReadableTimeInDayJs = dayjs(timeUnixNano / 1e6).format(
		DATE_TIME_FORMATS.ISO_DATETIME_MS,
	);

	return (
		<>
			<CustomSubTitle style={{ margin: 0 }}>Event Time</CustomSubTitle>
			<CustomSubText ellipsis isDarkMode={isDarkMode}>
				<Popover content={humanReadableTimeInDayJs}>
					{humanReadableTimeInDayJs}
				</Popover>
			</CustomSubText>
		</>
	);
}

interface EventStartTimeProps {
	timeUnixNano: number;
}

export default EventStartTime;
