import React from 'react';

import { DeleteFilledIcon, SmallDeleteFilledIcon } from '../../styles';

function DeleteAction({
	isPipelineAction,
	deleteAction,
}: DeleteActionProps): JSX.Element {
	if (isPipelineAction) {
		return <DeleteFilledIcon onClick={deleteAction} />;
	}
	return (
		<span key="delete-action">
			<SmallDeleteFilledIcon onClick={deleteAction} />
		</span>
	);
}

export interface DeleteActionProps {
	isPipelineAction: boolean;
	deleteAction: VoidFunction;
}
export default DeleteAction;
