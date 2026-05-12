import { Trash2 } from '@signozhq/icons';

import { iconStyle, smallIconStyle } from '../../config';

function DeleteAction({
	isPipelineAction,
	deleteAction,
}: DeleteActionProps): JSX.Element {
	if (isPipelineAction) {
		return (
			<Trash2
				size="lg"
				onClick={deleteAction}
				style={iconStyle}
				data-testid="pipeline-delete-action"
			/>
		);
	}
	return (
		<span key="delete-action">
			<Trash2
				size="lg"
				onClick={deleteAction}
				style={smallIconStyle}
				data-testid="pipeline-delete-action"
			/>
		</span>
	);
}

export interface DeleteActionProps {
	isPipelineAction: boolean;
	deleteAction: VoidFunction;
}
export default DeleteAction;
