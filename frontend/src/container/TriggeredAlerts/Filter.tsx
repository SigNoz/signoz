import { Tag } from 'antd';
import React, { useCallback, useMemo } from 'react';
import { Alerts } from 'types/api/alerts/getAll';

import { Container, Select } from './styles';

const Filter = ({
	setSelectedFilter,
	setSelectedGroup,
	allAlerts,
	selectedGroup,
	selectedFilter,
	setSelectedAllAlerts,
}: FilterProps): JSX.Element => {
	const onChangeSelectGroupHandler = useCallback(
		(value: string[], option) => {
			setSelectedGroup(
				value.map((e) => ({
					value: e,
				})),
			);
		},
		[setSelectedGroup],
	);

	const onChangeSelectedFilterHandler = useCallback(
		(value: string[], option) => {
			setSelectedFilter(
				value.map((e) => ({
					value: e,
				})),
			);

			const selectedFilter: string[] = [];

			// filtering the value
			value.forEach((e) => {
				const valueKey = e.split(':');
				if (valueKey.length === 2) {
					selectedFilter.push(e);
				}
			});

			// also we need to update the alerts
			// [[key,value]]
			const tags = selectedFilter.map((e) => e.split(':'));
			const objectMap = new Map();

			const filteredKey = tags.reduce((acc, curr) => [...acc, curr[0]], []);
			const filteredValue = tags.reduce((acc, curr) => [...acc, curr[1]], []);

			filteredKey.forEach((key, index) =>
				objectMap.set(key.trim(), filteredValue[index].trim()),
			);

			const filteredAlerts: Set<string> = new Set();

			allAlerts.forEach((alert) => {
				const { labels } = alert;
				Object.keys(labels).forEach((e) => {
					const selectedKey = objectMap.get(e);

					// alerts which does not have the key with value
					if (selectedKey && labels[e] === selectedKey) {
						filteredAlerts.add(alert.fingerprint);
					}
				});
			});

			setSelectedAllAlerts(
				allAlerts.filter((e) => filteredAlerts.has(e.fingerprint)),
			);
		},
		[],
	);

	const uniqueLabels: Array<string> = useMemo(() => {
		const allLabelsSet = new Set<string>();
		allAlerts.forEach((e) =>
			Object.keys(e.labels).map((e) => {
				allLabelsSet.add(e);
			}),
		);
		return [...allLabelsSet];
	}, []);

	const options = uniqueLabels.map((e) => ({
		value: e,
	}));

	return (
		<Container>
			<Select
				allowClear
				onChange={onChangeSelectedFilterHandler}
				mode="tags"
				value={selectedFilter.map((e) => e.value)}
				placeholder="Filter by tags status or severity or any other tag"
				tagRender={(props) => {
					const { label, closable, onClose } = props;
					return (
						<Tag
							color={'magenta'}
							closable={closable}
							onClose={onClose}
							style={{ marginRight: 3 }}
						>
							{label}
						</Tag>
					);
				}}
				options={[]}
			/>
			<Select
				allowClear
				onChange={onChangeSelectGroupHandler}
				mode="tags"
				defaultValue={selectedGroup.map((e) => e.value)}
				showArrow
				placeholder="Group by any tag"
				tagRender={(props) => {
					const { label, closable, onClose } = props;
					return (
						<Tag
							color={'magenta'}
							closable={closable}
							onClose={onClose}
							style={{ marginRight: 3 }}
						>
							{label}
						</Tag>
					);
				}}
				options={options}
			/>
		</Container>
	);
};

interface FilterProps {
	setSelectedFilter: React.Dispatch<React.SetStateAction<Array<Value>>>;
	setSelectedGroup: React.Dispatch<React.SetStateAction<Array<Value>>>;
	allAlerts: Alerts[];
	selectedGroup: Array<Value>;
	selectedFilter: Array<Value>;
	setSelectedAllAlerts: React.Dispatch<React.SetStateAction<Array<Alerts>>>;
}

export interface Value {
	value: string;
}

export default Filter;
