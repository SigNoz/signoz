import { Select, SelectProps, Tag } from 'antd';
import React, { useCallback, useMemo } from 'react';
import { Alerts } from 'types/api/alerts/getAll';

import { Container } from './styles';

const Filter = ({
	setSelectedFilter,
	setSelectedGroup,
	allAlerts,
	selectedGroup,
	selectedFilter,
}: FilterProps): JSX.Element => {
	const onChangeSelectGroupHandler = useCallback(
		(value: string[]) => {
			setSelectedGroup(
				value.map((e) => ({
					value: e,
				})),
			);
		},
		[setSelectedGroup],
	);

	const onChangeSelectedFilterHandler = useCallback(
		(value: string[]) => {
			setSelectedFilter(
				value.map((e) => ({
					value: e,
				})),
			);
		},
		[setSelectedFilter],
	);

	const uniqueLabels: Array<string> = useMemo(() => {
		const allLabelsSet = new Set<string>();
		allAlerts.forEach((e) =>
			Object.keys(e.labels).map((e) => {
				allLabelsSet.add(e);
			}),
		);
		return [...allLabelsSet];
	}, [allAlerts]);

	const options = uniqueLabels.map((e) => ({
		value: e,
	}));

	const getTags: SelectProps['tagRender'] = ({ closable, label, onClose }) => {
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
	};

	return (
		<Container>
			<Select
				allowClear
				onChange={onChangeSelectedFilterHandler}
				mode="tags"
				value={selectedFilter.map((e) => e.value)}
				placeholder="Filter by Tags - e.g. severity:warning, alertname:Sample Alert"
				tagRender={getTags}
				style={{
					minWidth: '350px',
				}}
				options={[]}
			/>
			<Select
				allowClear
				onChange={onChangeSelectGroupHandler}
				mode="tags"
				defaultValue={selectedGroup.map((e) => e.value)}
				showArrow
				style={{
					minWidth: '350px',
				}}
				placeholder="Group by any tag"
				tagRender={getTags}
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
}

export interface Value {
	value: string;
}

export default Filter;
