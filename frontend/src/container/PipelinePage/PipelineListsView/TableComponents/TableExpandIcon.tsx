import { DownOutlined, RightOutlined } from '@ant-design/icons';
import React from 'react';
import { PipelineData } from 'types/api/pipeline/def';

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
	onExpand: (record: PipelineData, e: React.MouseEvent<HTMLElement>) => void;
	record: PipelineData;
}

export default TableExpandIcon;
