import IHistoryLogs from '../interfaces/IHistoryLogs';

function HistoryLogs({ position, fetchLogs }: IHistoryLogs): JSX.Element {
	console.log('fetchLogs', fetchLogs);
	return <div>{position}</div>;
}

export default HistoryLogs;
