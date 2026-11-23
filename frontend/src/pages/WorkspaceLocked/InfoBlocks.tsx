import Space from 'periscope/components/Space/Space';
import Col from 'periscope/components/Col/Col';
import Row from 'periscope/components/Row/Row';
import { Typography } from '@signozhq/ui/typography';

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
						<Typography
							variant="paragraph"
							size="medium"
							weight="bold"
							color="inherit"
							as="h5"
							marginY={4}
							textOverflow="wrap"
						>
							{item.title}
						</Typography>
					</Col>
					<Col span={24}>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							{item.description}
						</Typography>
					</Col>
				</Row>
			))}
		</Space>
	);
}

export default InfoBlocks;
