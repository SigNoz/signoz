import './IntegrationModal.style.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Form, Modal, Select, Switch } from 'antd';
import { ChevronDown, SquareArrowOutUpRight } from 'lucide-react';
import { useState } from 'react';

interface IntegrationModalProps {
	isOpen: boolean;
	onClose: () => void;
}

function IntegrationModal({
	isOpen,
	onClose,
}: IntegrationModalProps): JSX.Element {
	const [form] = Form.useForm();
	const [isLoading, setIsLoading] = useState(false);
	const [activeView, setActiveView] = useState<'select-regions' | 'form'>(
		'form',
	);

	const handleSubmit = async (): Promise<void> => {
		setIsLoading(true);
		try {
			const values = await form.validateFields();
			console.log('Form values:', values);
			// Handle form submission
		} catch (error) {
			console.error('Validation failed:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal
			title="Add AWS Account"
			centered
			open={isOpen}
			onCancel={onClose}
			footer={null}
			width={672}
			rootClassName="cloud-integrations-modal"
		>
			{activeView === 'form' ? (
				<Form
					form={form}
					className="cloud-integrations-form"
					layout="vertical"
					onFinish={handleSubmit}
				>
					<div className="cloud-integrations-form__form-group">
						<div className="cloud-integrations-form__title">
							Where should we deploy the SigNoz Cloud stack?
						</div>
						<div className="cloud-integrations-form__description">
							Choose the AWS region for CloudFormation stack deployment
						</div>
						<Form.Item
							name="region"
							rules={[{ required: true, message: 'Please select a region' }]}
							className="cloud-integrations-form__form-item"
						>
							<Select
								placeholder="US East (N. Virginia)"
								suffixIcon={<ChevronDown size={16} color={Color.BG_VANILLA_400} />}
								style={{ height: '44px' }}
								className="cloud-integrations-form__select"
							>
								<Select.Option value="us-east-1">US East (N. Virginia)</Select.Option>
							</Select>
						</Form.Item>
					</div>
					<div className="cloud-integrations-form__form-group">
						<div className="cloud-integrations-form__title">
							Which regions do you want to monitor?
						</div>
						<div className="cloud-integrations-form__description">
							Choose only the regions you want SigNoz to monitor. You can enable all at
							once, or pick specific ones:
						</div>

						<Form.Item
							name="monitorRegions"
							rules={[{ required: true, message: 'Please select regions to monitor' }]}
							className="cloud-integrations-form__form-item"
						>
							<div className="cloud-integrations-form__include-all-regions-switch">
								<Switch size="small" />
								<span>Include all regions</span>
							</div>
							<Select
								style={{ height: '44px' }}
								suffixIcon={null}
								value="Select Region(s)"
								className="cloud-integrations-form__select"
								onClick={(): void => setActiveView('select-regions')}
							/>
						</Form.Item>
					</div>

					<div className="cloud-integrations-form__form-group">
						<div className="cloud-integrations-form__note">
							Note: Some organizations may require the CloudFormation stack to be
							deployed in the same region as their primary infrastructure for
							compliance or latency reasons.
						</div>
					</div>
					<Form.Item>
						<Button
							type="primary"
							htmlType="submit"
							className="cloud-integrations-form__submit-button"
							loading={isLoading}
							block
						>
							Launch Cloud Formation Template
							<SquareArrowOutUpRight size={17} color={Color.BG_VANILLA_100} />
						</Button>
					</Form.Item>
				</Form>
			) : (
				<div>
					<div>Select Region(s)</div>
				</div>
			)}
		</Modal>
	);
}

export default IntegrationModal;
