import { Tag, Typography } from 'antd';
import Status from 'container/ListAlertRules/TableComponents/Status';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';
import React from 'react';
import { Alerts } from 'types/api/alerts/getAll';

import { TableCell, TableRow } from './styles';

const ExapandableRow = ({ allAlerts }: ExapandableRowProps): JSX.Element => (
	<>
		{allAlerts.map((alert) => {
			const labels = alert.labels;
			const labelsObject = Object.keys(labels);

			const tags = labelsObject.filter((e) => e !== 'severity');

			const formatedDate = new Date(alert.startsAt);

			return (
				<TableRow
					bodyStyle={{
						minHeight: '5rem',
					}}
					translate="yes"
					hoverable
					key={alert.fingerprint}
				>
					<TableCell>
						<Status status={labels['severity']} />
					</TableCell>

					<TableCell>
						<Typography>{labels['alertname']}</Typography>
					</TableCell>

					<TableCell>
						<Typography>{labels['severity']}</Typography>
					</TableCell>

					<TableCell>
						<Typography>{`${getFormattedDate(formatedDate)} ${convertDateToAmAndPm(
							formatedDate,
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

interface ExapandableRowProps {
	allAlerts: Alerts[];
}

export default ExapandableRow;
