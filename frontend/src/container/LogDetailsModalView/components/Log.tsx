import { Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';

import ILog from '../interfaces/ILog';
import { LogContainer, LogDiv } from '../styles/Log';

const { Text } = Typography;

function Log({ log }: ILog): JSX.Element {
	const text = useMemo(
		() => `${dayjs(log.timestamp / 1e6).format()} | ${log.body}`,
		[log],
	);

	return (
		<LogContainer>
			<Tooltip title={text}>
				<LogDiv>
					<Text ellipsis>{text}</Text>
				</LogDiv>
			</Tooltip>
		</LogContainer>
	);
}

export default Log;
