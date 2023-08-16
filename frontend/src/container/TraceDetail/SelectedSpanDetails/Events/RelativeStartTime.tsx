import { InfoCircleOutlined } from '@ant-design/icons';
import { Popover, Space } from 'antd';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { CustomSubText, CustomSubTitle } from '../styles';

function StartTime({
	firstSpanStartTime,
	timeUnixNano,
}: StartTimeProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const { time, timeUnitName } = convertTimeToRelevantUnit(
		timeUnixNano / 1e6 - (firstSpanStartTime || 0),
	);

	return (
		<>
			<Space direction="horizontal" align="center">
				<CustomSubTitle style={{ margin: 0 }} ellipsis>
					Event Start Time
				</CustomSubTitle>
				<Popover content="Relative to start of the full trace">
					<InfoCircleOutlined />
				</Popover>
			</Space>

			<CustomSubText isDarkMode={isDarkMode}>
				{`${time.toFixed(2)} ${timeUnitName}`}
			</CustomSubText>
		</>
	);
}

interface StartTimeProps {
	timeUnixNano: number;
	firstSpanStartTime: number;
}

export default StartTime;
