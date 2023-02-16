import React from 'react';

import { DeleteFilledIcon, SmallDeleteFilledIcon } from '../../styles';

function DeleteAction({
	isPipelineAction,
	deleteAction,
}: DeleteActionProps): JSX.Element {
	return (
		<span key="delete-action">
			{isPipelineAction ? (
				<DeleteFilledIcon onClick={deleteAction} />
			) : (
				<SmallDeleteFilledIcon onClick={deleteAction} />
			)}
		</span>
	);
}

export interface DeleteActionProps {
	isPipelineAction: boolean;
	deleteAction: VoidFunction;
}
export default DeleteAction;
