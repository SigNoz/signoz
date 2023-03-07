import { DownOutlined, RightOutlined } from '@ant-design/icons';
import React from 'react';

import { PipelineColumn } from '../types';

function TableExpandIcon({
	expanded,
	onExpand,
	record,
}: TableExpandIconProps): JSX.Element {
	if (expanded) {
		return <DownOutlined onClick={(e): void => onExpand(record, e)} />;
	}
	return <RightOutlined onClick={(e): void => onExpand(record, e)} />;
}

interface TableExpandIconProps {
	expanded: boolean;
	onExpand: (record: PipelineColumn, e: React.MouseEvent<HTMLElement>) => void;
	record: PipelineColumn;
}

export default TableExpandIcon;
