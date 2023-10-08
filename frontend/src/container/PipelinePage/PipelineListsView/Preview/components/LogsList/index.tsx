import './styles.scss';

import { ExpandAltOutlined } from '@ant-design/icons';
import LogDetail from 'components/LogDetail';
import dayjs from 'dayjs';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { ILog } from 'types/api/logs/log';

function LogsList({ logs }: LogsListProps): JSX.Element {
	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
	} = useActiveLog();

	const makeLogDetailsHandler = (log: ILog) => (): void => onSetActiveLog(log);

	return (
		<div className="logs-preview-list-container">
			{logs.map((log) => (
				<div key={log.id} className="logs-preview-list-item">
					<div className="logs-preview-list-item-timestamp">
						{dayjs(String(log.timestamp)).format('MMM DD HH:mm:ss.SSS')}
					</div>
					<div className="logs-preview-list-item-body">{log.body}</div>
					<div
						className="logs-preview-list-item-expand"
						onClick={makeLogDetailsHandler(log)}
						role="button"
						tabIndex={0}
						onKeyUp={makeLogDetailsHandler(log)}
					>
						<ExpandAltOutlined />
					</div>
				</div>
			))}
			<LogDetail
				log={activeLog}
				onClose={onClearActiveLog}
				onAddToQuery={onAddToQuery}
				onClickActionItem={onAddToQuery}
			/>
		</div>
	);
}

interface LogsListProps {
	logs: ILog[];
}

export default LogsList;
