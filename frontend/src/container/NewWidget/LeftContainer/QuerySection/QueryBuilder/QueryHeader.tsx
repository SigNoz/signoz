import './QueryHeader.styles.scss';

import {
	DeleteOutlined,
	DownOutlined,
	EyeFilled,
	EyeInvisibleFilled,
	RightOutlined,
} from '@ant-design/icons';
import { Button, Row } from 'antd';
import { ReactNode, useState } from 'react';

import { QueryWrapper } from '../styles';

interface IQueryHeaderProps {
	disabled: boolean;
	onDisable: VoidFunction;
	name: string;
	deletable: boolean;
	onDelete: VoidFunction;
	children: ReactNode;
}

function QueryHeader({
	disabled,
	onDisable,
	name,
	onDelete,
	deletable,
	children,
}: IQueryHeaderProps): JSX.Element {
	const [collapse, setCollapse] = useState(false);
	return (
		<QueryWrapper className="query-header-container">
			<Row style={{ justifyContent: 'space-between', marginBottom: '0.4rem' }}>
				<Row>
					<Button
						type="default"
						icon={disabled ? <EyeInvisibleFilled /> : <EyeFilled />}
						onClick={onDisable}
						className="action-btn"
					>
						{name}
					</Button>
					<Button
						type="default"
						icon={collapse ? <RightOutlined /> : <DownOutlined />}
						onClick={(): void => setCollapse(!collapse)}
						className="action-btn"
					/>
				</Row>

				{deletable && (
					<Button
						type="default"
						danger
						icon={<DeleteOutlined />}
						onClick={onDelete}
						className="action-btn"
					/>
				)}
			</Row>
			{!collapse && children}
		</QueryWrapper>
	);
}

export default QueryHeader;
