import { ColumnGroupType, ColumnType } from 'antd/lib/table/interface';
import { PipelineData, ProcessorData } from 'types/api/pipeline/def';

export const pipelineFields = [
	{
		id: 1,
		fieldName: 'Filter',
		placeholder: 'search_pipeline_placeholder',
		name: 'filter',
	},
	{
		id: 2,
		fieldName: 'Name',
		placeholder: 'pipeline_name_placeholder',
		name: 'name',
	},
	/* {
		id: 3,
		fieldName: 'Tags',
		placeholder: 'pipeline_tags_placeholder',
		name: 'tags',
	}, */
	{
		id: 4,
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

export const pipelineColumns: Array<
	ColumnType<PipelineData> | ColumnGroupType<PipelineData>
> = [
	{
		key: 'orderId',
		title: '',
		dataIndex: 'orderId',
	},
	{
		key: 'name',
		title: 'Pipeline Name',
		dataIndex: 'name',
	},
	{
		key: 'filter',
		title: 'Filters',
		dataIndex: 'filter',
	},
	/* {
		key: 'tags',
		title: 'Tags',
		dataIndex: 'tags',
	}, */
	{
		key: 'createdAt',
		title: 'Last Edited',
		dataIndex: 'createdAt',
	},
	{
		key: 'createdBy',
		title: 'Edited By',
		dataIndex: 'createdBy',
	},
];

export const processorColumns: Array<
	ColumnType<ProcessorData> | ColumnGroupType<ProcessorData>
> = [
	{
		key: 'id',
		title: '',
		dataIndex: 'orderId',
	},
	{
		key: 'name',
		title: '',
		dataIndex: 'name',
	},
];
