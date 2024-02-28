import './IntegrationDetailPage.styles.scss';

import { Button, Typography } from 'antd';
import { ArrowLeftRight } from 'lucide-react';

import TestConnection from './TestConnection';

interface IntegrationDetailHeaderProps {
	id: string;
	title: string;
	description: string;
	icon: string;
}
function IntegrationDetailHeader(
	props: IntegrationDetailHeaderProps,
): JSX.Element {
	const { id, title, icon, description } = props;
	return (
		<div className="integration-connection-header">
			<div className="integration-detail-header" key={id}>
				<div className="image-container">
					<img src={icon} alt={title} className="image" />
				</div>
				<div className="details">
					<Typography.Text className="heading">{title}</Typography.Text>
					<Typography.Text className="description">{description}</Typography.Text>
				</div>
				<Button className="configure-btn" icon={<ArrowLeftRight size={14} />}>
					Connect {title}
				</Button>
			</div>
			<TestConnection />
		</div>
	);
}

export default IntegrationDetailHeader;
