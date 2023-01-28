import groupBy from 'lodash-es/groupBy';
import React, { useMemo } from 'react';
import { Alerts } from 'types/api/alerts/getTriggered';

import { Value } from '../Filter';
import { FilterAlerts } from '../utils';
import { Container, TableHeader, TableHeaderContainer } from './styles';
import TableRowComponent from './TableRow';

function FilteredTable({
	selectedGroup,
	allAlerts,
	selectedFilter,
}: FilteredTableProps): JSX.Element {
	const allGroupsAlerts = useMemo(
		() =>
			groupBy(FilterAlerts(allAlerts, selectedFilter), (obj) =>
				selectedGroup.map((e) => obj.labels[`${e.value}`]).join('+'),
			),
		[selectedGroup, allAlerts, selectedFilter],
	);

	const tags = Object.keys(allGroupsAlerts);
	const tagsAlerts = Object.values(allGroupsAlerts);

	const headers = [
		'Status',
		'Alert Name',
		'Severity',
		'Firing Since',
		'Tags',
		// 'Actions',
	];

	return (
		<Container>
			<TableHeaderContainer>
				{headers.map((header) => (
					<TableHeader key={header}>{header}</TableHeader>
				))}
			</TableHeaderContainer>

			{tags.map((e, index) => {
				const tagsValue = e.split('+').filter((eParam) => eParam);
				const tagsAlert: Alerts[] = tagsAlerts[index];

				if (tagsAlert.length === 0) {
					return null;
				}

				const objects = tagsAlert[0].labels;
				const keysArray = Object.keys(objects);
				const valueArray: string[] = [];

				keysArray.forEach((eParam) => {
					valueArray.push(objects[eParam]);
				});

				const tagsLocal = tagsValue
					.map(
						(eParam) =>
							keysArray[valueArray.findIndex((value) => value === eParam) || 0],
					)
					.map((eParam, indexLocal) => `${eParam}:${tagsValue[indexLocal]}`);

				return <TableRowComponent key={e} tagsAlert={tagsAlert} tags={tagsLocal} />;
			})}
		</Container>
	);
}

interface FilteredTableProps {
	selectedGroup: Value[];
	allAlerts: Alerts[];
	selectedFilter: Value[];
}

export default FilteredTable;
