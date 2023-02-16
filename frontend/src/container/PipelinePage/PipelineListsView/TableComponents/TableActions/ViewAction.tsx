import React from 'react';

import { CopyFilledIcon, EyeFilledIcon } from '../../styles';

function ViewAction({ isPipelineAction }: ViewActionProps): JSX.Element {
	return (
		<span key="view-action">
			{isPipelineAction ? <EyeFilledIcon /> : <CopyFilledIcon />}
		</span>
	);
}

export interface ViewActionProps {
	isPipelineAction: boolean;
}
export default ViewAction;
