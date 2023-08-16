import { CopyFilled, EyeFilled } from '@ant-design/icons';

import { iconStyle, smallIconStyle } from '../../config';

function ViewAction({ isPipelineAction }: ViewActionProps): JSX.Element {
	if (isPipelineAction) {
		return <EyeFilled style={iconStyle} />;
	}
	return (
		<span key="view-action">
			<CopyFilled style={smallIconStyle} />
		</span>
	);
}

export interface ViewActionProps {
	isPipelineAction: boolean;
}
export default ViewAction;
