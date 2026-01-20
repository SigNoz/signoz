import './CeleryOverview.styles.scss';

import CeleryOverviewConfigOptions from 'components/CeleryOverview/CeleryOverviewConfigOptions/CeleryOverviewConfigOptions';
import CeleryOverviewTable, {
	RowData,
} from 'components/CeleryOverview/CeleryOverviewTable/CeleryOverviewTable';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useState } from 'react';

import CeleryOverviewDetails from './CeleryOverviewDetail/CeleryOverviewDetails';

export default function CeleryOverview(): JSX.Element {
	const [details, setDetails] = useState<RowData | null>(null);

	const onRowClick = (record: RowData): void => {
		setDetails(record);
	};

	return (
		<div className="celery-overview-container">
			<div className="celery-overview-content">
				<div className="celery-overview-content-header">
					<p className="celery-overview-content-header-title">
						Messaging Queue Overview
					</p>
					<DateTimeSelectionV2 showAutoRefresh hideShareModal={false} />
				</div>
				<CeleryOverviewConfigOptions />
				<CeleryOverviewTable onRowClick={onRowClick} />
			</div>
			{details && (
				<CeleryOverviewDetails
					details={details}
					onClose={(): void => {
						setDetails(null);
					}}
				/>
			)}
		</div>
	);
}
