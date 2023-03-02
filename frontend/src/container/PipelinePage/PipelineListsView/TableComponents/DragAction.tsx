import { Switch } from 'antd';
import React from 'react';

import { HolderOutlinedIcon, LastActionColumn } from '../styles';

function DragAction(): JSX.Element {
	return (
		<LastActionColumn>
			<span>
				<Switch />
			</span>
			<span style={{ cursor: 'move' }}>
				<HolderOutlinedIcon />
			</span>
		</LastActionColumn>
	);
}

export default DragAction;
