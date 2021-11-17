import React, { useMemo } from 'react';
import { Alerts } from 'types/api/alerts/getAll';
import { Value } from '../Filter';
import groupBy from 'lodash/groupBy';
import { Dictionary } from 'lodash';
import { Card, Row } from 'antd';

import {
	Container,
	TableHeader,
	TableHeaderContainer,
	TableRow,
	TableCell,
} from './styles';

const FilteredTable = ({
	selectedGroup,
	allAlerts,
}: FilteredTableProps): JSX.Element => {
	const allGroupsAlerts: Dictionary<Alerts[]> = useMemo(
		() =>
			groupBy(allAlerts, (obj) =>
				selectedGroup.map((e) => obj.labels[`${e.value}`]).join('+'),
			),
		[selectedGroup],
	);

	const tags = Object.keys(allGroupsAlerts);
	const tagsAlerts = Object.values(allGroupsAlerts);

	const headers = [
		'Status',
		'Alert Name',
		'Severity',
		'Firing Since',
		'Tags',
		'Actions',
	];

	return (
		<Container>
			<TableHeaderContainer>
				{headers.map((header) => {
					return <TableHeader>{header}</TableHeader>;
				})}
			</TableHeaderContainer>

			{tags.map((e, index) => {
				const tagsValue = e.split('+').filter((e) => e);
				const tagsAlert = tagsAlerts[index];

				if (tagsAlert.length === 0) {
					return null;
				}

				const objects = tagsAlert[0].labels;
				const keysArray = Object.keys(objects);
				const valueArray: string[] = [];

				keysArray.forEach((e) => {
					valueArray.push(objects[e]);
				});

				console.log(keysArray, valueArray);

				return (
					<Row>
						<TableRow>
							<TableCell>asd</TableCell>
							<TableCell>asd</TableCell>
							<TableCell>asd</TableCell>
							<TableCell>asd</TableCell>
							<TableCell>asd</TableCell>
							<TableCell>asd</TableCell>
						</TableRow>
					</Row>
				);
			})}
		</Container>
	);
};

interface FilteredTableProps {
	selectedGroup: Value[];
	allAlerts: Alerts[];
}

export default FilteredTable;
