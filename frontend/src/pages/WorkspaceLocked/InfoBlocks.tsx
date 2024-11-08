import { Col, Row, Space, Typography } from 'antd';

interface InfoItem {
	title: string;
	description: string;
	id: string; // Add a unique identifier
}

interface InfoBlocksProps {
	items: InfoItem[];
}

function InfoBlocks({ items }: InfoBlocksProps): JSX.Element {
	return (
		<Space direction="vertical" size="middle">
			{items.map((item) => (
				<Row gutter={8} key={item.id}>
					<Col span={24}>
						<Typography.Title level={5}>{item.title}</Typography.Title>
					</Col>
					<Col span={24}>
						<Typography>{item.description}</Typography>
					</Col>
				</Row>
			))}
		</Space>
	);
}

export default InfoBlocks;
