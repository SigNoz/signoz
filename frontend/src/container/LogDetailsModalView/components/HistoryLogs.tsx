import { Button, Spin, Typography } from 'antd';

import IHistoryLogs, { HistoryPosition } from '../interfaces/IHistoryLogs';
import {
	HisoryLogContainer,
	HistoryLogHeader,
	HistoryLogsScrolled,
	SpinnerContainer,
} from '../styles/Log';

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
		<HisoryLogContainer>
			{position === HistoryPosition.prev && (
				<HistoryLogHeader>
					Showing 10 lines after match
					<Button size="small" onClick={addMoreLogs}>
						Show 10 more lines
					</Button>
				</HistoryLogHeader>
			)}
			{isLoad ? (
				<SpinnerContainer>
					<Spin />
				</SpinnerContainer>
			) : (
				<HistoryLogsScrolled>
					{logs?.length === 0 ? (
						<Text ellipsis>there are no logs</Text>
					) : (
						logs?.map((log) => (
							<Text ellipsis key={log.id}>
								{log.body}
							</Text>
						))
					)}
				</HistoryLogsScrolled>
			)}

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
