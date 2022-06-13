import {
	DeleteOutlined,
	DownOutlined,
	EyeFilled,
	EyeInvisibleFilled,
	RightOutlined,
} from '@ant-design/icons';
import { Button, Row } from 'antd';
import React, { useState } from 'react';

import { QueryWrapper } from '../styles';

function QueryHeader(props): JSX.Element {
	const [collapse, setCollapse] = useState(false)
	return (
		<QueryWrapper>
			<Row style={{ justifyContent: 'space-between' }}>
				<Row>
					<Button
						type="ghost"
						icon={props.disabled ? <EyeInvisibleFilled /> : <EyeFilled />}
						onClick={props.onDisable}
					>
						{props.name}
					</Button>
					<Button
						type="ghost"
						icon={collapse ? <RightOutlined /> : <DownOutlined />}
						onClick={(): void => setCollapse(!collapse)}
					/>
				</Row>

				<Button
					type="ghost"
					danger
					icon={<DeleteOutlined />}
					onClick={props.onDelete}
				/>
			</Row>
			{!collapse && props.children}
		</QueryWrapper>
	);
}

export default QueryHeader;
