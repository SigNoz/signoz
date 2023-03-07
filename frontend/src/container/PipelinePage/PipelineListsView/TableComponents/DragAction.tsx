import { Switch } from 'antd';
import React from 'react';

import {
	HolderIconWrapper,
	HolderOutlinedIcon,
	LastActionColumn,
} from '../styles';

function DragAction(): JSX.Element {
	return (
		<LastActionColumn>
			<span>
				<Switch />
			</span>
			<HolderIconWrapper>
				<HolderOutlinedIcon />
			</HolderIconWrapper>
		</LastActionColumn>
	);
}

export default DragAction;
