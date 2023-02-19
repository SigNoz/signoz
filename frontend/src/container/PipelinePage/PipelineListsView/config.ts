import { ColumnsType } from 'antd/es/table';

import { PipelineColumn, ProcessorColumn } from '.';

export const addPipelinefieldLists = [
	{
		id: '1',
		fieldName: 'Filter',
		placeholder: 'search_pipeline_placeholder',
		name: 'filter',
	},
	{
		id: '2',
		fieldName: 'Name',
		placeholder: 'pipeline_name_placeholder',
		name: 'name',
	},
	{
		id: '3',
		fieldName: 'Tags',
		placeholder: 'pipeline_tags_placeholder',
		name: 'tags',
	},
	{
		id: '4',
		fieldName: 'Description',
		placeholder: 'pipeline_description_placeholder',
		name: 'alias', // This is temporary as description is not present in mock
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
		key: 'processorName',
		title: '',
	},
];
