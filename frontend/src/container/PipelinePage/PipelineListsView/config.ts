import { ColumnsType } from 'antd/es/table';

import { PipelineColumn, ProcessorColumn } from '.';

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

export const pipelineColumns: ColumnsType<PipelineColumn> = [
	{
		key: 'orderid',
		title: '',
	},
	{
		key: 'name',
		title: 'Pipeline Name',
	},
	{
		key: 'filter',
		title: 'Filters',
	},
	{
		key: 'tags',
		title: 'Tags',
	},
	{
		key: 'updatedAt',
		title: 'Last Edited',
	},
	{
		key: 'updatedBy',
		title: 'Edited By',
	},
];

export const processorColumns: ColumnsType<ProcessorColumn> = [
	{
		key: 'id',
		title: '',
	},
	{
		key: 'text',
		title: '',
	},
];
