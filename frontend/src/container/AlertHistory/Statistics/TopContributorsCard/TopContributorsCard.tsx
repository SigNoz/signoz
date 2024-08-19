import './topContributorsCard.styles.scss';

import { Button } from 'antd';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

import TopContributorsContent from './TopContributorsContent';
import { TopContributorsCardProps } from './types';
import ViewAllDrawer from './ViewAllDrawer';

function TopContributorsCard({
	topContributorsData,
	totalCurrentTriggers,
}: TopContributorsCardProps): JSX.Element {
	const [isViewAllVisible, setIsViewAllVisible] = useState(false);
	const toggleViewAllDrawer = (): void => {
		setIsViewAllVisible((prev) => !prev);
	};

	return (
		<>
			<div className="top-contributors-card">
				<div className="top-contributors-card__header">
					<div className="title">top contributors</div>
					{topContributorsData.length > 3 && (
						<Button type="text" className="view-all" onClick={toggleViewAllDrawer}>
							<div className="label">View all</div>
							<div className="icon">
								<ArrowRight size={14} color="var(--bg-vanilla-400)" />
							</div>
						</Button>
					)}
				</div>

				<TopContributorsContent
					topContributorsData={topContributorsData}
					totalCurrentTriggers={totalCurrentTriggers}
				/>
			</div>
			{isViewAllVisible && (
				<ViewAllDrawer
					isViewAllVisible={isViewAllVisible}
					toggleViewAllDrawer={toggleViewAllDrawer}
					totalCurrentTriggers={totalCurrentTriggers}
					topContributorsData={topContributorsData}
				/>
			)}
		</>
	);
}

export default TopContributorsCard;
