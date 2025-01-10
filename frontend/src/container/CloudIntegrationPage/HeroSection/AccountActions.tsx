import './AccountActions.style.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Select } from 'antd';
import { SelectProps } from 'antd/lib';
import { useAwsAccounts } from 'hooks/integrations/aws/useAwsAccounts';
import useUrlQuery from 'hooks/useUrlQuery';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

<<<<<<< HEAD
import IntegrationModal from './IntegrationModal';
=======
import { CloudAccount } from '../ServicesSection/types';
import CloudAccountSetupModal from './components/CloudAccountSetupModal';
>>>>>>> 4e8aae120 (feat: integrate now modal states and json server API integration)

interface AccountOptionItemProps {
	label: React.ReactNode;
	isSelected: boolean;
}

function AccountOptionItem({
	label,
	isSelected,
}: AccountOptionItemProps): JSX.Element {
	return (
		<div className="account-option-item">
			{label}
			{isSelected && (
				<div className="account-option-item__selected">
					<Check size={12} color={Color.BG_VANILLA_100} />
				</div>
			)}
		</div>
	);
}

function renderOption(
	option: any,
	activeAccountId: string | null,
): JSX.Element {
	return (
		<AccountOptionItem
			label={option.label}
			isSelected={option.value === activeAccountId}
		/>
	);
}

function AccountActions(): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const { data: accounts } = useAwsAccounts();

	const initialAccountId = useMemo(
		() =>
			accounts?.length
				? urlQuery.get('accountId') || accounts[0].cloud_account_id
				: null,
		[accounts, urlQuery],
	);

	const [activeAccountId, setActiveAccountId] = useState<string | null>(
		initialAccountId,
	);

	// Update state when initial value changes
	useEffect(() => {
		if (initialAccountId !== null) {
			setActiveAccountId(initialAccountId);
		}
	}, [initialAccountId]);

	const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);

	const selectOptions: SelectProps['options'] = accounts?.map((account) => ({
		value: account.cloud_account_id,
		label: account.cloud_account_id,
	}));

	return (
		<div className="hero-section__actions">
			{accounts?.length ? (
				<div className="hero-section__actions-with-account">
					<Select
						value={`Account: ${activeAccountId}`}
						options={selectOptions}
						rootClassName="cloud-account-selector"
						placeholder="Select AWS Account"
						suffixIcon={<ChevronDown size={16} color={Color.BG_VANILLA_400} />}
						optionRender={(option): JSX.Element =>
							renderOption(option, activeAccountId)
						}
						onChange={(value): void => {
							setActiveAccountId(value);
							urlQuery.set('accountId', value);
							navigate({ search: urlQuery.toString() });
						}}
					/>
					<div className="hero-section__action-buttons">
						<Button
							type="primary"
							className="hero-section__action-button primary"
							onClick={(): void => setIsIntegrationModalOpen(true)}
						>
							Add New AWS Account
						</Button>
						<Button type="default" className="hero-section__action-button secondary">
							Account Settings
						</Button>
					</div>
				</div>
			) : (
				<Button
					className="hero-section__action-button primary"
					onClick={(): void => setIsIntegrationModalOpen(true)}
				>
					Integrate Now
				</Button>
			)}

			<CloudAccountSetupModal
				isOpen={isIntegrationModalOpen}
				onClose={(): void => setIsIntegrationModalOpen(false)}
			/>
		</div>
	);
}

export default AccountActions;
