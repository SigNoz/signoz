import './SpanTableView.styles.scss';

import { ColumnsType } from 'antd/es/table';
import { ResizeTable } from 'components/ResizeTable';
import { flattenObject } from 'container/LogDetailedView/utils';
import { useMemo } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import SpanTableViewActions from './SpanTableViewActions';

interface SpanTableViewProps {
	span: Span;
	fieldSearchInput: string;
	onAddToQuery?: (key: string, value: string, operator: string) => void;
	onGroupByAttribute?: (fieldKey: string) => void;
	onCopyFieldName?: (fieldName: string) => void;
	onCopyFieldValue?: (fieldValue: string) => void;
}

interface SpanDataType {
	key: string;
	field: string;
	value: string;
}

function SpanTableView({
	span,
	fieldSearchInput,
	onAddToQuery,
	onGroupByAttribute,
	onCopyFieldName,
	onCopyFieldValue,
}: SpanTableViewProps): JSX.Element | null {
	const flattenSpanData: Record<string, string> = useMemo(
		() => (span?.tagMap ? flattenObject(span.tagMap) : {}),
		[span],
	);

	const dataSource: SpanDataType[] = useMemo(() => {
		if (!flattenSpanData) return [];

		return Object.keys(flattenSpanData)
			.filter((field) =>
				field.toLowerCase().includes(fieldSearchInput.toLowerCase()),
			)
			.map((key) => ({
				key,
				field: key,
				value: String(flattenSpanData[key] || ''),
			}));
	}, [flattenSpanData, fieldSearchInput]);

	if (!dataSource.length) {
		return null;
	}

	const columns: ColumnsType<SpanDataType> = [
		{
			title: 'Field',
			dataIndex: 'field',
			key: 'field',
			width: 40,
			align: 'left',
			ellipsis: true,
			className: 'attribute-name',
			render: (field: string): JSX.Element => (
				<span className="field-name">{field}</span>
			),
		},
		{
			title: 'Value',
			key: 'value',
			width: 60,
			ellipsis: false,
			className: 'value-field-container attribute-value',
			render: (_, record): JSX.Element => (
				<SpanTableViewActions
					record={record}
					onAddToQuery={onAddToQuery}
					onGroupByAttribute={onGroupByAttribute}
					onCopyFieldName={onCopyFieldName}
					onCopyFieldValue={onCopyFieldValue}
				/>
			),
		},
	];

	return (
		<ResizeTable
			columns={columns}
			tableLayout="fixed"
			dataSource={dataSource}
			pagination={false}
			showHeader={false}
			className="span-attribute-table-container"
		/>
	);
}

SpanTableView.defaultProps = {
	onAddToQuery: undefined,
	onGroupByAttribute: undefined,
	onCopyFieldName: undefined,
	onCopyFieldValue: undefined,
};

export default SpanTableView;
export type { SpanDataType };
