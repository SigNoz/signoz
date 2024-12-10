/* eslint-disable sonarjs/no-duplicate-string */
import { LoadingOutlined } from '@ant-design/icons';
import { Button, Card, Col, Divider, Modal, Row, Spin, Typography } from 'antd';
import setRetentionApi from 'api/settings/setRetention';
import TextToolTip from 'components/TextToolTip';
import GeneralSettingsCloud from 'container/GeneralSettingsCloud';
import useComponentPermission from 'hooks/useComponentPermission';
import { useNotifications } from 'hooks/useNotifications';
import find from 'lodash-es/find';
import { useAppContext } from 'providers/App/App';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UseQueryResult } from 'react-query';
import { useInterval } from 'react-use';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	IDiskType,
	PayloadProps as GetDisksPayload,
} from 'types/api/disks/getDisks';
import { TTTLType } from 'types/api/settings/common';
import {
	PayloadPropsLogs as GetRetentionPeriodLogsPayload,
	PayloadPropsMetrics as GetRetentionPeriodMetricsPayload,
	PayloadPropsTraces as GetRetentionPeriodTracesPayload,
} from 'types/api/settings/getRetention';
import { isCloudUser } from 'utils/app';

import Retention from './Retention';
import StatusMessage from './StatusMessage';
import { ActionItemsContainer, ErrorText, ErrorTextContainer } from './styles';

type NumberOrNull = number | null;

