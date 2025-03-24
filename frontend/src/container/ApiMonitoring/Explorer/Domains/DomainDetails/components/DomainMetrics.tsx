import { Color } from '@signozhq/design-tokens';
import { Progress, Tooltip, Typography } from 'antd';
import { getLastUsedRelativeTime } from 'container/ApiMonitoring/utils';

function DomainMetrics({ domainData }: { domainData: any }): JSX.Element {
	return (
		<div className="domain-detail-drawer__endpoint">
			<div className="domain-details-grid">
				<div className="labels-row">
					<Typography.Text
						type="secondary"
						className="domain-details-metadata-label"
					>
						EXTERNAL API
					</Typography.Text>
					<Typography.Text
						type="secondary"
						className="domain-details-metadata-label"
					>
						AVERAGE LATENCY
					</Typography.Text>
					<Typography.Text
						type="secondary"
						className="domain-details-metadata-label"
					>
						ERROR RATE
					</Typography.Text>
					<Typography.Text
						type="secondary"
						className="domain-details-metadata-label"
					>
						LAST USED
					</Typography.Text>
				</div>

				<div className="values-row">
					<Typography.Text className="domain-details-metadata-value">
						<Tooltip title={domainData.endpointCount}>
							<span className="round-metric-tag">{domainData.endpointCount}</span>
						</Tooltip>
					</Typography.Text>
					{/* // update the tooltip as well */}
					<Typography.Text className="domain-details-metadata-value">
						<Tooltip title={domainData.latency}>
							<span className="round-metric-tag">
								{(domainData.latency / 1000).toFixed(3)}s
							</span>
						</Tooltip>
					</Typography.Text>
					{/* // update the tooltip as well */}
					<Typography.Text className="domain-details-metadata-value error-rate">
						<Tooltip title={domainData.errorRate}>
							<Progress
								status="active"
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
					<Typography.Text className="domain-details-metadata-value">
						<Tooltip title={domainData.lastUsed}>
							{getLastUsedRelativeTime(domainData.lastUsed)}
						</Tooltip>
					</Typography.Text>
				</div>
			</div>
		</div>
	);
}

export default DomainMetrics;
