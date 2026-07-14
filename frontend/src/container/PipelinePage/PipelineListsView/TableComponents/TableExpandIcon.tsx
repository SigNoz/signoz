import React from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import { PipelineData } from 'types/api/pipeline/def';
import { Flex } from 'antd';

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
		return (
			<Flex
				align="center"
				justify="center"
				data-testid="pipeline-row-collapse"
				onClick={handleOnExpand}
			>
				<ChevronDown size="2xl" />
			</Flex>
		);
	}
	return (
		<Flex
			align="center"
			justify="center"
			data-testid="pipeline-row-expand"
			onClick={handleOnExpand}
		>
			<ChevronRight size="2xl" />
		</Flex>
	);
}

interface TableExpandIconProps {
	expanded: boolean;
	onExpand: (record: PipelineData, e: React.MouseEvent<HTMLElement>) => void;
	record: PipelineData;
}

export default TableExpandIcon;
