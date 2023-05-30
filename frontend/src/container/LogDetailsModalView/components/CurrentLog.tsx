import ICurrentLog from '../interfaces/ICurrentLog';
import { LogContainer } from '../styles/Log';

function CurrentLog({ log }: ICurrentLog): JSX.Element {
	return <LogContainer>{log}</LogContainer>;
}

export default CurrentLog;
