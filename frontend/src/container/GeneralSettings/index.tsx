import { Button, Col, Modal, notification, Row, Typography } from 'antd';
import getDisks from 'api/disks/getDisks';
import getRetentionPeriodApi from 'api/settings/getRetention';
import setRetentionApi from 'api/settings/setRetention';
import Spinner from 'components/Spinner';
import TextToolTip from 'components/TextToolTip';
import useFetch from 'hooks/useFetch';
import convertIntoHr from 'lib/convertIntoHr';
import getSettingsPeroid from 'lib/getSettingsPeroid';
import { find } from 'lodash-es';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IDiskType } from 'types/api/disks/getDisks';
import { PayloadProps } from 'types/api/settings/getRetention';

import Retention from './Retention';
import {
	ButtonContainer,
	ErrorText,
	ErrorTextContainer,
	ToolTipContainer,
} from './styles';

function GeneralSettings(): JSX.Element {
	const [
		selectedMetricsPeroid,
		setSelectedMetricsPeroid,
	] = useState<SettingPeriod>('month');
	const [notifications, Element] = notification.useNotification();

	const [modal, setModal] = useState<boolean>(false);
	const [postApiLoading, setPostApiLoading] = useState<boolean>(false);

	const [isDefaultMetrics, setIsDefaultMetrics] = useState<boolean>(false);
	const [isDefaultTrace, setIsDefaultTrace] = useState<boolean>(false);

	const [availableDisks, setAvailableDisks] = useState<IDiskType | null>(null);

	useEffect(() => {
		getDisks().then((response) => setAvailableDisks(response));
	}, []);

	const { payload: currentTTLValues, loading, error, errorMessage } = useFetch<
		PayloadProps,
		undefined
	>(getRetentionPeriodApi, undefined);

	const [metricsTotalRetentionPeriod, setMetricsTotalRetentionPeriod] = useState<
		number | null
	>(currentTTLValues?.metrics_ttl_duration_hrs);
	const [metricsS3RetentionPeriod, setMetricsS3RetentionPeriod] = useState<
		number | null
	>(currentTTLValues?.metrics_move_ttl_duration_hrs);
	const [tracesTotalRetentionPeriod, setTracesTotalRetentionPeriod] = useState<
		number | null
	>(currentTTLValues?.traces_ttl_duration_hrs);
	const [tracesS3RetentionPeriod, setTracesS3RetentionPeriod] = useState<
		number | null
	>(currentTTLValues?.traces_move_ttl_duration_hrs);

	const onModalToggleHandler = (): void => {
		setModal((modal) => !modal);
	};

	const onClickSaveHandler = useCallback(() => {
		onModalToggleHandler();
	}, []);

	const checkMetricTraceDefault = (trace: number, metric: number): void => {
		if (metric === -1) {
			setIsDefaultMetrics(true);
		} else {
			setIsDefaultMetrics(false);
		}

		if (trace === -1) {
			setIsDefaultTrace(true);
		} else {
			setIsDefaultTrace(false);
		}
	};
	// const retentionRenderConfig = () => { };
	const renderConfig = useMemo(() => {
		const s3Enabled = !!find(
			availableDisks,
			(disks: IDiskType) => disks?.type === 's3',
		);
		return [
			{
				name: 'Metrics',
				retentionFields: [
					{
						name: 'Total Retention Period',
						value: metricsTotalRetentionPeriod,
						setValue: setMetricsTotalRetentionPeriod,
					},
					{
						name: `Move to S3\n(should be lower than total retention period)`,
						value: metricsS3RetentionPeriod,
						setValue: setMetricsS3RetentionPeriod,
						hide: !s3Enabled,
					},
				],
			},
			{
				name: 'Traces',
				retentionFields: [
					{
						name: 'Total Retention Period',
						value: tracesTotalRetentionPeriod,
						setValue: setTracesTotalRetentionPeriod,
					},
					{
						name: `Move to S3\n(should be lower than total retention period)`,
						value: tracesS3RetentionPeriod,
						setValue: setTracesS3RetentionPeriod,
						hide: !s3Enabled,
					},
				],
			},
		];
	}, [
		availableDisks,
		metricsS3RetentionPeriod,
		metricsTotalRetentionPeriod,
		tracesS3RetentionPeriod,
		tracesTotalRetentionPeriod,
	]);

	const onOkHandler = async (): Promise<void> => {
		try {
			setPostApiLoading(true);
			// const retentionTraceValue =
			// 	retentionPeroidTrace === '0' && (payload?.traces_ttl_duration_hrs || 0) < 0
			// 		? payload?.traces_ttl_duration_hrs || 0
			// 		: parseInt(retentionPeroidTrace, 10);
			// const retentionMetricsValue =
			// 	retentionPeroidMetrics === '0' &&
			// 		(payload?.metrics_ttl_duration_hrs || 0) < 0
			// 		? payload?.metrics_ttl_duration_hrs || 0
			// 		: parseInt(retentionPeroidMetrics, 10);
			const apiResponse = await setRetentionApi({
				metrics_ttl_duration_hrs: metricsTotalRetentionPeriod || -1,
				metrics_move_ttl_duration_hrs: metricsS3RetentionPeriod || -1,
				traces_move_ttl_duration_hrs: tracesS3RetentionPeriod || -1,
				traces_ttl_duration_hrs: tracesTotalRetentionPeriod || -1,
			});
			if (apiResponse.statusCode === 200) {
				notifications.success({
					message: 'Success!',
					placement: 'topRight',
					description: 'Congrats. The retention periods were updated correctly.',
				});
				// checkMetricTraceDefault(retentionTraceValue, retentionMetricsValue);
				onModalToggleHandler();
			} else {
				notifications.error({
					message: 'Error',
					description:
						'There was an issue in changing the retention period. Please try again or reach out to support@signoz.io',
					placement: 'topRight',
				});
			}
			setPostApiLoading(false);
		} catch (error) {
			notifications.error({
				message: 'Error',
				description:
					'There was an issue in changing the retention period. Please try again or reach out to support@signoz.io',
				placement: 'topRight',
			});
		}
	};

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (loading || currentTTLValues === undefined) {
		return <Spinner tip="Loading.." height="70vh" />;
	}

	const getErrorText = (): string => {
		const getValue = (value: string): string =>
			`Retention Peroid for ${value} is not set yet. Please set by choosing below`;

		if (!isDefaultMetrics && !isDefaultTrace) {
			return '';
		}

		if (isDefaultMetrics && !isDefaultTrace) {
			return `${getValue('Metrics')}`;
		}

		if (!isDefaultMetrics && isDefaultTrace) {
			return `${getValue('Trace')}`;
		}

		return `${getValue('Trace , Metrics')}`;
	};

	const isDisabledHandler = (): boolean => {
		return false;
	};

	const errorText = getErrorText();

	return (
		<Col xs={24} md={22} xl={20} xxl={18} style={{ margin: 'auto' }}>
			{Element}
			{errorText ? (
				<ErrorTextContainer>
					<ErrorText>{errorText}</ErrorText>

					<TextToolTip
						{...{
							text: `More details on how to set retention period`,
							url: 'https://signoz.io/docs/userguide/retention-period/',
						}}
					/>
				</ErrorTextContainer>
			) : (
				<ToolTipContainer>
					<TextToolTip
						{...{
							text: `More details on how to set retention period`,
							url: 'https://signoz.io/docs/userguide/retention-period/',
						}}
					/>
				</ToolTipContainer>
			)}
			<Row justify="space-around">
				{renderConfig.map((category): JSX.Element | null => {
					if (
						Array.isArray(category.retentionFields) &&
						category.retentionFields.length > 0
					) {
						return (
							<Col flex="48%" style={{ minWidth: 500 }} key={category.name}>
								<Typography.Title level={3}>{category.name}</Typography.Title>

								{category.retentionFields.map((retentionField) => (
									<Retention
										key={retentionField.name}
										text={retentionField.name}
										retentionValue={retentionField.value}
										setRetentionValue={retentionField.setValue}
										hide={!!retentionField.hide}
									/>
								))}
							</Col>
						);
					}
					return null;
				})}
			</Row>

			<Modal
				title="Are you sure you want to change the retention period?"
				focusTriggerAfterClose
				forceRender
				destroyOnClose
				closable
				onCancel={onModalToggleHandler}
				onOk={onOkHandler}
				centered
				visible={modal}
				confirmLoading={postApiLoading}
			>
				<Typography>
					This will change the amount of storage needed for saving metrics & traces.
				</Typography>
			</Modal>

			<ButtonContainer>
				<Button
					onClick={onClickSaveHandler}
					disabled={isDisabledHandler()}
					type="primary"
				>
					Save
				</Button>
			</ButtonContainer>
		</Col>
	);
}

export type SettingPeriod = 'hr' | 'day' | 'month';

export default GeneralSettings;
