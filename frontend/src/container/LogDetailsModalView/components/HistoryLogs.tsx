import IHistoryLogs from '../interfaces/IHistoryLogs';
import { HisoryLogContainer } from '../styles/Log';

function HistoryLogs({ position, fetchLogs }: IHistoryLogs): JSX.Element {
	console.log('fetchLogs', fetchLogs);
	return <HisoryLogContainer>{position}</HisoryLogContainer>;
}

export default HistoryLogs;
