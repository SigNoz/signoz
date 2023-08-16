import { DeleteOutlined } from '@ant-design/icons';
import { Col, Row, Typography } from 'antd';

import { MenuItemContainer } from './styles';

function MenuItemGenerator({
	viewName,
	createdBy,
	uuid,
}: MenuItemLabelGeneratorProps): JSX.Element {
	console.log('uuid', uuid);

	return (
		<MenuItemContainer>
			<Row justify="space-between">
				<Col span={22}>
					<Typography.Text strong>{viewName}</Typography.Text>
				</Col>
				<Col span={2}>
					<Typography.Link>
						<DeleteOutlined />
					</Typography.Link>
				</Col>
			</Row>
			<Row>
				<Col span={24}>
					<Typography.Text type="secondary">Created by {createdBy}</Typography.Text>
				</Col>
			</Row>
		</MenuItemContainer>
	);
}

interface MenuItemLabelGeneratorProps {
	viewName: string;
	createdBy: string;
	uuid: string;
}

export default MenuItemGenerator;
