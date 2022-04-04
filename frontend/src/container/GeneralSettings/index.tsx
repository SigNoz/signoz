import { Button, Col, Modal, notification, Row, Typography } from 'antd';
import getDisks from 'api/disks/getDisks';
import getRetentionPeriodApi from 'api/settings/getRetention';
import setRetentionApi from 'api/settings/setRetention';
import Spinner from 'components/Spinner';
import TextToolTip from 'components/TextToolTip';
import useFetch from 'hooks/useFetch';
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
	const [notifications, Element] = notification.useNotification();

	const [modal, setModal] = useState<boolean>(false);
	const [postApiLoading, setPostApiLoading] = useState<boolean>(false);

	const [availableDisks, setAvailableDisks] = useState<IDiskType[] | null>(null);

	useEffect(() => {
		getDisks().then((response) => setAvailableDisks(response.payload));
	}, []);

	const { payload: currentTTLValues, loading, error, errorMessage } = useFetch<
		PayloadProps,
		undefined
	>(getRetentionPeriodApi, undefined);
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
			setMetricsS3RetentionPeriod(currentTTLValues.metrics_move_ttl_duration_hrs);
			setTracesTotalRetentionPeriod(currentTTLValues.traces_ttl_duration_hrs);
			setTracesS3RetentionPeriod(currentTTLValues.traces_move_ttl_duration_hrs);
		}
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
			const [metricsTTLApiResponse, tracesTTLApiResponse] = await Promise.all([
				setRetentionApi({
					type: 'metrics',
					totalDuration: `${metricsTotalRetentionPeriod || -1}h`,
					coldStorage: s3Enabled ? 's3' : null,
					toColdDuration: `${metricsS3RetentionPeriod || -1}h`,
				}),
				setRetentionApi({
					type: 'traces',
					totalDuration: `${tracesTotalRetentionPeriod || -1}h`,
					coldStorage: s3Enabled ? 's3' : null,
					toColdDuration: `${tracesS3RetentionPeriod || -1}h`,
				}),
			]);
			[
				{
					apiResponse: metricsTTLApiResponse,
					name: 'metrics',
				},
				{
					apiResponse: tracesTTLApiResponse,
					name: 'traces',
				},
			].forEach(({ apiResponse, name }) => {
				if (apiResponse.statusCode === 200) {
					notifications.success({
						message: 'Success!',
						placement: 'topRight',
						description: `Congrats. The retention periods for ${name} has been updated successfully.`,
					});
				} else {
					notifications.error({
						message: 'Error',
						description: `There was an issue in changing the retention period for ${name}. Please try again or reach out to support@signoz.io`,
						placement: 'topRight',
					});
				}
			});
			onModalToggleHandler();
			setPostApiLoading(false);
		} catch (error) {
			notifications.error({
				message: 'Error',
				description:
					'There was an issue in changing the retention period. Please try again or reach out to support@signoz.io',
				placement: 'topRight',
			});
		}
		setModal(false);
	};

	const [isDisabled, errorText] = useMemo(() => {
		// Various methods to return dynamic error message text.
		const messages = {
			compareError: (value: string | number): string =>
				`Total retention period for ${value} can’t be lower than period after which data is moved to s3`,
			nullValueError: (value: string | number): string =>
				`Retention Peroid for ${value} is not set yet. Please set by choosing below`,
		};

		// Defaults to button not disabled and empty error message text.
		let isDisabled = false;
		let errorText = '';

		if (s3Enabled) {
			if (
				(metricsTotalRetentionPeriod || metricsS3RetentionPeriod) &&
				Number(metricsTotalRetentionPeriod) < Number(metricsS3RetentionPeriod)
			) {
				isDisabled = true;
				errorText = messages.compareError('metrics');
			} else if (
				(tracesTotalRetentionPeriod || tracesS3RetentionPeriod) &&
				Number(tracesTotalRetentionPeriod) < Number(tracesS3RetentionPeriod)
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
		return [isDisabled, errorText];
	}, [
		metricsS3RetentionPeriod,
		metricsTotalRetentionPeriod,
		s3Enabled,
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
			<Row justify="space-around">{renderConfig}</Row>

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
				<Button onClick={onClickSaveHandler} disabled={isDisabled} type="primary">
					Save
				</Button>
			</ButtonContainer>
		</Col>
	);
}

export type SettingPeriod = 'hr' | 'day' | 'month';

export default GeneralSettings;
