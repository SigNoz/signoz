import './DomainDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Divider, Drawer, Progress, Radio, Tooltip, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import { getLastUsedRelativeTime } from 'container/ApiMonitoring/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { X } from 'lucide-react';
import { useState } from 'react';

import AllEndPoints from './AllEndPoints';
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
					<div className="entity-detail-drawer__entity">
						<div className="entity-details-grid">
							<div className="labels-row">
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									EXTERNAL API
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									AVERAGE LATENCY
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									ERROR RATE
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									LAST USED
								</Typography.Text>
							</div>

							<div className="values-row">
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={domainData.endpointCount}>
										<span className="round-metric-tag">{domainData.endpointCount}</span>
									</Tooltip>
								</Typography.Text>
								{/* // update the tooltip as well */}
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={domainData.latency}>
										<span className="round-metric-tag">
											{(domainData.latency / 1000).toFixed(3)}s
										</span>
									</Tooltip>
								</Typography.Text>
								{/* // update the tooltip as well */}
								<Typography.Text className="entity-details-metadata-value error-rate">
									<Tooltip title={domainData.errorRate}>
										<Progress
											percent={Number((domainData.errorRate * 100).toFixed(1))}
											strokeLinecap="butt"
											size="small"
											strokeColor={((): string => {
												const errorRatePercent = Number(
													(domainData.errorRate * 100).toFixed(1),
												);
												if (errorRatePercent >= 90) return Color.BG_SAKURA_500;
												if (errorRatePercent >= 60) return Color.BG_AMBER_500;
												return Color.BG_FOREST_500;
											})()}
											className="progress-bar"
										/>
									</Tooltip>
								</Typography.Text>
								{/* // update the tooltip as well */}
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={domainData.lastUsed}>
										{getLastUsedRelativeTime(domainData.lastUsed)}
									</Tooltip>
								</Typography.Text>
							</div>
						</div>
					</div>

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
