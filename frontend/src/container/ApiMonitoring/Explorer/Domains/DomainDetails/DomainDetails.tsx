import './DomainDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Divider, Drawer, Radio, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { X } from 'lucide-react';
import { useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import AllEndPoints from './AllEndPoints';
import DomainMetrics from './components/DomainMetrics';
import { VIEW_TYPES, VIEWS } from './constants';
import EndPointDetails from './EndPointDetails';

function DomainDetails({
	domainData,
	handleClose,
}: {
	domainData: any;
	handleClose: () => void;
}): JSX.Element {
	const [selectedView, setSelectedView] = useState<VIEWS>(VIEWS.ALL_ENDPOINTS);
	const [selectedEndPointName, setSelectedEndPointName] = useState<string>('');
	const [endPointsGroupBy, setEndPointsGroupBy] = useState<
		IBuilderQuery['groupBy']
	>([]);
	const isDarkMode = useIsDarkMode();

	const handleTabChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

	return (
		<Drawer
			width="60%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">
						{domainData.domainName}
					</Typography.Text>
					{/* add the navigation buttons for domain */}
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!domainData}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="entity-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{domainData && (
				<>
					<DomainMetrics domainData={domainData} />
					<div className="views-tabs-container">
						<Radio.Group
							className="views-tabs"
							onChange={handleTabChange}
							value={selectedView}
						>
							<Radio.Button
								className={
									// eslint-disable-next-line sonarjs/no-duplicate-string
									selectedView === VIEW_TYPES.ALL_ENDPOINTS ? 'selected_view tab' : 'tab'
								}
								value={VIEW_TYPES.ALL_ENDPOINTS}
							>
								<div className="view-title">All Endpoints</div>
							</Radio.Button>
							<Radio.Button
								className={
									selectedView === VIEW_TYPES.ENDPOINT_DETAILS
										? 'tab selected_view'
										: 'tab'
								}
								value={VIEW_TYPES.ENDPOINT_DETAILS}
							>
								<div className="view-title">Endpoint Details</div>
							</Radio.Button>
						</Radio.Group>
					</div>
					{selectedView === VIEW_TYPES.ALL_ENDPOINTS && (
						<AllEndPoints
							domainName={domainData.domainName}
							setSelectedEndPointName={setSelectedEndPointName}
							setSelectedView={setSelectedView}
							groupBy={endPointsGroupBy}
							setGroupBy={setEndPointsGroupBy}
						/>
					)}

					{selectedView === VIEW_TYPES.ENDPOINT_DETAILS && (
						<EndPointDetails
							domainName={domainData.domainName}
							endPointName={selectedEndPointName}
							setSelectedEndPointName={setSelectedEndPointName}
						/>
					)}
				</>
			)}
		</Drawer>
	);
}

export default DomainDetails;
