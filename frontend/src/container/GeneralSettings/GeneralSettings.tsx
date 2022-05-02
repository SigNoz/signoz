import { Button, Col, Modal, notification, Row, Typography } from 'antd';
import setRetentionApi from 'api/settings/setRetention';
import TextToolTip from 'components/TextToolTip';
import useComponentPermission from 'hooks/useComponentPermission';
import find from 'lodash-es/find';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import {
	IDiskType,
	PayloadProps as GetDisksPayload,
} from 'types/api/disks/getDisks';
import { PayloadProps as GetRetentionPayload } from 'types/api/settings/getRetention';
import AppReducer from 'types/reducer/app';

import Retention from './Retention';
import { ButtonContainer, ErrorText, ErrorTextContainer } from './styles';

type NumberOrNull = number | null;

function GeneralSettings({
	ttlValuesPayload,
	getAvailableDiskPayload,
}: GeneralSettingsProps): JSX.Element {
	const { t } = useTranslation();
	const [modal, setModal] = useState<boolean>(false);
	const [postApiLoading, setPostApiLoading] = useState<boolean>(false);

	const [availableDisks] = useState<IDiskType[]>(getAvailableDiskPayload);

	const [currentTTLValues, setCurrentTTLValues] = useState(ttlValuesPayload);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [setRetentionPermission] = useComponentPermission(
		['set_retention_period'],
		role,
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
	}, [currentTTLValues]);

	const onModalToggleHandler = (): void => {
		setModal((modal) => !modal);
	};

	const onClickSaveHandler = useCallback(() => {
		if (!setRetentionPermission) {
			notification.error({
				message: `Sorry you don't have permission to make these changes`,
			});
			return;
		}
		onModalToggleHandler();
	}, [setRetentionPermission]);

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

	// eslint-disable-next-line sonarjs/cognitive-complexity
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
						notification.success({
							message: 'Success!',
							placement: 'topRight',

							description: t('settings.retention_success_message', { name }),
						});
					} else {
						notification.error({
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
			notification.error({
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

	// eslint-disable-next-line sonarjs/cognitive-complexity
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

interface GeneralSettingsProps {
	ttlValuesPayload: GetRetentionPayload;
	getAvailableDiskPayload: GetDisksPayload;
}

export default GeneralSettings;
