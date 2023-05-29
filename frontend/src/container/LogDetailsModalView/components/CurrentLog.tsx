import ICurrentLog from '../interfaces/ICurrentLog';

function CurrentLog({ log }: ICurrentLog): JSX.Element {
	return <div>{log}</div>;
}

export default CurrentLog;
