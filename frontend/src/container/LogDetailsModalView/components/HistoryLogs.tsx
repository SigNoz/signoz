import { Button, Spin } from 'antd';

import IHistoryLogs, { HistoryPosition } from '../interfaces/IHistoryLogs';
import {
	HisoryLogContainer,
	HistoryLogHeader,
	HistoryLogsScrolled,
	Log,
	SpinnerContainer,
} from '../styles/Log';

function HistoryLogs({
	logs,
	position,
	addMoreLogs,
	isLoad,
	isError,
}: IHistoryLogs): JSX.Element {
	if (isLoad) {
		return (
			<SpinnerContainer>
				<Spin />
			</SpinnerContainer>
		);
	}

	if (isError) {
		return <div>Something went wrong</div>;
	}

	console.log('logs', logs);

	return (
		<HisoryLogContainer>
			{position === HistoryPosition.prev && (
				<HistoryLogHeader>
					Showing 10 lines after match
					<Button size="small" onClick={addMoreLogs}>
						Show 10 more lines
					</Button>
				</HistoryLogHeader>
			)}

			<HistoryLogsScrolled>
				{logs?.length === 0 ? (
					<Log>there are no logs</Log>
				) : (
					logs?.map((log) => <Log key={log.id}>{log.body}</Log>)
				)}
			</HistoryLogsScrolled>
			{position === HistoryPosition.next && (
				<HistoryLogHeader>
					Showing 10 lines before match
					<Button size="small" onClick={addMoreLogs}>
						Show 10 more lines
					</Button>
				</HistoryLogHeader>
			)}
		</HisoryLogContainer>
	);
}

export default HistoryLogs;
