import { Col, Row, Typography } from 'antd';
import { map } from 'lodash-es';

import DocCard from './DocCard';
import { TGetStartedContentSection } from './types';

interface IDocSectionProps {
	sectionData: TGetStartedContentSection;
}

function DocSection({ sectionData }: IDocSectionProps): JSX.Element {
	return (
		<div style={{ marginTop: '2rem' }}>
			<Typography.Text strong>{sectionData.heading}</Typography.Text>
			<Row
				gutter={{ xs: 0, sm: 8, md: 16, lg: 24 }}
				style={{ padding: '0 3%', marginTop: '0.5rem' }}
			>
				{sectionData.description && (
					<Col span={24}>
						<Typography.Text>{sectionData.description}</Typography.Text>
					</Col>
				)}
				{map(sectionData.items, (item, idx) => (
					<Col
						key={`${item.title}+${idx}`}
						sm={24}
						md={12}
						lg={12}
						xl={8}
						xxl={6}
						style={{ margin: '1rem 0' }}
					>
						<DocCard icon={item.icon} text={item.title} url={item.url} />
					</Col>
				))}
			</Row>
		</div>
	);
}

export default DocSection;
