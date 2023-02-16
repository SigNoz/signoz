import React from 'react';

import { EditOutlinedIcon, SmallEditOutlinedIcon } from '../../styles';

function EditAction({
	isPipelineAction,
	editAction,
}: EditActionProps): JSX.Element {
	return (
		<span key="edit-action">
			{isPipelineAction ? (
				<EditOutlinedIcon onClick={editAction} />
			) : (
				<SmallEditOutlinedIcon onClick={editAction} />
			)}
		</span>
	);
}

export interface EditActionProps {
	isPipelineAction: boolean;
	editAction: VoidFunction;
}
export default EditAction;
