import React from 'react';

import { EditOutlinedIcon, SmallEditOutlinedIcon } from '../../styles';

function EditAction({
	isPipelineAction,
	editAction,
}: EditActionProps): JSX.Element {
	if (isPipelineAction) {
		return <EditOutlinedIcon onClick={editAction} />;
	}
	return (
		<span key="delete-action">
			<SmallEditOutlinedIcon onClick={editAction} />
		</span>
	);
}

export interface EditActionProps {
	isPipelineAction: boolean;
	editAction: VoidFunction;
}
export default EditAction;
