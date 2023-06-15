import { Typography } from 'antd';

import ICurrentLog from '../interfaces/ICurrentLog';
import { LogContainer } from '../styles/Log';

const { Text } = Typography;

function CurrentLog({ log }: ICurrentLog): JSX.Element {
	return (
		<LogContainer>
			<Text ellipsis>{log}</Text>
		</LogContainer>
	);
}

export default CurrentLog;
