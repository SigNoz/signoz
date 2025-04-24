import './FunnelBreadcrumb.styles.scss';

import { Breadcrumb } from 'antd';
import ROUTES from 'constants/routes';
import { Link } from 'react-router-dom';

interface FunnelBreadcrumbProps {
	funnelName: string;
}

function FunnelBreadcrumb({ funnelName }: FunnelBreadcrumbProps): JSX.Element {
	const breadcrumbItems = [
		{
			title: (
				<Link to={ROUTES.TRACES_FUNNELS}>
					<span className="funnel-breadcrumb__link">
						<span className="funnel-breadcrumb__title">All funnels</span>
					</span>
				</Link>
			),
		},
		{
			title: <div className="funnel-breadcrumb__title">{funnelName}</div>,
		},
	];

	return (
		<div>
			<Breadcrumb className="funnel-breadcrumb" items={breadcrumbItems} />
		</div>
	);
}

export default FunnelBreadcrumb;
