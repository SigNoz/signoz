import { TableColumnProps } from 'antd';
import { UseQueryResult } from 'react-query';

import { Data } from '.';
import Createdby from './components/TableComponents/CreatedBy';
import DateComponent from './components/TableComponents/Date';
import DeleteButton, {
	DeleteButtonProps,
} from './components/TableComponents/DeleteButton';
import Name from './components/TableComponents/Name';
import Tags from './components/TableComponents/Tags';

export const getDashboardListColumns = (
	action: boolean,
	refetchDashboardList: UseQueryResult['refetch'],
): TableColumnProps<Data>[] => {
	const columns: TableColumnProps<Data>[] = [
		{
			title: 'Name',
			dataIndex: 'name',
			width: 100,
			render: Name,
		},
		{
			title: 'Description',
			width: 100,
			dataIndex: 'description',
		},
		{
			title: 'Tags (can be multiple)',
			dataIndex: 'tags',
			width: 80,
			render: Tags,
		},
		{
			title: 'Created At',
			dataIndex: 'createdBy',
			width: 80,
			sorter: (a: Data, b: Data): number => {
				const prev = new Date(a.createdBy).getTime();
				const next = new Date(b.createdBy).getTime();
				return prev - next;
			},
			render: Createdby,
		},
		{
			title: 'Last Updated Time',
			width: 90,
			dataIndex: 'lastUpdatedTime',
			sorter: (a: Data, b: Data): number => {
				const prev = new Date(a.lastUpdatedTime).getTime();
				const next = new Date(b.lastUpdatedTime).getTime();
				return prev - next;
			},
			render: DateComponent,
		},
	];

	if (action) {
		columns.push({
			title: 'Action',
			dataIndex: '',
			width: 40,
			render: ({
				createdBy,
				description,
				id,
				key,
				lastUpdatedTime,
				name,
				tags,
			}: DeleteButtonProps) => (
				<DeleteButton
					description={description}
					id={id}
					key={key}
					lastUpdatedTime={lastUpdatedTime}
					name={name}
					tags={tags}
					createdBy={createdBy}
					refetchDashboardList={refetchDashboardList}
				/>
			),
		});
	}

	return columns;
};
