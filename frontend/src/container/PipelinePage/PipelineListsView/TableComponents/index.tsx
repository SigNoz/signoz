import React from 'react';

import { ActionBy, PipelineColumn, ProcessorColumn } from '..';
import { ListDataStyle, ProcessorIndexIcon } from '../styles';
import PipelineSequence from './PipelineSequence';
import Tags from './Tags';

function TableComponents({
	columnKey,
	record,
}: TableComponentsProps): JSX.Element {
	if (columnKey === 'orderid') {
		return <PipelineSequence value={record} />;
	}
	if (columnKey === 'tags') {
		return <Tags tags={record} />;
	}
	if (columnKey === 'updatedBy') {
		return <span>{record.username}</span>;
	}
	if (columnKey === 'id') {
		return <ProcessorIndexIcon size="small">{Number(record)}</ProcessorIndexIcon>;
	}
	if (columnKey === 'processorName') {
		return <ListDataStyle>{record}</ListDataStyle>;
	}
	return <span>{record}</span>;
}

export type Record = ActionBy &
	PipelineColumn['orderid'] &
	PipelineColumn['tags'] &
	ProcessorColumn;

interface TableComponentsProps {
	columnKey: string;
	record: Record;
}

export default TableComponents;
