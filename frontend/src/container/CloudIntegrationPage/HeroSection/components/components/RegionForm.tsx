import { Color } from '@signozhq/design-tokens';
import { Button, Form, Select, Switch } from 'antd';
import cx from 'classnames';
import { useAccountStatus } from 'hooks/integrations/aws/useAccountStatus';
import { ChevronDown, SquareArrowOutUpRight } from 'lucide-react';
import { useRef } from 'react';
import { AccountStatusResponse } from 'types/api/integrations/aws';

import { regions } from '../../ServicesSection/data';
import AlertMessage from '../AlertMessage';
import { ModalStateEnum, RegionFormProps } from '../types';

const allRegions = (): string[] =>
	regions.flatMap((r) => r.subRegions.map((sr) => sr.name));

const getRegionPreviewText = (regions: string[]): string[] => {
	if (regions.includes('all')) {
		return allRegions();
	}
	return regions;
};

export function RegionForm({
	form,
	modalState,
	setModalState,
	selectedRegions,
	includeAllRegions,
	isLoading,
	isGeneratingUrl,
	onIncludeAllRegionsChange,
	onRegionSelect,
	onSubmit,
	accountId,
	selectedDeploymentRegion,
	handleRegionChange,
}: RegionFormProps): JSX.Element {
	const startTimeRef = useRef(Date.now());
	const refetchInterval = 10 * 1000;
	const errorTimeout = 5 * 60 * 1000;

	const { isLoading: isAccountStatusLoading } = useAccountStatus(
		accountId ?? null,
		{
			refetchInterval,
			enabled: !!accountId && modalState === ModalStateEnum.WAITING,
			onSuccess: (data: AccountStatusResponse) => {
				if (data.data.status.integration.last_heartbeat_ts_ms !== null) {
					setModalState(ModalStateEnum.SUCCESS);
				} else if (Date.now() - startTimeRef.current >= errorTimeout) {
					// 5 minutes in milliseconds
					setModalState(ModalStateEnum.ERROR);
				}
			},
			onError: () => {
				setModalState(ModalStateEnum.ERROR);
			},
		},
	);

	const isFormDisabled =
		modalState === ModalStateEnum.WAITING || isAccountStatusLoading;

	return (
		<Form
			form={form}
			className="cloud-integrations-form "
			layout="vertical"
			onFinish={onSubmit}
		>
			<AlertMessage modalState={modalState} />

			<div
				className={cx(`cloud-integrations-form__content`, {
					disabled: isFormDisabled,
				})}
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
							placeholder="e.g. US East (N. Virginia)"
							suffixIcon={<ChevronDown size={16} color={Color.BG_VANILLA_400} />}
							style={{ height: '44px' }}
							className="cloud-integrations-form__select"
							onChange={handleRegionChange}
							value={selectedDeploymentRegion}
							disabled={isFormDisabled}
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
								onChange={onIncludeAllRegionsChange}
								disabled={isFormDisabled}
							/>
							<button
								className="cloud-integrations-form__include-all-regions-switch-label"
								type="button"
								onClick={(): void =>
									!isFormDisabled
										? onIncludeAllRegionsChange(!includeAllRegions)
										: undefined
								}
							>
								Include all regions
							</button>
						</div>
						<Select
							style={{ height: '44px' }}
							suffixIcon={null}
							placeholder="Select Region(s)"
							className="cloud-integrations-form__select monitor-regions"
							onClick={!isFormDisabled ? onRegionSelect : undefined}
							mode="multiple"
							maxTagCount={3}
							value={getRegionPreviewText(selectedRegions)}
							open={false}
						/>
					</Form.Item>
				</div>
				<div className="cloud-integrations-form__form-group">
					<div className="cloud-integrations-form__note">
						Note: Some organizations may require the CloudFormation stack to be
						deployed in the same region as their primary infrastructure for compliance
						or latency reasons.
					</div>
				</div>
				<Form.Item>
					<Button
						type="primary"
						htmlType="submit"
						className="cloud-integrations-form__submit-button"
						loading={isLoading || isGeneratingUrl}
						disabled={
							!form.getFieldValue('region') ||
							selectedRegions?.length === 0 ||
							isGeneratingUrl ||
							isFormDisabled
						}
						block
					>
						Launch Cloud Formation Template
						<SquareArrowOutUpRight size={17} color={Color.BG_VANILLA_100} />
					</Button>
				</Form.Item>
			</div>
		</Form>
	);
}
