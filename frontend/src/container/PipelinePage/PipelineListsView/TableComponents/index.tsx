import React from 'react';

import { ActionBy, PipelineColumn } from '..';
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
		return (
			<ProcessorIndexIcon size="small">{Number(record) + 1}</ProcessorIndexIcon>
		);
	}
	if (columnKey === 'text') {
		return <ListDataStyle>{record}</ListDataStyle>;
	}
	return <span>{record}</span>;
}

interface TableComponentsProps {
	columnKey: string;
	record: ActionBy & PipelineColumn['orderid'] & PipelineColumn['tags'];
}

export default TableComponents;
