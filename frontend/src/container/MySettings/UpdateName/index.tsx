import { Button, Space, Typography } from 'antd';
import React, { useState } from 'react';

import { NameInput } from '../styles';

function UpdateName(): JSX.Element {
	const [changedName, setChangedName] = useState<string>('');

	return (
		<div>
			<Space direction="vertical" size="middle">
				<Typography>Name</Typography>
				<NameInput
					placeholder="Mike Tyson"
					onChange={(event): void => {
						setChangedName(event.target.value);
					}}
					value={changedName}
				/>
				<Button type="primary">Update Name</Button>
			</Space>
		</div>
	);
}

export default UpdateName;
