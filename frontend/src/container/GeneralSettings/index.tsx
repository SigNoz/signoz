import { Button, Modal, notification, Typography } from 'antd';
import getRetentionperoidApi from 'api/settings/getRetention';
import setRetentionApi from 'api/settings/setRetention';
import Spinner from 'components/Spinner';
import useFetch from 'hooks/useFetch';
import convertIntoHr from 'lib/convertIntoHr';
import getSettingsPeroid from 'lib/getSettingsPeroid';
import React, { useCallback, useEffect, useState } from 'react';
import { PayloadProps } from 'types/api/settings/getRetention';

import Retention from './Retention';
import {
	ButtonContainer,
	Container,
	ErrorText,
	ErrorTextContainer,
} from './styles';

const GeneralSettings = (): JSX.Element => {
	const [
		selectedMetricsPeroid,
		setSelectedMetricsPeroid,
	] = useState<SettingPeroid>('month');
	const [notifications, Element] = notification.useNotification();

	const [retentionPeroidMetrics, setRetentionPeroidMetrics] = useState<number>(
		0,
	);
	const [modal, setModal] = useState<boolean>(false);
	const [postApiLoading, setPostApiLoading] = useState<boolean>(false);

	const [selectedTracePeroid, setSelectedTracePeroid] = useState<SettingPeroid>(
		'hr',
	);

	const [retentionPeroidTrace, setRetentionPeroidTrace] = useState<number>(0);
	const [isDefaultMetrics, setIsDefaultMetrics] = useState<boolean>(false);
	const [isDefaultTrace, setIsDefaultTrace] = useState<boolean>(false);

	const onClickSaveHandler = useCallback(() => {
		onModalToggleHandler();
	}, []);

	const { payload, loading, error, errorMessage } = useFetch<
		PayloadProps,
		undefined
	>(getRetentionperoidApi, undefined);

	const onModalToggleHandler = (): void => {
		setModal((modal) => !modal);
	};

	useEffect(() => {
		if (!loading && payload !== undefined) {
			const { metrics_ttl_duration_hrs, traces_ttl_duration_hrs } = payload;

			if (metrics_ttl_duration_hrs === -1) {
				setIsDefaultMetrics(true);
			} else {
				setIsDefaultMetrics(false);
			}

			if (traces_ttl_duration_hrs === -1) {
				setIsDefaultTrace(true);
			} else {
				setIsDefaultTrace(false);
			}

			const traceValue = getSettingsPeroid(traces_ttl_duration_hrs);
			const metricsValue = getSettingsPeroid(metrics_ttl_duration_hrs);

			setRetentionPeroidTrace(traceValue.value);
			setSelectedTracePeroid(traceValue.peroid);

			setRetentionPeroidMetrics(metricsValue.value);
			setSelectedMetricsPeroid(metricsValue.peroid);
		}
	}, [setSelectedMetricsPeroid, loading, payload]);

	const onOkHandler = async (): Promise<void> => {
		try {
			setPostApiLoading(true);
			const [tracesResponse, metricsResponse] = await Promise.all([
				setRetentionApi({
					duration: `${convertIntoHr(retentionPeroidTrace, selectedTracePeroid)}h`,
					type: 'traces',
				}),
				setRetentionApi({
					duration: `${convertIntoHr(
						retentionPeroidMetrics,
						selectedMetricsPeroid,
					)}h`,
					type: 'metrics',
				}),
			]);

			if (
				tracesResponse.statusCode === 200 &&
				metricsResponse.statusCode === 200
			) {
				notifications.success({
					message: 'Success!',
					placement: 'topRight',
					description: 'Congrats. The retention periods were updated correctly.',
				});
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

	if (loading || payload === undefined) {
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

	const errorText = getErrorText();

	return (
		<Container>
			{Element}

			{errorText && (
				<ErrorTextContainer>
					<ErrorText>{errorText}</ErrorText>
				</ErrorTextContainer>
			)}

			<Retention
				text={'Retention Period for Metrics'}
				selectedRetentionPeroid={selectedMetricsPeroid}
				setRentionValue={setRetentionPeroidMetrics}
				retentionValue={retentionPeroidMetrics}
				setSelectedRetentionPeroid={setSelectedMetricsPeroid}
			/>

			<Retention
				text={'Retention Period for Traces'}
				selectedRetentionPeroid={selectedTracePeroid}
				setRentionValue={setRetentionPeroidTrace}
				retentionValue={retentionPeroidTrace}
				setSelectedRetentionPeroid={setSelectedTracePeroid}
			/>

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
				<Button onClick={onClickSaveHandler} type="primary">
					Save
				</Button>
			</ButtonContainer>
		</Container>
	);
};

export type SettingPeroid = 'hr' | 'day' | 'month';

export default GeneralSettings;
