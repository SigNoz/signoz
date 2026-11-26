import { KeyboardEvent } from 'react';
import { Expand } from '@signozhq/icons';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { getBodyDisplay } from 'lib/logs/logBody';
import { useTimezone } from 'providers/Timezone';
import { ILog } from 'types/api/logs/log';

import './styles.scss';

function LogsList({ logs }: LogsListProps): JSX.Element {
	const { activeLog, onSetActiveLog, onClearActiveLog } = useActiveLog();

	const makeLogDetailsHandler = (log: ILog) => (): void => onSetActiveLog(log);

	const makeLogDetailsKeyHandler =
		(log: ILog) =>
		(e: KeyboardEvent<HTMLDivElement>): void => {
			if (e.key === 'Enter' || e.key === ' ') {
				onSetActiveLog(log);
			}
		};

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return (
		<div className="logs-preview-list-container">
			{logs.map((log) => (
				<div
					key={log.id}
					className="logs-preview-list-item"
					data-testid="pipeline-preview-log"
				>
					<div className="logs-preview-list-item-timestamp">
						{formatTimezoneAdjustedTimestamp(
							log.timestamp,
							DATE_TIME_FORMATS.UTC_MONTH_SHORT,
						)}
					</div>
					<div className="logs-preview-list-item-body">
						{getBodyDisplay(log.body)}
					</div>
					<div
						className="logs-preview-list-item-expand"
						onClick={makeLogDetailsHandler(log)}
						role="button"
						tabIndex={0}
						data-testid="pipeline-preview-log-expand"
						onKeyUp={makeLogDetailsKeyHandler(log)}
					>
						<Expand size="md" />
					</div>
				</div>
			))}
			<LogDetail
				selectedTab={VIEW_TYPES.OVERVIEW}
				log={activeLog}
				onClose={onClearActiveLog}
			/>
		</div>
	);
}

interface LogsListProps {
	logs: ILog[];
}

export default LogsList;
