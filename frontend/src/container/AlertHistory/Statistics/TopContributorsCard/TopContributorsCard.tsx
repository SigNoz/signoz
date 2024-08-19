import './topContributorsCard.styles.scss';

import { Button } from 'antd';
import history from 'lib/history';
import { ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import TopContributorsContent from './TopContributorsContent';
import { TopContributorsCardProps } from './types';
import ViewAllDrawer from './ViewAllDrawer';

function TopContributorsCard({
	topContributorsData,
	totalCurrentTriggers,
}: TopContributorsCardProps): JSX.Element {
	const { search } = useLocation();
	const searchParams = useMemo(() => new URLSearchParams(search), [search]);

	const viewAllTopContributorsParam = searchParams.get('viewAllTopContributors');

	const [isViewAllVisible, setIsViewAllVisible] = useState(
		!!viewAllTopContributorsParam ?? false,
	);

	const toggleViewAllParam = (isOpen: boolean): void => {
		if (isOpen) {
			searchParams.set('viewAllTopContributors', 'true');
		} else {
			searchParams.delete('viewAllTopContributors');
		}
	};

	const toggleViewAllDrawer = (): void => {
		setIsViewAllVisible((prev) => {
			const newState = !prev;

			toggleViewAllParam(newState);

			return newState;
		});
		history.push({ search: searchParams.toString() });
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
