import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { useTimezone } from 'providers/Timezone';
import React from 'react';
import { PipelineData, ProcessorData } from 'types/api/pipeline/def';

import { PipelineIndexIcon } from '../AddNewProcessor/styles';
import { ColumnDataStyle, ListDataStyle, ProcessorIndexIcon } from '../styles';
import PipelineFilterSummary from './PipelineFilterSummary';

function CreatedAtComponent({ record }: { record: Record }): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	return (
		<ColumnDataStyle>
			{formatTimezoneAdjustedTimestamp(record, DATE_TIME_FORMATS.UTC_MONTH_FULL)}
		</ColumnDataStyle>
	);
}

const componentMap: ComponentMap = {
	orderId: ({ record }) => <PipelineIndexIcon>{record}</PipelineIndexIcon>,
	createdAt: ({ record }) => <CreatedAtComponent record={record} />,
	id: ({ record }) => <ProcessorIndexIcon>{record}</ProcessorIndexIcon>,
	name: ({ record }) => <ListDataStyle>{record}</ListDataStyle>,
	filter: ({ record }) => <PipelineFilterSummary filter={record} />,
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

export type Record = PipelineData['orderId'] &
	PipelineData['filter'] &
	ProcessorData;

interface TableComponentsProps {
	columnKey: string;
	record: Record;
}

export default TableComponents;
