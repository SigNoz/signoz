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
	logs = [],
	position,
	addMoreLogs,
	isLoad,
	isError,
}: IHistoryLogs): JSX.Element {
	if (isError) {
		return <Typography>Something went wrong</Typography>;
	}

	return (
		<>
			{position === HistoryPosition.prev && (
				<HistoryLogHeader>
					Showing {logs?.length} lines after match
					{logs?.length && logs.length % 10 === 0 && (
						<Button size="small" onClick={addMoreLogs}>
							Show 10 more lines
						</Button>
					)}
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
								<Log key={log.data.id} timestamp={log.data.timestamp} log={log} />
							))
						)}
					</HistoryLogsScrolled>
				)}
			</HisoryLogContainer>
			{position === HistoryPosition.next && (
				<HistoryLogHeader>
					Showing {logs?.length} lines before match
					{logs?.length && logs.length % 10 === 0 && (
						<Button size="small" onClick={addMoreLogs}>
							Show 10 more lines
						</Button>
					)}
				</HistoryLogHeader>
			)}
		</>
	);
}

export default HistoryLogs;
