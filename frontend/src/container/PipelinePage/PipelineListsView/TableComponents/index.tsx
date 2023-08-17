import dayjs from 'dayjs';
import React from 'react';
import { PipelineData, ProcessorData } from 'types/api/pipeline/def';

import { PipelineIndexIcon } from '../AddNewProcessor/styles';
import { ColumnDataStyle, ListDataStyle, ProcessorIndexIcon } from '../styles';

const componentMap: ComponentMap = {
	orderId: ({ record }) => <PipelineIndexIcon>{record}</PipelineIndexIcon>,
	createdAt: ({ record }) => (
		<ColumnDataStyle>
			{dayjs(record).locale('en').format('MMMM DD, YYYY hh:mm A')}
		</ColumnDataStyle>
	),
	id: ({ record }) => <ProcessorIndexIcon>{record}</ProcessorIndexIcon>,
	name: ({ record }) => <ListDataStyle>{record}</ListDataStyle>,
};

function TableComponents({
	columnKey,
	record,
}: TableComponentsProps): JSX.Element {
	const Component =
		componentMap[columnKey] ??
		(({ record }): JSX.Element => <ColumnDataStyle>{record}</ColumnDataStyle>);

	return <Component record={record} />;
}

type ComponentMap = {
	[key: string]: React.FC<{ record: Record }>;
};

export type Record = PipelineData['orderId'] & ProcessorData;

interface TableComponentsProps {
	columnKey: string;
	record: Record;
}

export default TableComponents;
