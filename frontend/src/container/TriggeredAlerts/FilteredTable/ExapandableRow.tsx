import { Tag, Typography } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useTimezone } from 'providers/Timezone';
import { Alerts } from 'types/api/alerts/getTriggered';

import Status from '../TableComponents/AlertStatus';
import { TableCell, TableRow } from './styles';

function ExapandableRow({ allAlerts }: ExapandableRowProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	return (
		<>
			{allAlerts.map((alert) => {
				const { labels } = alert;
				const labelsObject = Object.keys(labels);

				const tags = labelsObject.filter((e) => e !== 'severity');

				const formatedDate = new Date(alert.startsAt);

				return (
					<TableRow
						bodyStyle={{
							minHeight: '5rem',
							marginLeft: '2rem',
						}}
						translate="yes"
						hoverable
						key={alert.fingerprint}
					>
						<TableCell>
							<Status severity={alert.status.state} />
						</TableCell>

						<TableCell>
							<Typography>{labels.alertname}</Typography>
						</TableCell>

						<TableCell>
							<Typography>{labels.severity}</Typography>
						</TableCell>

						<TableCell>
							<Typography>{`${formatTimezoneAdjustedTimestamp(
								formatedDate,
								DATE_TIME_FORMATS.UTC_US,
							)}`}</Typography>
						</TableCell>

						<TableCell>
							<div>
								{tags.map((e) => (
									<Tag key={e}>{`${e}:${labels[e]}`}</Tag>
								))}
							</div>
						</TableCell>

						{/* <TableCell>
						<TableHeaderContainer>
							<Button type="link">Edit</Button>
							<Button type="link">Delete</Button>
							<Button type="link">Pause</Button>
						</TableHeaderContainer>
					</TableCell> */}
					</TableRow>
				);
			})}
		</>
	);
}

interface ExapandableRowProps {
	allAlerts: Alerts[];
}

export default ExapandableRow;
