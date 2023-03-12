import { ColumnsType } from 'antd/es/table';
import { PipelineData, ProcessorData } from 'types/api/pipeline/def';

export const pipelineFields = [
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
	/* {
		id: '3',
		fieldName: 'Tags',
		placeholder: 'pipeline_tags_placeholder',
		name: 'tags',
	}, */
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

export const pipelineColumns: ColumnsType<PipelineData> = [
	{
		key: 'orderId',
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
	/* {
		key: 'tags',
		title: 'Tags',
	}, */
	{
		key: 'createdAt',
		title: 'Last Edited',
	},
	{
		key: 'createdBy',
		title: 'Edited By',
	},
];

export const processorColumns: ColumnsType<ProcessorData> = [
	{
		key: 'orderId',
		title: '',
	},
	{
		key: 'name',
		title: '',
	},
];
