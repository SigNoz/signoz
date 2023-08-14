import { EditOutlined } from '@ant-design/icons';

import { iconStyle, smallIconStyle } from '../../config';

function EditAction({
	isPipelineAction,
	editAction,
}: EditActionProps): JSX.Element {
	if (isPipelineAction) {
		return <EditOutlined style={iconStyle} onClick={editAction} />;
	}
	return (
		<span key="edit-action">
			<EditOutlined style={smallIconStyle} onClick={editAction} />
		</span>
	);
}

export interface EditActionProps {
	isPipelineAction: boolean;
	editAction: VoidFunction;
}
export default EditAction;
