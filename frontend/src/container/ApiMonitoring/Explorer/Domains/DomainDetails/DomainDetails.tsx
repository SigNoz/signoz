import './DomainDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Radio, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import AllEndPoints from './AllEndPoints';
import DomainMetrics from './components/DomainMetrics';
import { VIEW_TYPES, VIEWS } from './constants';
import EndPointDetailsWrapper from './EndPointDetailsWrapper';

function DomainDetails({
	domainData,
	handleClose,
	selectedDomainIndex,
	setSelectedDomainIndex,
	domainListLength,
}: {
	domainData: any;
	handleClose: () => void;
	selectedDomainIndex: number;
	setSelectedDomainIndex: (index: number) => void;
	domainListLength: number;
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
				<div className="domain-details-drawer-header">
					<div className="domain-details-drawer-header-title">
						<Divider type="vertical" />
						<Typography.Text className="title">
							{domainData.domainName}
						</Typography.Text>
					</div>
					<Button.Group className="domain-details-drawer-header-ctas">
						<Button
							className="domain-navigate-cta"
							onClick={(): void => {
								setSelectedDomainIndex(selectedDomainIndex - 1);
								setSelectedEndPointName('');
							}}
							icon={<ArrowUp size={16} />}
							disabled={selectedDomainIndex === 0}
							title="Previous domain"
						/>
						<Button
							className="domain-navigate-cta"
							onClick={(): void => {
								setSelectedDomainIndex(selectedDomainIndex + 1);
								setSelectedEndPointName('');
							}}
							icon={<ArrowDown size={16} />}
							disabled={selectedDomainIndex === domainListLength - 1}
							title="Next domain"
						/>
					</Button.Group>
				</div>
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
						<EndPointDetailsWrapper
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
