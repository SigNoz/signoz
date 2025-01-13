import './ConfigureServiceModal.styles.scss';

import { Form, Modal, Switch } from 'antd';
import { useCallback, useMemo, useState } from 'react';

interface IConfigureServiceModalProps {
	isOpen: boolean;
	onClose: () => void;
	serviceName: string;
}

function ConfigureServiceModal({
	isOpen,
	onClose,
	serviceName,
}: IConfigureServiceModalProps): JSX.Element {
	const [form] = Form.useForm();
	const [isLoading, setIsLoading] = useState(false);

	// Track current form values
	const [currentValues, setCurrentValues] = useState({
		metrics: false,
		logs: false,
	});

	// Watch form values in real time
	const handleValuesChange = useCallback(
		(changedValues: any, allValues: any) => {
			setCurrentValues(allValues);
		},
		[],
	);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			const values = await form.validateFields();
			setIsLoading(true);

			console.log('Form values:', values);
			onClose();
		} catch (error) {
			console.error('Form submission failed:', error);
		} finally {
			setIsLoading(false);
		}
	}, [form, onClose]);

	const isSaveDisabled = useMemo(
		() =>
			// Compare current values with initial values
			currentValues.metrics === false && currentValues.logs === false,
		[currentValues],
	);

	const handleClose = useCallback(() => {
		form.resetFields();
		onClose();
	}, [form, onClose]);

	return (
		<Modal
			title={
				<div className="account-settings-modal__title">Configure {serviceName}</div>
			}
			centered
			open={isOpen}
			okText="Save"
			okButtonProps={{
				disabled: isSaveDisabled,
				className: 'account-settings-modal__footer-save-button',
				loading: isLoading,
			}}
			onCancel={handleClose}
			onOk={handleSubmit}
			cancelText="Close"
			cancelButtonProps={{
				className: 'account-settings-modal__footer-close-button',
			}}
			width={672}
			rootClassName="cloud-integrations-modal configure-service-modal"
		>
			<Form
				form={form}
				layout="vertical"
				initialValues={{
					metrics: false,
					logs: false,
				}}
				onValuesChange={handleValuesChange}
			>
				<div className=" configure-service-modal__body">
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
									// form.setFieldsValue({ metrics: checked });
								}}
							/>
							<span className="configure-service-modal__body-regions-switch-switch-label">
								Metric Collection
							</span>
						</div>
						<div className="configure-service-modal__body-switch-description">
							Metric Collection is enabled for this AWS account. We recommend keeping
							this enabled, but you can disable metric collection if you do not want to
							monitor your AWS infrastructure.
						</div>
					</Form.Item>

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
									// form.setFieldsValue({ logs: checked });
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
				</div>
			</Form>
		</Modal>
	);
}

export default ConfigureServiceModal;
