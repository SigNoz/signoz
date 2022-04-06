/* eslint-disable sonarjs/cognitive-complexity */
import { Button, Col, Modal, notification, Row, Typography } from 'antd';
import getDisks from 'api/disks/getDisks';
import getRetentionPeriodApi from 'api/settings/getRetention';
import setRetentionApi from 'api/settings/setRetention';
import Spinner from 'components/Spinner';
import TextToolTip from 'components/TextToolTip';
import useFetch from 'hooks/useFetch';
import { find } from 'lodash-es';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IDiskType } from 'types/api/disks/getDisks';
import { PayloadProps } from 'types/api/settings/getRetention';

import Retention from './Retention';
import { ButtonContainer, ErrorText, ErrorTextContainer } from './styles';

function GeneralSettings(): JSX.Element {
	const { t } = useTranslation();
	const [notifications, Element] = notification.useNotification();
	const [modal, setModal] = useState<boolean>(false);
	const [postApiLoading, setPostApiLoading] = useState<boolean>(false);

	const [availableDisks, setAvailableDisks] = useState<IDiskType[] | null>(null);

	useEffect(() => {
		getDisks().then((response) => setAvailableDisks(response.payload));
	}, []);

	const { payload, loading, error, errorMessage } = useFetch<
		PayloadProps,
		undefined
	>(getRetentionPeriodApi, undefined);

	const [currentTTLValues, setCurrentTTLValues] = useState(payload);

	useEffect(() => {
		setCurrentTTLValues(payload);
	}, [payload]);

	const [metricsTotalRetentionPeriod, setMetricsTotalRetentionPeriod] = useState<
		number | null
	>(null);
	const [metricsS3RetentionPeriod, setMetricsS3RetentionPeriod] = useState<
		number | null
	>(null);
	const [tracesTotalRetentionPeriod, setTracesTotalRetentionPeriod] = useState<
		number | null
	>(null);
	const [tracesS3RetentionPeriod, setTracesS3RetentionPeriod] = useState<
		number | null
	>(null);

	useEffect(() => {
		if (currentTTLValues) {
			setMetricsTotalRetentionPeriod(currentTTLValues.metrics_ttl_duration_hrs);
			setMetricsS3RetentionPeriod(
				currentTTLValues.metrics_move_ttl_duration_hrs
					? currentTTLValues.metrics_move_ttl_duration_hrs
					: null,
			);
			setTracesTotalRetentionPeriod(currentTTLValues.traces_ttl_duration_hrs);
			setTracesS3RetentionPeriod(
				currentTTLValues.traces_move_ttl_duration_hrs
					? currentTTLValues.traces_move_ttl_duration_hrs
					: null,
			);
		}
		console.log({ changed: currentTTLValues });
	}, [currentTTLValues]);

	const onModalToggleHandler = (): void => {
		setModal((modal) => !modal);
	};

	const onClickSaveHandler = useCallback(() => {
		onModalToggleHandler();
	}, []);

	const s3Enabled = useMemo(
		() => !!find(availableDisks, (disks: IDiskType) => disks?.type === 's3'),
		[availableDisks],
	);

	const renderConfig = [
		{
			name: 'Metrics',
			retentionFields: [
				{
					name: t('settings.total_retention_period'),
					value: metricsTotalRetentionPeriod,
					setValue: setMetricsTotalRetentionPeriod,
				},
				{
					name: t('settings.move_to_s3'),
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
					name: t('settings.total_retention_period'),
					value: tracesTotalRetentionPeriod,
					setValue: setTracesTotalRetentionPeriod,
				},
				{
					name: t('settings.move_to_s3'),
					value: tracesS3RetentionPeriod,
					setValue: setTracesS3RetentionPeriod,
					hide: !s3Enabled,
				},
			],
		},
	].map((category): JSX.Element | null => {
		if (
			Array.isArray(category.retentionFields) &&
			category.retentionFields.length > 0
		) {
			return (
				<Col flex="40%" style={{ minWidth: 475 }} key={category.name}>
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
	});

	const onOkHandler = async (): Promise<void> => {
		try {
			setPostApiLoading(true);
			const apiCalls = [];

			if (
				!(
					currentTTLValues?.metrics_move_ttl_duration_hrs ===
						metricsS3RetentionPeriod &&
					currentTTLValues.metrics_ttl_duration_hrs === metricsTotalRetentionPeriod
				)
			) {
				apiCalls.push(() =>
					setRetentionApi({
						type: 'metrics',
						totalDuration: `${metricsTotalRetentionPeriod || -1}h`,
						coldStorage: s3Enabled ? 's3' : null,
						toColdDuration: `${metricsS3RetentionPeriod || -1}h`,
					}),
				);
			} else {
				apiCalls.push(() => Promise.resolve(null));
			}

			if (
				!(
					currentTTLValues?.traces_move_ttl_duration_hrs ===
						tracesS3RetentionPeriod &&
					currentTTLValues.traces_ttl_duration_hrs === tracesTotalRetentionPeriod
				)
			) {
				apiCalls.push(() =>
					setRetentionApi({
						type: 'traces',
						totalDuration: `${tracesTotalRetentionPeriod || -1}h`,
						coldStorage: s3Enabled ? 's3' : null,
						toColdDuration: `${tracesS3RetentionPeriod || -1}h`,
					}),
				);
			} else {
				apiCalls.push(() => Promise.resolve(null));
			}
			const apiCallSequence = ['metrics', 'traces'];
			const apiResponses = await Promise.all(apiCalls.map((api) => api()));

			apiResponses.forEach((apiResponse, idx) => {
				const name = apiCallSequence[idx];
				if (apiResponse) {
					if (apiResponse.statusCode === 200) {
						notifications.success({
							message: 'Success!',
							placement: 'topRight',

							description: t('settings.retention_success_message', { name }),
						});
					} else {
						notifications.error({
							message: 'Error',
							description: t('settings.retention_error_message', { name }),
							placement: 'topRight',
						});
					}
				}
			});
			onModalToggleHandler();
			setPostApiLoading(false);
		} catch (error) {
			notifications.error({
				message: 'Error',
				description: t('settings.retention_failed_message'),
				placement: 'topRight',
			});
		}
		// Updates the currentTTL Values in order to avoid pushing the same values.
		setCurrentTTLValues({
			metrics_ttl_duration_hrs: metricsTotalRetentionPeriod || -1,
			metrics_move_ttl_duration_hrs: metricsS3RetentionPeriod || -1,
			traces_ttl_duration_hrs: tracesTotalRetentionPeriod || -1,
			traces_move_ttl_duration_hrs: tracesS3RetentionPeriod || -1,
		});

		setModal(false);
	};

	const [isDisabled, errorText] = useMemo((): [boolean, string] => {
		// Various methods to return dynamic error message text.
		const messages = {
			compareError: (name: string | number): string =>
				t('settings.retention_comparison_error', { name }),
			nullValueError: (name: string | number): string =>
				t('settings.retention_null_value_error', { name }),
		};

		// Defaults to button not disabled and empty error message text.
		let isDisabled = false;
		let errorText = '';

		if (s3Enabled) {
			if (
				(metricsTotalRetentionPeriod || metricsS3RetentionPeriod) &&
				Number(metricsTotalRetentionPeriod) <= Number(metricsS3RetentionPeriod)
			) {
				isDisabled = true;
				errorText = messages.compareError('metrics');
			} else if (
				(tracesTotalRetentionPeriod || tracesS3RetentionPeriod) &&
				Number(tracesTotalRetentionPeriod) <= Number(tracesS3RetentionPeriod)
			) {
				isDisabled = true;
				errorText = messages.compareError('traces');
			}
		}

		if (!metricsTotalRetentionPeriod || !tracesTotalRetentionPeriod) {
			isDisabled = true;
			if (!metricsTotalRetentionPeriod && !tracesTotalRetentionPeriod) {
				errorText = messages.nullValueError('metrics and traces');
			} else if (!metricsTotalRetentionPeriod) {
				errorText = messages.nullValueError('metrics');
			} else if (!tracesTotalRetentionPeriod) {
				errorText = messages.nullValueError('traces');
			}
		}
		if (
			currentTTLValues?.metrics_ttl_duration_hrs === metricsTotalRetentionPeriod &&
			currentTTLValues.metrics_move_ttl_duration_hrs ===
				metricsS3RetentionPeriod &&
			currentTTLValues.traces_ttl_duration_hrs === tracesTotalRetentionPeriod &&
			currentTTLValues.traces_move_ttl_duration_hrs === tracesS3RetentionPeriod
		) {
			isDisabled = true;
		}
		return [isDisabled, errorText];
	}, [
		currentTTLValues,
		metricsS3RetentionPeriod,
		metricsTotalRetentionPeriod,
		s3Enabled,
		t,
		tracesS3RetentionPeriod,
		tracesTotalRetentionPeriod,
	]);

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (loading || currentTTLValues === undefined) {
		return <Spinner tip="Loading.." height="70vh" />;
	}

	return (
		<Col xs={24} md={22} xl={20} xxl={18} style={{ margin: 'auto' }}>
			{Element}
			<ErrorTextContainer>
				<TextToolTip
					{...{
						text: `More details on how to set retention period`,
						url: 'https://signoz.io/docs/userguide/retention-period/',
					}}
				/>
				{errorText && <ErrorText>{errorText}</ErrorText>}
			</ErrorTextContainer>

			<Row justify="space-around">{renderConfig}</Row>

			<Modal
				title={t('settings.retention_confirmation')}
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
				<Typography>{t('settings.retention_confirmation_description')}</Typography>
			</Modal>

			<ButtonContainer>
				<Button onClick={onClickSaveHandler} disabled={isDisabled} type="primary">
					Save
				</Button>
			</ButtonContainer>
		</Col>
	);
}

export type SettingPeriod = 'hr' | 'day' | 'month';

export default GeneralSettings;
