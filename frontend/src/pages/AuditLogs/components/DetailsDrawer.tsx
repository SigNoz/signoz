import { Badge } from '@signozhq/ui/badge';
import { Drawer } from '@signozhq/ui/drawer';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { FontSize } from 'container/OptionsMenu/types';
import { DataViewer } from 'periscope/components/DataViewer';

import { DATE_TIME_FORMATS } from '@/constants/dateTimeFormats';
import { useTimezone } from '@/providers/Timezone';

import { AuditLog } from '../AuditLogs.types';
import {
	getBody,
	getOutcome,
	getPrincipalEmail,
	getResourceId,
	getResourceName,
	getVerb,
	isServiceAccount,
} from '../AuditLogs.utils';

import { DetailsField } from './DetailsField';
import { OutcomeCell } from './QueryResultCells/OutcomeCell';
import { OutcomeIndicator } from './QueryResultCells/OutcomeIndicator';

import styles from './DetailsDrawer.module.scss';

export const DetailsDrawer = ({
	activeLog,
	handleCloseLogDetail,
}: {
	activeLog: AuditLog | null;
	handleCloseLogDetail: () => void;
}): JSX.Element => {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	return (
		<Drawer
			type="inspector"
			stack="overlay"
			open={activeLog !== null}
			onClose={handleCloseLogDetail}
			title={
				activeLog
					? formatTimezoneAdjustedTimestamp(
							activeLog.date,
							DATE_TIME_FORMATS.ISO_DATETIME_MS,
						)
					: ''
			}
			width="extra-wide"
			testId="audit-log-detail-drawer"
			closePosition="start"
		>
			{activeLog ? (
				<div className={styles.summary} data-testid="audit-log-detail-summary">
					<div className={styles.logLine} data-testid="audit-log-detail-body">
						<OutcomeIndicator
							outcome={getOutcome(activeLog)}
							fontSize={FontSize.MEDIUM}
							flush
						/>
						<span className={styles.logText}>{getBody(activeLog)}</span>
					</div>
					<DetailsField label="Principal">
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="primary"
							as="span"
							textOverflow="wrap"
						>
							{getPrincipalEmail(activeLog)}
						</Typography>
						{isServiceAccount(activeLog) && (
							<Badge variant="outlined" color="info" textTransform="none">
								BOT
							</Badge>
						)}
					</DetailsField>
					<DetailsField label="Outcome">
						<OutcomeCell outcome={getOutcome(activeLog)} />
					</DetailsField>
					<DetailsField label="Event">
						<span className={cx(styles.mono, styles.accent)}>
							{getVerb(activeLog)}
						</span>
					</DetailsField>
					<DetailsField label="Resource">
						<span className={cx(styles.mono, styles.accent)}>
							{getResourceName(activeLog)}
						</span>
					</DetailsField>
					<DetailsField label="Resource ID">
						<span className={cx(styles.mono, styles.muted)}>
							{getResourceId(activeLog)}
						</span>
					</DetailsField>
				</div>
			) : null}
			<DataViewer
				data={activeLog ? activeLog : {}}
				drawerKey="audit-log-detail"
				fontSize={13}
				jsonString={JSON.stringify(activeLog ?? {}, null, 2)}
			/>
		</Drawer>
	);
};
