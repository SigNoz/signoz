import { Switch } from 'antd';
import React from 'react';

import {
	HolderIconWrapper,
	HolderOutlinedIcon,
	LastActionColumn,
} from '../styles';

function DragAction({ isEnabled, onChange }: DragActionProps): JSX.Element {
	return (
		<LastActionColumn>
			<span>
				<Switch defaultChecked={isEnabled} onChange={onChange} />
			</span>
			<HolderIconWrapper>
				<HolderOutlinedIcon />
			</HolderIconWrapper>
		</LastActionColumn>
	);
}

interface DragActionProps {
	isEnabled: boolean;
	onChange: (checked: boolean) => void;
}

export default DragAction;
