import './IntegrationDetailContentTabs.styles.scss';

import { Typography } from 'antd';

interface OverviewProps {
	categories: string[];
	assets: {
		logs: {
			pipelines: Array<any>;
		};
		dashboards: Array<any>;
		alerts: Array<any>;
	};
	overviewContent: string;
}

function Overview(props: OverviewProps): JSX.Element {
	// TODO: Add markdown content for overview instructions
	const { categories, assets, overviewContent } = props;
	const assetsCount = [
		assets.logs.pipelines.length,
		assets.dashboards.length,
		assets.alerts.length,
	];

	const assetLabelMap = ['Pipelines', 'Dashboards', 'Alerts'];
	return (
		<div className="integration-detail-overview">
			<div className="integration-detail-overview-left-container">
				<div className="integration-detail-overview-category">
					<Typography.Text>Category</Typography.Text>
					<div className="category-tabs">
						{categories.map((category) => (
							<div key={category} className="category-tab">
								{category}
							</div>
						))}
					</div>
				</div>
				<div className="integration-detail-overview-assets">
					<Typography.Text>Assets</Typography.Text>
					<ul className="assets-list">
						{assetsCount.map((count, index) => {
							if (count === 0) {
								return undefined;
							}
							return (
								<li key={assetLabelMap[index]}>
									{count} {assetLabelMap[index]}
								</li>
							);
						})}
					</ul>
				</div>
			</div>
			<div className="integration-detail-overview-right-container">
				{overviewContent}
			</div>
		</div>
	);
}

export default Overview;