function GeneralSettings({
	metricsTtlValuesPayload,
	tracesTtlValuesPayload,
	logsTtlValuesPayload,
	getAvailableDiskPayload,
	metricsTtlValuesRefetch,
	tracesTtlValuesRefetch,
	logsTtlValuesRefetch,
}: GeneralSettingsProps): JSX.Element {
	const { t } = useTranslation(['generalSettings']);
	const [modalMetrics, setModalMetrics] = useState<boolean>(false);
	const [modalTraces, setModalTraces] = useState<boolean>(false);
	const [modalLogs, setModalLogs] = useState<boolean>(false);

	const [postApiLoadingMetrics, setPostApiLoadingMetrics] = useState<boolean>(
		false,
	);
	const [postApiLoadingTraces, setPostApiLoadingTraces] = useState<boolean>(
		false,
	);
	const [postApiLoadingLogs, setPostApiLoadingLogs] = useState<boolean>(false);

	const [availableDisks] = useState<IDiskType[]>(getAvailableDiskPayload);

	const [metricsCurrentTTLValues, setMetricsCurrentTTLValues] = useState(
		metricsTtlValuesPayload,
	);
	const [tracesCurrentTTLValues, setTracesCurrentTTLValues] = useState(
		tracesTtlValuesPayload,
	);

	const [logsCurrentTTLValues, setLogsCurrentTTLValues] = useState(
		logsTtlValuesPayload,
	);

	const { user } = useAppContext();

	const [setRetentionPermission] = useComponentPermission(
		['set_retention_period'],
		user.role,
	);

	const [
		metricsTotalRetentionPeriod,
		setMetricsTotalRetentionPeriod,
	] = useState<NumberOrNull>(null);
	const [
		metricsS3RetentionPeriod,
		setMetricsS3RetentionPeriod,
	] = useState<NumberOrNull>(null);
	const [
		tracesTotalRetentionPeriod,
		setTracesTotalRetentionPeriod,
	] = useState<NumberOrNull>(null);
	const [
		tracesS3RetentionPeriod,
		setTracesS3RetentionPeriod,
	] = useState<NumberOrNull>(null);

	const [
		logsTotalRetentionPeriod,
		setLogsTotalRetentionPeriod,
	] = useState<NumberOrNull>(null);
	const [
		logsS3RetentionPeriod,
		setLogsS3RetentionPeriod,
	] = useState<NumberOrNull>(null);

	useEffect(() => {
		if (metricsCurrentTTLValues) {
			setMetricsTotalRetentionPeriod(
				metricsCurrentTTLValues.metrics_ttl_duration_hrs,
			);
			setMetricsS3RetentionPeriod(
				metricsCurrentTTLValues.metrics_move_ttl_duration_hrs
					? metricsCurrentTTLValues.metrics_move_ttl_duration_hrs
					: null,
			);
		}
	}, [metricsCurrentTTLValues]);

	useEffect(() => {
		if (tracesCurrentTTLValues) {
			setTracesTotalRetentionPeriod(
				tracesCurrentTTLValues.traces_ttl_duration_hrs,
			);
			setTracesS3RetentionPeriod(
				tracesCurrentTTLValues.traces_move_ttl_duration_hrs
					? tracesCurrentTTLValues.traces_move_ttl_duration_hrs
					: null,
			);
		}
	}, [tracesCurrentTTLValues]);

	useEffect(() => {
		if (logsCurrentTTLValues) {
			setLogsTotalRetentionPeriod(logsCurrentTTLValues.logs_ttl_duration_hrs);
			setLogsS3RetentionPeriod(
				logsCurrentTTLValues.logs_move_ttl_duration_hrs
					? logsCurrentTTLValues.logs_move_ttl_duration_hrs
					: null,
			);
		}
	}, [logsCurrentTTLValues]);

	useInterval(
		async (): Promise<void> => {
			if (metricsTtlValuesPayload.status === 'pending') {
				metricsTtlValuesRefetch();
			}
		},
		metricsTtlValuesPayload.status === 'pending' ? 1000 : null,
	);

	useInterval(
		async (): Promise<void> => {
			if (tracesTtlValuesPayload.status === 'pending') {
				tracesTtlValuesRefetch();
			}
		},
		tracesTtlValuesPayload.status === 'pending' ? 1000 : null,
	);

	useInterval(
		async (): Promise<void> => {
			if (logsTtlValuesPayload.status === 'pending') {
				logsTtlValuesRefetch();
			}
		},
		logsTtlValuesPayload.status === 'pending' ? 1000 : null,
	);

	const { notifications } = useNotifications();

	const onModalToggleHandler = (type: TTTLType): void => {
		if (type === 'metrics') setModalMetrics((modal) => !modal);
		if (type === 'traces') setModalTraces((modal) => !modal);
		if (type === 'logs') setModalLogs((modal) => !modal);
	};
	const onPostApiLoadingHandler = (type: TTTLType): void => {
		if (type === 'metrics') setPostApiLoadingMetrics((modal) => !modal);
		if (type === 'traces') setPostApiLoadingTraces((modal) => !modal);
		if (type === 'logs') setPostApiLoadingLogs((modal) => !modal);
	};

	const onClickSaveHandler = useCallback(
		(type: TTTLType) => {
			if (!setRetentionPermission) {
				notifications.error({
					message: `Sorry you don't have permission to make these changes`,
				});
				return;
			}
			onModalToggleHandler(type);
		},
		[setRetentionPermission, notifications],
	);

	const s3Enabled = useMemo(
		() => !!find(availableDisks, (disks: IDiskType) => disks?.type === 's3'),
		[availableDisks],
	);

	const [
		isMetricsSaveDisabled,
		isTracesSaveDisabled,
		isLogsSaveDisabled,
		errorText,
	] = useMemo((): [
		boolean,
		boolean,
		boolean,
		string,
		// eslint-disable-next-line sonarjs/cognitive-complexity
	] => {
		// Various methods to return dynamic error message text.
		const messages = {
			compareError: (name: string | number): string =>
				t('retention_comparison_error', { name }),
			nullValueError: (name: string | number): string =>
				t('retention_null_value_error', { name }),
		};

		// Defaults to button not disabled and empty error message text.
		let isMetricsSaveDisabled = false;
		let isTracesSaveDisabled = false;
		let isLogsSaveDisabled = false;
		let errorText = '';

		if (s3Enabled) {
			if (
				(metricsTotalRetentionPeriod || metricsS3RetentionPeriod) &&
				Number(metricsTotalRetentionPeriod) <= Number(metricsS3RetentionPeriod)
			) {
				isMetricsSaveDisabled = true;
				errorText = messages.compareError('metrics');
			} else if (
				(tracesTotalRetentionPeriod || tracesS3RetentionPeriod) &&
				Number(tracesTotalRetentionPeriod) <= Number(tracesS3RetentionPeriod)
			) {
				isTracesSaveDisabled = true;
				errorText = messages.compareError('traces');
			} else if (
				(logsTotalRetentionPeriod || logsS3RetentionPeriod) &&
				Number(logsTotalRetentionPeriod) <= Number(logsS3RetentionPeriod)
			) {
				isLogsSaveDisabled = true;
				errorText = messages.compareError('logs');
			}
		}

		if (
			!metricsTotalRetentionPeriod ||
			!tracesTotalRetentionPeriod ||
			!logsTotalRetentionPeriod
		) {
			isMetricsSaveDisabled = true;
			isTracesSaveDisabled = true;
			isLogsSaveDisabled = true;
			if (
				!metricsTotalRetentionPeriod &&
				!tracesTotalRetentionPeriod &&
				!logsTotalRetentionPeriod
			) {
				errorText = messages.nullValueError('metrics, traces and logs');
			} else if (!metricsTotalRetentionPeriod) {
				errorText = messages.nullValueError('metrics');
			} else if (!tracesTotalRetentionPeriod) {
				errorText = messages.nullValueError('traces');
			} else if (!logsTotalRetentionPeriod) {
				errorText = messages.nullValueError('logs');
			}
		}
		if (
			metricsCurrentTTLValues?.metrics_ttl_duration_hrs ===
				metricsTotalRetentionPeriod &&
			metricsCurrentTTLValues.metrics_move_ttl_duration_hrs ===
				metricsS3RetentionPeriod
		)
			isMetricsSaveDisabled = true;

		if (
			tracesCurrentTTLValues.traces_ttl_duration_hrs ===
				tracesTotalRetentionPeriod &&
			tracesCurrentTTLValues.traces_move_ttl_duration_hrs ===
				tracesS3RetentionPeriod
		)
			isTracesSaveDisabled = true;

		if (
			logsCurrentTTLValues.logs_ttl_duration_hrs === logsTotalRetentionPeriod &&
			logsCurrentTTLValues.logs_move_ttl_duration_hrs === logsS3RetentionPeriod
		)
			isLogsSaveDisabled = true;

		return [
			isMetricsSaveDisabled,
			isTracesSaveDisabled,
			isLogsSaveDisabled,
			errorText,
		];
	}, [
		logsCurrentTTLValues.logs_move_ttl_duration_hrs,
		logsCurrentTTLValues.logs_ttl_duration_hrs,
		logsS3RetentionPeriod,
		logsTotalRetentionPeriod,
		metricsCurrentTTLValues.metrics_move_ttl_duration_hrs,
		metricsCurrentTTLValues?.metrics_ttl_duration_hrs,
		metricsS3RetentionPeriod,
		metricsTotalRetentionPeriod,
		s3Enabled,
		t,
		tracesCurrentTTLValues.traces_move_ttl_duration_hrs,
		tracesCurrentTTLValues.traces_ttl_duration_hrs,
		tracesS3RetentionPeriod,
		tracesTotalRetentionPeriod,
	]);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const onOkHandler = async (type: TTTLType): Promise<void> => {
		let apiCallTotalRetention;
		let apiCallS3Retention;

		switch (type) {
			case 'metrics': {
				apiCallTotalRetention = metricsTotalRetentionPeriod;
				apiCallS3Retention = metricsS3RetentionPeriod;
				break;
			}
			case 'traces': {
				apiCallTotalRetention = tracesTotalRetentionPeriod;
				apiCallS3Retention = tracesS3RetentionPeriod;
				break;
			}
			case 'logs': {
				apiCallTotalRetention = logsTotalRetentionPeriod;
				apiCallS3Retention = logsS3RetentionPeriod;
				break;
			}
			default: {
				break;
			}
		}
		try {
			onPostApiLoadingHandler(type);
			const setTTLResponse = await setRetentionApi({
				type,
				totalDuration: `${apiCallTotalRetention || -1}h`,
				coldStorage: s3Enabled ? 's3' : null,
				toColdDuration: `${apiCallS3Retention || -1}h`,
			});
			let hasSetTTLFailed = false;
			if (setTTLResponse.statusCode === 409) {
				hasSetTTLFailed = true;
				notifications.error({
					message: 'Error',
					description: t('retention_request_race_condition'),
					placement: 'topRight',
				});
			}

			if (type === 'metrics') {
				metricsTtlValuesRefetch();

				if (!hasSetTTLFailed)
					// Updates the currentTTL Values in order to avoid pushing the same values.
					setMetricsCurrentTTLValues({
						metrics_ttl_duration_hrs: metricsTotalRetentionPeriod || -1,
						metrics_move_ttl_duration_hrs: metricsS3RetentionPeriod || -1,
						status: '',
					});
			} else if (type === 'traces') {
				tracesTtlValuesRefetch();

				if (!hasSetTTLFailed)
					// Updates the currentTTL Values in order to avoid pushing the same values.
					setTracesCurrentTTLValues({
						traces_ttl_duration_hrs: tracesTotalRetentionPeriod || -1,
						traces_move_ttl_duration_hrs: tracesS3RetentionPeriod || -1,
						status: '',
					});
			} else if (type === 'logs') {
				logsTtlValuesRefetch();
				if (!hasSetTTLFailed)
					// Updates the currentTTL Values in order to avoid pushing the same values.
					setLogsCurrentTTLValues({
						logs_ttl_duration_hrs: logsTotalRetentionPeriod || -1,
						logs_move_ttl_duration_hrs: logsS3RetentionPeriod || -1,
						status: '',
					});
			}
		} catch (error) {
			notifications.error({
				message: 'Error',
				description: t('retention_failed_message'),
				placement: 'topRight',
			});
		}

		onPostApiLoadingHandler(type);
		onModalToggleHandler(type);
	};

	const isCloudUserVal = isCloudUser();

	const renderConfig = [
		{
			name: 'Metrics',
			retentionFields: [
				{
					name: t('total_retention_period'),
					value: metricsTotalRetentionPeriod,
					setValue: setMetricsTotalRetentionPeriod,
				},
				{
					name: t('move_to_s3'),
					value: metricsS3RetentionPeriod,
					setValue: setMetricsS3RetentionPeriod,
					hide: !s3Enabled,
				},
			],
			save: {
				modal: modalMetrics,
				modalOpen: (): void => onClickSaveHandler('metrics'),
				apiLoading: postApiLoadingMetrics,
				saveButtonText:
					metricsTtlValuesPayload.status === 'pending' ? (
						<span>
							<Spin spinning size="small" indicator={<LoadingOutlined spin />} />{' '}
							{t('retention_save_button.pending', { name: 'metrics' })}
						</span>
					) : (
						<span>{t('retention_save_button.success')}</span>
					),
				isDisabled:
					metricsTtlValuesPayload.status === 'pending' || isMetricsSaveDisabled,
			},
			statusComponent: (
				<StatusMessage
					total_retention={metricsTtlValuesPayload.expected_metrics_ttl_duration_hrs}
					status={metricsTtlValuesPayload.status}
					s3_retention={
						metricsTtlValuesPayload.expected_metrics_move_ttl_duration_hrs
					}
				/>
			),
		},
		{
			name: 'Traces',
			retentionFields: [
				{
					name: t('total_retention_period'),
					value: tracesTotalRetentionPeriod,
					setValue: setTracesTotalRetentionPeriod,
				},
				{
					name: t('move_to_s3'),
					value: tracesS3RetentionPeriod,
					setValue: setTracesS3RetentionPeriod,
					hide: !s3Enabled,
				},
			],
			save: {
				modal: modalTraces,
				modalOpen: (): void => onClickSaveHandler('traces'),
				apiLoading: postApiLoadingTraces,
				saveButtonText:
					tracesTtlValuesPayload.status === 'pending' ? (
						<span>
							<Spin spinning size="small" indicator={<LoadingOutlined spin />} />{' '}
							{t('retention_save_button.pending', { name: 'traces' })}
						</span>
					) : (
						<span>{t('retention_save_button.success')}</span>
					),
				isDisabled:
					tracesTtlValuesPayload.status === 'pending' || isTracesSaveDisabled,
			},
			statusComponent: (
				<StatusMessage
					total_retention={tracesTtlValuesPayload.expected_traces_ttl_duration_hrs}
					status={tracesTtlValuesPayload.status}
					s3_retention={tracesTtlValuesPayload.expected_traces_move_ttl_duration_hrs}
				/>
			),
		},
		{
			name: 'Logs',
			retentionFields: [
				{
					name: t('total_retention_period'),
					value: logsTotalRetentionPeriod,
					setValue: setLogsTotalRetentionPeriod,
				},
				{
					name: t('move_to_s3'),
					value: logsS3RetentionPeriod,
					setValue: setLogsS3RetentionPeriod,
					hide: !s3Enabled,
				},
			],
			save: {
				modal: modalLogs,
				modalOpen: (): void => onClickSaveHandler('logs'),
				apiLoading: postApiLoadingLogs,
				saveButtonText:
					logsTtlValuesPayload.status === 'pending' ? (
						<span>
							<Spin spinning size="small" indicator={<LoadingOutlined spin />} />{' '}
							{t('retention_save_button.pending', { name: 'logs' })}
						</span>
					) : (
						<span>{t('retention_save_button.success')}</span>
					),
				isDisabled: logsTtlValuesPayload.status === 'pending' || isLogsSaveDisabled,
			},
			statusComponent: (
				<StatusMessage
					total_retention={logsTtlValuesPayload.expected_logs_ttl_duration_hrs}
					status={logsTtlValuesPayload.status}
					s3_retention={logsTtlValuesPayload.expected_logs_move_ttl_duration_hrs}
				/>
			),
		},
	].map((category): JSX.Element | null => {
		if (
			Array.isArray(category.retentionFields) &&
			category.retentionFields.length > 0
		) {
			return (
				<Fragment key={category.name}>
					<Col xs={22} xl={11} key={category.name} style={{ margin: '0.5rem' }}>
						<Card style={{ height: '100%' }}>
							<Typography.Title style={{ margin: 0 }} level={3}>
								{category.name}
							</Typography.Title>
							<Divider
								style={{
									margin: '0.5rem 0',
									padding: 0,
									opacity: 0.5,
									marginBottom: '1rem',
								}}
							/>
							{category.retentionFields.map((retentionField) => (
								<Retention
									key={retentionField.name}
									text={retentionField.name}
									retentionValue={retentionField.value}
									setRetentionValue={retentionField.setValue}
									hide={!!retentionField.hide}
								/>
							))}

							{!isCloudUserVal && (
								<>
									<ActionItemsContainer>
										<Button
											type="primary"
											onClick={category.save.modalOpen}
											disabled={category.save.isDisabled}
										>
											{category.save.saveButtonText}
										</Button>
										{category.statusComponent}
									</ActionItemsContainer>
									<Modal
										title={t('retention_confirmation')}
										focusTriggerAfterClose
										forceRender
										destroyOnClose
										closable
										onCancel={(): void =>
											onModalToggleHandler(category.name.toLowerCase() as TTTLType)
										}
										onOk={(): Promise<void> =>
											onOkHandler(category.name.toLowerCase() as TTTLType)
										}
										centered
										open={category.save.modal}
										confirmLoading={category.save.apiLoading}
									>
										<Typography>
											{t('retention_confirmation_description', {
												name: category.name.toLowerCase(),
											})}
										</Typography>
									</Modal>
								</>
							)}
						</Card>
					</Col>
				</Fragment>
			);
		}
		return null;
	});

	return (
		<>
			{Element}
			<Col xs={24} md={22} xl={20} xxl={18} style={{ margin: 'auto' }}>
				<ErrorTextContainer>
					{!isCloudUserVal && (
						<TextToolTip
							{...{
								text: `More details on how to set retention period`,
								url: 'https://signoz.io/docs/userguide/retention-period/',
							}}
						/>
					)}
					{errorText && <ErrorText>{errorText}</ErrorText>}
				</ErrorTextContainer>

				<Row justify="start">{renderConfig}</Row>

				{isCloudUserVal && <GeneralSettingsCloud />}
			</Col>
		</>
	);
}

interface GeneralSettingsProps {
	getAvailableDiskPayload: GetDisksPayload;
	metricsTtlValuesPayload: GetRetentionPeriodMetricsPayload;
	tracesTtlValuesPayload: GetRetentionPeriodTracesPayload;
	logsTtlValuesPayload: GetRetentionPeriodLogsPayload;
	metricsTtlValuesRefetch: UseQueryResult<
		ErrorResponse | SuccessResponse<GetRetentionPeriodMetricsPayload>
	>['refetch'];
	tracesTtlValuesRefetch: UseQueryResult<
		ErrorResponse | SuccessResponse<GetRetentionPeriodTracesPayload>
	>['refetch'];
	logsTtlValuesRefetch: UseQueryResult<
		ErrorResponse | SuccessResponse<GetRetentionPeriodLogsPayload>
	>['refetch'];
}

export default GeneralSettings;
