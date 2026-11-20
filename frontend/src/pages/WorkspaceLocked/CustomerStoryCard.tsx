import { Avatar } from '@signozhq/ui/avatar';
import { Card } from 'antd';
import Space from 'periscope/components/Space/Space';

import './customerStoryCard.styles.scss';

interface CustomerStoryCardProps {
	avatar: string;
	personName: string;
	role: string;
	message: string;
	link: string;
}

function CustomerStoryCard({
	avatar,
	personName,
	role,
	message,
	link,
}: CustomerStoryCardProps): JSX.Element {
	return (
		<a href={link} target="_blank" rel="noopener noreferrer">
			<Card className="customer-story-card">
				<Space size="middle" direction="vertical">
					<Card.Meta
						avatar={<Avatar size="xl" src={avatar} />}
						title={personName}
						description={role}
					/>
					{message}
				</Space>
			</Card>
		</a>
	);
}

export default CustomerStoryCard;
