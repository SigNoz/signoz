import './ConfigureServiceModal.styles.scss';

import { Form, Switch } from 'antd';
import SignozModal from 'components/SignozModal/SignozModal';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	ServiceConfig,
	SupportedSignals,
} from 'container/CloudIntegrationPage/ServicesSection/types';
import { useUpdateServiceConfig } from 'hooks/integration/aws/useUpdateServiceConfig';
import { isEqual } from 'lodash-es';
import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';

import logEvent from '../../../api/common/logEvent';
import S3BucketsSelector from './S3BucketsSelector';

export interface IConfigureServiceModalProps {
	isOpen: boolean;
	onClose: () => void;
	serviceName: string;
	serviceId: string;
	cloudAccountId: string;
	supportedSignals: SupportedSignals;
	initialConfig?: ServiceConfig;
}

function ConfigureServiceModal({
	isOpen,
	onClose,
	serviceName,
	serviceId,
	cloudAccountId,
	initialConfig,
	supportedSignals,
}: IConfigureServiceModalProps): JSX.Element {
	const [form] = Form.useForm();
	const [isLoading, setIsLoading] = useState(false);

	// Track current form values
	const initialValues = useMemo(
		() => ({
			metrics: initialConfig?.metrics?.enabled || false,
			logs: initialConfig?.logs?.enabled || false,
			s3Buckets: initialConfig?.logs?.s3_buckets || {},
		}),
		[initialConfig],
	);
	const [currentValues, setCurrentValues] = useState(initialValues);

	const isSaveDisabled = useMemo(
		() =>
			// disable only if current values are same as the initial config
			currentValues.metrics === initialValues.metrics &&
			currentValues.logs === initialValues.logs &&
			isEqual(currentValues.s3Buckets, initialValues.s3Buckets),
		[currentValues, initialValues],
	);

	const handleS3BucketsChange = useCallback(
		(bucketsByRegion: Record<string, string[]>) => {
			setCurrentValues((prev) => ({
				...prev,
				s3Buckets: bucketsByRegion,
			}));
			form.setFieldsValue({ s3Buckets: bucketsByRegion });
		},
		[form],
	);

	const {
		mutate: updateServiceConfig,
		isLoading: isUpdating,
	} = useUpdateServiceConfig();

	const queryClient = useQueryClient();

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			const values = await form.validateFields();
			setIsLoading(true);

			updateServiceConfig(
				{
					serviceId,
					payload: {
						cloud_account_id: cloudAccountId,
						config: {
							logs: {
								enabled: values.logs,
								s3_buckets: values.s3Buckets,
							},
							metrics: {
								enabled: values.metrics,
							},
						},
					},
				},
				{
					onSuccess: () => {
						queryClient.invalidateQueries([
							REACT_QUERY_KEY.AWS_SERVICE_DETAILS,
							serviceId,
						]);
						onClose();

						logEvent('AWS Integration: Service settings saved', {
							cloudAccountId,
							serviceId,
							logsEnabled: values?.logs,
							metricsEnabled: values?.metrics,
						});
					},
					onError: (error) => {
						console.error('Failed to update service config:', error);
					},
				},
			);
		} catch (error) {
			console.error('Form submission failed:', error);
		} finally {
			setIsLoading(false);
		}
	}, [
		form,
		updateServiceConfig,
		serviceId,
		cloudAccountId,
		queryClient,
		onClose,
	]);

	const handleClose = useCallback(() => {
		form.resetFields();
		onClose();
	}, [form, onClose]);

	return (
		<SignozModal
			title={
				<div className="account-settings-modal__title">Configure {serviceName}</div>
			}
			centered
			open={isOpen}
			okText="Save"
			okButtonProps={{
				disabled: isSaveDisabled,
				className: 'account-settings-modal__footer-save-button',
				loading: isLoading || isUpdating,
			}}
			onCancel={handleClose}
			onOk={handleSubmit}
			cancelText="Close"
			cancelButtonProps={{
				className: 'account-settings-modal__footer-close-button',
			}}
			width={672}
			rootClassName=" configure-service-modal"
		>
			<Form
				form={form}
				layout="vertical"
				initialValues={{
					metrics: initialConfig?.metrics?.enabled || false,
					logs: initialConfig?.logs?.enabled || false,
					s3Buckets: initialConfig?.logs?.s3_buckets || {},
				}}
			>
				<div className=" configure-service-modal__body">
					{supportedSignals.metrics && (
						<Form.Item
							name="metrics"
							valuePropName="checked"
							className="configure-service-modal__body-form-item"
						>
							<div className="configure-service-modal__body-regions-switch-switch">
								<Switch
									checked={currentValues.metrics}
									onChange={(checked): void => {
										setCurrentValues((prev) => ({ ...prev, metrics: checked }));
										form.setFieldsValue({ metrics: checked });
									}}
								/>
								<span className="configure-service-modal__body-regions-switch-switch-label">
									Metric Collection
								</span>
							</div>
							<div className="configure-service-modal__body-switch-description">
								Metric Collection is enabled for this AWS account. We recommend keeping
								this enabled, but you can disable metric collection if you do not want
								to monitor your AWS infrastructure.
							</div>
						</Form.Item>
					)}

					{supportedSignals.logs && (
						<>
							<Form.Item
								name="logs"
								valuePropName="checked"
								className="configure-service-modal__body-form-item"
							>
								<div className="configure-service-modal__body-regions-switch-switch">
									<Switch
										checked={currentValues.logs}
										onChange={(checked): void => {
											setCurrentValues((prev) => ({ ...prev, logs: checked }));
											form.setFieldsValue({ logs: checked });
										}}
									/>
									<span className="configure-service-modal__body-regions-switch-switch-label">
										Log Collection
									</span>
								</div>
								<div className="configure-service-modal__body-switch-description">
									To ingest logs from your AWS services, you must complete several steps
								</div>
							</Form.Item>

							{currentValues.logs && serviceId === 's3sync' && (
								<Form.Item name="s3Buckets" noStyle>
									<S3BucketsSelector
										initialBucketsByRegion={currentValues.s3Buckets}
										onChange={handleS3BucketsChange}
									/>
								</Form.Item>
							)}
						</>
					)}
				</div>
			</Form>
		</SignozModal>
	);
}

ConfigureServiceModal.defaultProps = {
	initialConfig: {
		metrics: { enabled: false },
		logs: { enabled: false },
	},
};

export default ConfigureServiceModal;
