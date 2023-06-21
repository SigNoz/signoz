import { Button, Spin, Typography } from 'antd';

import IHistoryLogs, { HistoryPosition } from '../interfaces/IHistoryLogs';
import {
	HisoryLogContainer,
	HistoryLogHeader,
	HistoryLogsScrolled,
	LogContainer,
	LogDiv,
	SpinnerContainer,
} from '../styles/Log';
import Log from './Log';

const { Text } = Typography;

function HistoryLogs({
	logs,
	position,
	addMoreLogs,
	isLoad,
	isError,
}: IHistoryLogs): JSX.Element {
	if (isError) {
		return <div>Something went wrong</div>;
	}

	return (
		<>
			{position === HistoryPosition.prev && (
				<HistoryLogHeader>
					Showing 10 lines after match
					<Button size="small" onClick={addMoreLogs}>
						Show 10 more lines
					</Button>
				</HistoryLogHeader>
			)}
			<HisoryLogContainer>
				{isLoad ? (
					<SpinnerContainer>
						<Spin />
					</SpinnerContainer>
				) : (
					<HistoryLogsScrolled>
						{logs?.length === 0 ? (
							<LogContainer>
								<LogDiv>
									<Text ellipsis>There are no logs</Text>
								</LogDiv>
							</LogContainer>
						) : (
							logs?.map((log) => (
								<Log key={log.data.id} timestamp={log.timestamp} log={log} />
							))
						)}
					</HistoryLogsScrolled>
				)}
			</HisoryLogContainer>
			{position === HistoryPosition.next && (
				<HistoryLogHeader>
					Showing 10 lines before match
					<Button size="small" onClick={addMoreLogs}>
						Show 10 more lines
					</Button>
				</HistoryLogHeader>
			)}
		</>
	);
}

export default HistoryLogs;
