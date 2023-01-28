/* eslint-disable react/no-unstable-nested-components */
import type { SelectProps } from 'antd';
import { Tag } from 'antd';
import React, { useCallback, useMemo } from 'react';
import { Alerts } from 'types/api/alerts/getTriggered';

import { Container, Select } from './styles';

function Filter({
	setSelectedFilter,
	setSelectedGroup,
	allAlerts,
	selectedGroup,
	selectedFilter,
}: FilterProps): JSX.Element {
	const onChangeSelectGroupHandler = useCallback(
		(value: unknown) => {
			if (typeof value === 'object' && Array.isArray(value)) {
				setSelectedGroup(
					value.map((e) => ({
						value: e,
					})),
				);
			}
		},
		[setSelectedGroup],
	);

	const onChangeSelectedFilterHandler = useCallback(
		(value: unknown) => {
			if (typeof value === 'object' && Array.isArray(value)) {
				setSelectedFilter(
					value.map((e) => ({
						value: e,
					})),
				);
			}
		},
		[setSelectedFilter],
	);

	const uniqueLabels: Array<string> = useMemo(() => {
		const allLabelsSet = new Set<string>();
		allAlerts.forEach((eParam) =>
			Object.keys(eParam.labels).forEach((e) => {
				allLabelsSet.add(e);
			}),
		);
		return [...allLabelsSet];
	}, [allAlerts]);

	const options = uniqueLabels.map((e) => ({
		value: e,
	}));

	const getTags: SelectProps['tagRender'] = (props): JSX.Element => {
		const { closable, onClose, label } = props;

		return (
			<Tag
				color="magenta"
				closable={closable}
				onClose={onClose}
				style={{ marginRight: 3 }}
			>
				{label}
			</Tag>
		);
	};

	return (
		<Container>
			<Select
				allowClear
				onChange={onChangeSelectedFilterHandler}
				mode="tags"
				value={selectedFilter.map((e) => e.value)}
				placeholder="Filter by Tags - e.g. severity:warning, alertname:Sample Alert"
				tagRender={(props): JSX.Element => getTags(props)}
				options={[]}
			/>
			<Select
				allowClear
				onChange={onChangeSelectGroupHandler}
				mode="tags"
				defaultValue={selectedGroup.map((e) => e.value)}
				showArrow
				placeholder="Group by any tag"
				tagRender={(props): JSX.Element => getTags(props)}
				options={options}
			/>
		</Container>
	);
}

interface FilterProps {
	setSelectedFilter: React.Dispatch<React.SetStateAction<Array<Value>>>;
	setSelectedGroup: React.Dispatch<React.SetStateAction<Array<Value>>>;
	allAlerts: Alerts[];
	selectedGroup: Array<Value>;
	selectedFilter: Array<Value>;
}

export interface Value {
	value: string;
}

export default Filter;
