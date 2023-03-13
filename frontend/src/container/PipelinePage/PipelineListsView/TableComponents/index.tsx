import React from 'react';
import { PipelineData, ProcessorData } from 'types/api/pipeline/def';

import { ListDataStyle, ProcessorIndexIcon } from '../styles';
import PipelineSequence from './PipelineSequence';
// import Tags from './Tags';

function TableComponents({
	columnKey,
	record,
}: TableComponentsProps): JSX.Element {
	if (columnKey === 'orderId') {
		return <PipelineSequence value={record} />;
	}
	/* if (columnKey === 'tags') {
		return <Tags tags={record} />;
	} */
	if (columnKey === 'createdBy') {
		return <span>{record}</span>;
	}
	if (columnKey === 'createdAt') {
		return (
			<span>
				{new Date(record).toLocaleString(undefined, {
					year: 'numeric',
					month: 'long',
					day: '2-digit',
					hour: 'numeric',
					minute: 'numeric',
					hour12: true,
				})}
			</span>
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

export type Record = PipelineData['orderId'] &
	// PipelineData['tags'] &
	ProcessorData;

interface TableComponentsProps {
	columnKey: string;
	record: Record;
}

export default TableComponents;
