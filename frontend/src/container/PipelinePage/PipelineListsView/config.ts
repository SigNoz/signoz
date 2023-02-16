import { ColumnsType } from 'antd/es/table';

import { PipelineColumn } from '.';

export const addPipelinefieldLists = [
	{
		id: 1,
		fieldName: 'Name',
		placeholder: 'Name',
		name: 'name',
	},
	{
		id: 2,
		fieldName: 'Tags',
		placeholder: 'Tags',
		name: 'tags',
	},
	{
		id: 3,
		fieldName: 'Description',
		placeholder: 'Enter description for your pipeline',
		name: 'operators',
	},
];

export const tagInputStyle: React.CSSProperties = {
	width: 78,
	verticalAlign: 'top',
	flex: 1,
};

export const columns: ColumnsType<PipelineColumn> = [
	{
		title: '',
		key: 'orderid',
	},
	{
		title: 'Pipeline Name',
		key: 'name',
	},
	{
		title: 'Filters',
		key: 'filter',
	},
	{
		title: 'Tags',
		key: 'tags',
	},
	{
		title: 'Last Edited',
		key: 'updatedAt',
	},
	{
		title: 'Edited By',
		key: 'updatedBy',
	},
];
