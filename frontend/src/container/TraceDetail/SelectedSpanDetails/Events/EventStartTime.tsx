import { Popover } from 'antd';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { CustomSubText, CustomSubTitle } from '../styles';

function EventStartTime({ timeUnixNano }: EventStartTimeProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const humanReadableTimeInDayJs = dayjs(timeUnixNano / 1e6).format(
		'YYYY-MM-DD hh:mm:ss.SSS A',
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
