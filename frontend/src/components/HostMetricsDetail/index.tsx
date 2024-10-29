import './HostMetricsDetail.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Divider, Drawer, Progress, Radio, Tag, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	BarChart2,
	ChevronsLeftRight,
	DraftingCompass,
	Package2,
	ScrollText,
	X,
} from 'lucide-react';
import { useState } from 'react';

import { VIEW_TYPES, VIEWS } from './constants';
import Containers from './Containers';
import { HostDetailProps } from './HostMetricDetail.interfaces';
import Metrics from './Metrics/Metrics';
import Processes from './Processes';

function HostMetricDetail({ host, onClose }: HostDetailProps): JSX.Element {
	const [selectedView, setSelectedView] = useState<VIEWS>(VIEWS.CONTAINERS);
	const isDarkMode = useIsDarkMode();

	const handleModeChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

	return (
		<Drawer
			width="55%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">{host?.hostName}</Typography.Text>
				</>
			}
			placement="right"
			onClose={onClose}
			open={!!host}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="host-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{host && (
				<>
					<div className="host-detail-drawer__host">
						<div className="host-details-grid">
							<div className="labels-row">
								<Typography.Text type="secondary">STATUS</Typography.Text>
								<Typography.Text type="secondary">OPERATING SYSTEM</Typography.Text>
								<Typography.Text type="secondary">CPU USAGE</Typography.Text>
								<Typography.Text type="secondary">MEMORY USAGE</Typography.Text>
							</div>
							<div className="values-row">
								<Tag
									color={host.active ? 'success' : 'default'}
									bordered
									className="infra-monitoring-tags"
								>
									{host.active ? 'ACTIVE' : 'INACTIVE'}
								</Tag>
								<Tag className="infra-monitoring-tags" bordered>
									{host.os}
								</Tag>
								<div className="progress-container">
									<Progress
										percent={Number((host.cpu * 100).toFixed(1))}
										size="small"
										strokeColor={((): string => {
											const cpuPercent = Number((host.cpu * 100).toFixed(1));
											if (cpuPercent >= 90) return Color.BG_SAKURA_500;
											if (cpuPercent >= 60) return Color.BG_AMBER_500;
											return Color.BG_FOREST_500;
										})()}
										className="progress-bar"
									/>
								</div>
								<div className="progress-container">
									<Progress
										percent={Number((host.memory * 100).toFixed(1))}
										size="small"
										strokeColor={((): string => {
											const memoryPercent = Number((host.memory * 100).toFixed(1));
											if (memoryPercent >= 90) return Color.BG_CHERRY_500;
											if (memoryPercent >= 60) return Color.BG_AMBER_500;
											return Color.BG_FOREST_500;
										})()}
										className="progress-bar"
									/>
								</div>
							</div>
						</div>
					</div>

					<Radio.Group
						className="views-tabs"
						onChange={handleModeChange}
						value={selectedView}
					>
						<Radio.Button
							className={
								// eslint-disable-next-line sonarjs/no-duplicate-string
								selectedView === VIEW_TYPES.CONTAINERS ? 'selected_view tab' : 'tab'
							}
							value={VIEW_TYPES.CONTAINERS}
						>
							<div className="view-title">
								<Package2 size={14} />
								Containers
							</div>
						</Radio.Button>
						<Radio.Button
							className={
								selectedView === VIEW_TYPES.PROCESSES ? 'selected_view tab' : 'tab'
							}
							value={VIEW_TYPES.PROCESSES}
						>
							<div className="view-title">
								<ChevronsLeftRight size={14} />
								Processes
							</div>
						</Radio.Button>
						<Radio.Button
							className={
								selectedView === VIEW_TYPES.METRICS ? 'selected_view tab' : 'tab'
							}
							value={VIEW_TYPES.METRICS}
						>
							<div className="view-title">
								<BarChart2 size={14} />
								Metrics
							</div>
						</Radio.Button>
						<Radio.Button
							className={
								selectedView === VIEW_TYPES.LOGS ? 'selected_view tab' : 'tab'
							}
							value={VIEW_TYPES.LOGS}
						>
							<div className="view-title">
								<ScrollText size={14} />
								Logs
							</div>
						</Radio.Button>
						<Radio.Button
							className={
								selectedView === VIEW_TYPES.TRACES ? 'selected_view tab' : 'tab'
							}
							value={VIEW_TYPES.TRACES}
						>
							<div className="view-title">
								<DraftingCompass size={14} />
								Traces
							</div>
						</Radio.Button>
					</Radio.Group>

					{selectedView === VIEW_TYPES.CONTAINERS && <Containers />}
					{selectedView === VIEW_TYPES.PROCESSES && <Processes />}
					{selectedView === VIEW_TYPES.METRICS && (
						<Metrics hostName={host.hostName} />
					)}
				</>
			)}
		</Drawer>
	);
}

export default HostMetricDetail;
