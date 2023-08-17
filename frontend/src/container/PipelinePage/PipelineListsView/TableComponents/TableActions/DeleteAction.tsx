import { DeleteFilled } from '@ant-design/icons';

import { iconStyle, smallIconStyle } from '../../config';

function DeleteAction({
	isPipelineAction,
	deleteAction,
}: DeleteActionProps): JSX.Element {
	if (isPipelineAction) {
		return <DeleteFilled onClick={deleteAction} style={iconStyle} />;
	}
	return (
		<span key="delete-action">
			<DeleteFilled onClick={deleteAction} style={smallIconStyle} />
		</span>
	);
}

export interface DeleteActionProps {
	isPipelineAction: boolean;
	deleteAction: VoidFunction;
}
export default DeleteAction;
