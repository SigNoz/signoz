import { Space } from 'antd';
import React from 'react';

import { DeleteFilledIcon, EditOutlinedIcon, EyeFilledIcon } from '../styles';

function PipelineActions({
	editAction,
	deleteAction,
}: PipelineActionsProps): React.ReactElement {
	return (
		<Space size="middle">
			<span>
				<EditOutlinedIcon onClick={editAction} />
			</span>
			<span>
				<EyeFilledIcon />
			</span>
			<span>
				<DeleteFilledIcon onClick={deleteAction} />
			</span>
		</Space>
	);
}

interface PipelineActionsProps {
	editAction: VoidFunction;
	deleteAction: VoidFunction;
}
export default PipelineActions;
