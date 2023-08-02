import { DownOutlined, RightOutlined } from '@ant-design/icons';
import React from 'react';
import { PipelineData } from 'types/api/pipeline/def';

function TableExpandIcon({
	expanded,
	onExpand,
	record,
}: TableExpandIconProps): JSX.Element {
	const handleOnExpand = (
		e: React.MouseEvent<HTMLElement, MouseEvent>,
	): void => {
		onExpand(record, e);
	};

	if (expanded) {
		return <DownOutlined onClick={handleOnExpand} />;
	}
	return <RightOutlined onClick={handleOnExpand} />;
}

interface TableExpandIconProps {
	expanded: boolean;
	onExpand: (record: PipelineData, e: React.MouseEvent<HTMLElement>) => void;
	record: PipelineData;
}

export default TableExpandIcon;
