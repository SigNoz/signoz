/* eslint-disable sonarjs/no-identical-functions */
import '../../EntityDetailsUtils/entityDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Divider, Drawer, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useIsDarkMode } from 'hooks/useDarkMode';
import GetMinMax from 'lib/getMinMax';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import VolumeMetrics from '../../EntityDetailsUtils/EntityMetrics';
import { getVolumeQueryPayload, volumeWidgetInfo } from './constants';
import { VolumeDetailsProps } from './VoumeDetails.interfaces';

function VolumeDetails({
	volume,
	onClose,
	isModalTimeSelection,
}: VolumeDetailsProps): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const startMs = useMemo(() => Math.floor(Number(minTime) / 1000000000), [
		minTime,
	]);
	const endMs = useMemo(() => Math.floor(Number(maxTime) / 1000000000), [
		maxTime,
	]);

	const [modalTimeRange, setModalTimeRange] = useState(() => ({
		startTime: startMs,
		endTime: endMs,
	}));

	const [selectedInterval, setSelectedInterval] = useState<Time>(
		selectedTime as Time,
	);

	const isDarkMode = useIsDarkMode();

	useEffect(() => {
		logEvent('Infra Monitoring: Volumes list details page visited', {
			volume: volume?.persistentVolumeClaimName,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setSelectedInterval(selectedTime as Time);

		if (selectedTime !== 'custom') {
			const { maxTime, minTime } = GetMinMax(selectedTime);

			setModalTimeRange({
				startTime: Math.floor(minTime / 1000000000),
				endTime: Math.floor(maxTime / 1000000000),
			});
		}
	}, [selectedTime, minTime, maxTime]);

	const handleTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			setSelectedInterval(interval as Time);

			if (interval === 'custom' && dateTimeRange) {
				setModalTimeRange({
					startTime: Math.floor(dateTimeRange[0] / 1000),
					endTime: Math.floor(dateTimeRange[1] / 1000),
				});
			} else {
				const { maxTime, minTime } = GetMinMax(interval);

				setModalTimeRange({
					startTime: Math.floor(minTime / 1000000000),
					endTime: Math.floor(maxTime / 1000000000),
				});
			}

			logEvent('Infra Monitoring: Volumes list details time updated', {
				volume: volume?.persistentVolumeClaimName,
				interval,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleClose = (): void => {
		setSelectedInterval(selectedTime as Time);

		if (selectedTime !== 'custom') {
			const { maxTime, minTime } = GetMinMax(selectedTime);

			setModalTimeRange({
				startTime: Math.floor(minTime / 1000000000),
				endTime: Math.floor(maxTime / 1000000000),
			});
		}
		onClose();
	};

	return (
		<Drawer
			width="70%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">
						{volume?.persistentVolumeClaimName}
					</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!volume}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="entity-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{volume && (
				<>
					<div className="entity-detail-drawer__entity">
						<div className="entity-details-grid">
							<div className="labels-row">
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									PVC Name
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									Cluster Name
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									Namespace Name
								</Typography.Text>
							</div>
							<div className="values-row">
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={volume.persistentVolumeClaimName}>
										{volume.persistentVolumeClaimName}
									</Tooltip>
								</Typography.Text>
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={volume.meta.k8s_cluster_name}>
										{volume.meta.k8s_cluster_name}
									</Tooltip>
								</Typography.Text>
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={volume.meta.k8s_namespace_name}>
										{volume.meta.k8s_namespace_name}
									</Tooltip>
								</Typography.Text>
							</div>
						</div>
					</div>

					<VolumeMetrics
						timeRange={modalTimeRange}
						isModalTimeSelection={isModalTimeSelection}
						handleTimeChange={handleTimeChange}
						selectedInterval={selectedInterval}
						entity={volume}
						entityWidgetInfo={volumeWidgetInfo}
						getEntityQueryPayload={getVolumeQueryPayload}
						queryKey="volumeMetrics"
						category={K8sCategory.VOLUMES}
					/>
				</>
			)}
		</Drawer>
	);
}

export default VolumeDetails;
