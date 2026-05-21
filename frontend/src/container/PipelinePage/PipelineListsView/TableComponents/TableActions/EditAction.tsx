import { PencilLine } from '@signozhq/icons';
import { iconStyle, smallIconStyle } from '../../config';

function EditAction({
	isPipelineAction,
	editAction,
}: EditActionProps): JSX.Element {
	if (isPipelineAction) {
		return (
			<PencilLine
				size="lg"
				style={iconStyle}
				onClick={editAction}
				data-testid="pipeline-edit-action"
			/>
		);
	}
	return (
		<span key="edit-action">
			<PencilLine
				size="lg"
				style={smallIconStyle}
				onClick={editAction}
				data-testid="pipeline-edit-action"
			/>
		</span>
	);
}

export interface EditActionProps {
	isPipelineAction: boolean;
	editAction: VoidFunction;
}
export default EditAction;
