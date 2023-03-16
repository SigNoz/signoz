import dayjs from 'dayjs';
import React from 'react';
import { PipelineData, ProcessorData } from 'types/api/pipeline/def';

import { ListDataStyle, ProcessorIndexIcon } from '../styles';
import PipelineSequence from './PipelineSequence';

function TableComponents({
	columnKey,
	record,
}: TableComponentsProps): JSX.Element {
	if (columnKey === 'orderId') {
		return <PipelineSequence value={record} />;
	}
	if (columnKey === 'createdAt') {
		return (
			<span>{dayjs(record).locale('en').format('MMMM DD, YYYY hh:mm A')}</span>
		);
	}
	if (columnKey === 'id') {
		return <ProcessorIndexIcon>{record}</ProcessorIndexIcon>;
	}
	if (columnKey === 'name') {
		return <ListDataStyle>{record}</ListDataStyle>;
	}
	return <span>{record}</span>;
}

export type Record = PipelineData['orderId'] & ProcessorData;

interface TableComponentsProps {
	columnKey: string;
	record: Record;
}

export default TableComponents;
