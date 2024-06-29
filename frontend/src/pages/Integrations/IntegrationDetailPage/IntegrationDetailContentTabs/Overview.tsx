import './IntegrationDetailContentTabs.styles.scss';

import { Typography } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

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
	const { categories, assets, overviewContent } = props;
	const assetsCount = [
		assets?.logs?.pipelines?.length || 0,
		assets?.dashboards?.length || 0,
		assets?.alerts?.length || 0,
	];

	const assetLabelMap = ['Pipelines', 'Dashboards', 'Alerts'];

	return (
		<div className="integration-detail-overview">
			<div className="integration-detail-overview-left-container">
				<div className="integration-detail-overview-category">
					<Typography.Text className="heading">Category</Typography.Text>
					<div className="category-tabs">
						{categories.map((category) => (
							<div key={category} className="category-tab">
								{category}
							</div>
						))}
					</div>
				</div>
				<div className="integration-detail-overview-assets">
					<Typography.Text className="heading">Assets</Typography.Text>
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
				<MarkdownRenderer variables={{}} markdownContent={overviewContent} />
			</div>
		</div>
	);
}

export default Overview;
