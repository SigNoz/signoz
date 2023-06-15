import { CloseOutlined, EditFilled } from '@ant-design/icons';

import ICloseWrapperIcon from '../interfaces/ICloseWrapperIcon';
import { CloseWrapperIconDiv } from '../styles/Log';

function CloseWrapperIcon({ toggleInput }: ICloseWrapperIcon): JSX.Element {
	return (
		<CloseWrapperIconDiv>
			<span role="button" aria-hidden="true" onClick={toggleInput}>
				<EditFilled />
			</span>
			<CloseOutlined />
		</CloseWrapperIconDiv>
	);
}

export default CloseWrapperIcon;
