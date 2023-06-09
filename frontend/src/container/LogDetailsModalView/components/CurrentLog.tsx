import ICurrentLog from '../interfaces/ICurrentLog';
import { Log, LogContainer } from '../styles/Log';

function CurrentLog({ log }: ICurrentLog): JSX.Element {
	return (
		<LogContainer>
			<Log>{log}</Log>
		</LogContainer>
	);
}

export default CurrentLog;
