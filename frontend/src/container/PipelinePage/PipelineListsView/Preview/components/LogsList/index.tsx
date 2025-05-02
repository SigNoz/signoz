import './styles.scss';

import { ExpandAltOutlined } from '@ant-design/icons';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useTimezone } from 'providers/Timezone';
import { ILog } from 'types/api/logs/log';

function LogsList({ logs }: LogsListProps): JSX.Element {
	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
		onGroupByAttribute,
	} = useActiveLog();

	const makeLogDetailsHandler = (log: ILog) => (): void => onSetActiveLog(log);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return (
		<div className="logs-preview-list-container">
			{logs.map((log) => (
				<div key={log.id} className="logs-preview-list-item">
					<div className="logs-preview-list-item-timestamp">
						{formatTimezoneAdjustedTimestamp(
							log.timestamp,
							DATE_TIME_FORMATS.UTC_MONTH_SHORT,
						)}
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
				selectedTab={VIEW_TYPES.OVERVIEW}
				log={activeLog}
				onClose={onClearActiveLog}
				onAddToQuery={onAddToQuery}
				onClickActionItem={onAddToQuery}
				onGroupByAttribute={onGroupByAttribute}
			/>
		</div>
	);
}

interface LogsListProps {
	logs: ILog[];
}

export default LogsList;
