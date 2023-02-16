import { Switch } from 'antd';
import React from 'react';

import { HolderOutlinedIcon, LastActionColumn } from '../styles';

function DragAction(): React.ReactElement {
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
