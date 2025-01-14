import './AttributesTable.styles.scss';

import { Button, Input, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { ResizeTable } from 'components/ResizeTable';
import { flattenObject } from 'container/LogDetailedView/utils';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

interface IAttributesTable {
	span: Span;
}

function AttributesTable(props: IAttributesTable): JSX.Element {
	const { span } = props;
	const [searchVisible, setSearchVisible] = useState<boolean>(false);
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');

	const flattenSpanData: Record<string, string> = useMemo(
		() => (span ? flattenObject(span) : {}),
		[span],
	);

	const datasource = Object.keys(flattenSpanData)
		.filter((attribute) => attribute.includes(fieldSearchInput))
		.map((key) => ({ field: key, value: flattenSpanData[key] }));

	console.log(flattenSpanData, datasource);

	const columns: ColumnsType<Record<string, string>> = [
		{
			title: 'Field',
			dataIndex: 'field',
			key: 'field',
			width: 50,
			align: 'left',
			ellipsis: true,
			className: 'attribute-name',
			render: (field: string): JSX.Element => (
				<Typography.Text className="field-key">{field}</Typography.Text>
			),
		},
		{
			title: 'Value',
			key: 'value',
			width: 50,
			ellipsis: false,
			className: 'attribute-value',
			render: (): JSX.Element => (
				<Typography.Text className="field-value">X</Typography.Text>
			),
		},
	];
	return (
		<div className="attributes-table">
			<section className="attributes-header">
				<Typography.Text className="attributes-tag">Attributes</Typography.Text>
				{searchVisible && (
					<Input
						autoFocus
						placeholder="Search for attribute..."
						className="search-input"
						value={fieldSearchInput}
						onChange={(e): void => setFieldSearchInput(e.target.value)}
					/>
				)}
				<Button
					className="action-btn"
					icon={<Search size={12} />}
					onClick={(e): void => {
						e.stopPropagation();
						setSearchVisible((prev) => !prev);
					}}
				/>
			</section>
			<section className="resize-trace-attribute-table">
				<ResizeTable columns={columns} dataSource={datasource} />
			</section>
		</div>
	);
}

export default AttributesTable;
