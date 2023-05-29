import { CloseOutlined, EditFilled } from '@ant-design/icons';
import { MouseEventHandler } from 'react';

import ICloseWrapperIcon from '../interfaces/ICloseWrapperIcon';

function CloseWrapperIcon({ toggleInput }: ICloseWrapperIcon): JSX.Element {
	const handleClick: MouseEventHandler<Element> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		toggleInput();
	};

	return (
		<div style={{ display: 'flex', gap: 20, marginLeft: -33 }}>
			<span role="button" aria-hidden="true" onClick={handleClick}>
				<EditFilled />
			</span>
			<CloseOutlined />
		</div>
	);
}

export default CloseWrapperIcon;
