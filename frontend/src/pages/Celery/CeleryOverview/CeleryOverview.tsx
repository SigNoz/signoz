import './CeleryOverview.styles.scss';

import CeleryOverviewConfigOptions from 'components/CeleryOverview/CeleryOverviewConfigOptions/CeleryOverviewConfigOptions';
import CeleryOverviewTable from 'components/CeleryOverview/CeleryOverviewTable/CeleryOverviewTable';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { ListMinus } from 'lucide-react';

export default function CeleryOverview(): JSX.Element {
	return (
		<div className="celery-overview-container">
			<div className="celery-overview-breadcrumb">
				<ListMinus size={16} />
				Messaging Queues / Celery Overview
			</div>
			<div className="celery-overview-content">
				<div className="celery-overview-content-header">
					<p className="celery-overview-content-header-title">Celery Overview</p>
					<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
				</div>
				<CeleryOverviewConfigOptions />
				<CeleryOverviewTable />
			</div>
		</div>
	);
}
