import './IntegrationModal.style.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Form, Modal, Select, Switch } from 'antd';
import { ChevronDown, SquareArrowOutUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { regions } from '../ServicesSection/data';
import { RegionSelector } from './RegionSelector';

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
	const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
	const [includeAllRegions, setIncludeAllRegions] = useState(false);
	const allRegions = useMemo(
		() => regions.flatMap((r) => r.subRegions.map((sr) => sr.name)),
		[],
	);

	const handleSubmit = async (): Promise<void> => {
		try {
			setIsLoading(true);
			const values = await form.validateFields();

			console.log(values);
		} catch (error) {
			console.error('Form submission failed:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleIncludeAllRegionsChange = (checked: boolean): void => {
		setIncludeAllRegions(checked);
		if (checked) {
			// Include "all" when selecting all regions
			setSelectedRegions(['all']);
		} else {
			// Clear selections when switch is turned off
			setSelectedRegions([]);
		}
	};

	const getRegionPreviewText = (selectedRegions: string[]): string[] => {
		if (selectedRegions.includes('all')) {
			// Get all region names
			return allRegions;
		}

		// For non-all selections, return the region names
		return selectedRegions;
	};

	const handleClose = (): void => {
		setActiveView('form');
		setSelectedRegions([]);
		setIncludeAllRegions(false);
		onClose();
	};

	return (
		<Modal
			title={
				activeView === 'form'
					? 'Add AWS Account'
					: 'Which regions do you want to monitor?'
			}
			centered
			open={isOpen}
			onCancel={handleClose}
			footer={
				activeView === 'select-regions'
					? [
							<Button
								onClick={onClose}
								type="default"
								className="integrations-modal-footer__close-button"
								key="close-button"
							>
								Close
							</Button>,
							<Button
								onClick={(): void => setActiveView('form')}
								className="integrations-modal-footer__confirm-button"
								type="primary"
								key="confirm-selection"
							>
								Confirm Selection{' '}
								<span className="integrations-modal-footer__confirm-selection-count">
									(
									{selectedRegions.includes('all')
										? allRegions.length
										: selectedRegions.length}
									)
								</span>
							</Button>,
					  ]
					: null
			}
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
								{regions.flatMap((region) =>
									region.subRegions.map((subRegion) => (
										<Select.Option key={subRegion.id} value={subRegion.id}>
											{subRegion.displayName}
										</Select.Option>
									)),
								)}
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
							rules={[
								{
									validator: async (): Promise<void> => {
										if (selectedRegions.length === 0) {
											throw new Error('Please select at least one region to monitor');
										}
									},
									message: 'Please select at least one region to monitor',
								},
							]}
							className="cloud-integrations-form__form-item"
						>
							<div className="cloud-integrations-form__include-all-regions-switch">
								<Switch
									size="small"
									checked={includeAllRegions}
									onChange={handleIncludeAllRegionsChange}
								/>
								<button
									className="cloud-integrations-form__include-all-regions-switch-label"
									type="button"
									onClick={(): void => handleIncludeAllRegionsChange(!includeAllRegions)}
								>
									Include all regions
								</button>
							</div>
							<Select
								style={{ height: '44px' }}
								suffixIcon={null}
								placeholder="Select Region(s)"
								className="cloud-integrations-form__select monitor-regions"
								onClick={(): void => setActiveView('select-regions')}
								mode="multiple"
								maxTagCount={3}
								value={getRegionPreviewText(selectedRegions)}
								disabled
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
							disabled={selectedRegions?.length === 0}
							block
						>
							Launch Cloud Formation Template
							<SquareArrowOutUpRight size={17} color={Color.BG_VANILLA_100} />
						</Button>
					</Form.Item>
				</Form>
			) : (
				<RegionSelector
					selectedRegions={selectedRegions}
					setSelectedRegions={setSelectedRegions}
					setIncludeAllRegions={setIncludeAllRegions}
				/>
			)}
		</Modal>
	);
}

export default IntegrationModal;
