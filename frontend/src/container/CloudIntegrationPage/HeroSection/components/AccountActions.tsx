import './AccountActions.style.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Select } from 'antd';
import { SelectProps } from 'antd/lib';
import { useAwsAccounts } from 'hooks/integrations/aws/useAwsAccounts';
import useUrlQuery from 'hooks/useUrlQuery';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import { CloudAccount } from '../../ServicesSection/types';
import AccountSettingsModal from './AccountSettingsModal';
import CloudAccountSetupModal from './CloudAccountSetupModal';

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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	option: any,
	activeAccountId: string | undefined,
): JSX.Element {
	return (
		<AccountOptionItem
			label={option.label}
			isSelected={option.value === activeAccountId}
		/>
	);
}

const getAccountById = (
	accounts: CloudAccount[],
	accountId: string,
): CloudAccount | null =>
	accounts.find((account) => account.cloud_account_id === accountId) || null;

function AccountActions(): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const { data: accounts } = useAwsAccounts();

	const initialAccount = useMemo(
		() =>
			accounts?.length
				? getAccountById(accounts, urlQuery.get('accountId') || '') || accounts[0]
				: null,
		[accounts, urlQuery],
	);

	const [activeAccount, setActiveAccount] = useState<CloudAccount | null>(
		initialAccount,
	);

	// Update state when initial value changes
	useEffect(() => {
		if (initialAccount !== null) {
			setActiveAccount(initialAccount);
		}
	}, [initialAccount]);

	const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
	const [isAccountSettingsModalOpen, setIsAccountSettingsModalOpen] = useState(
		false,
	);

	const selectOptions: SelectProps['options'] = accounts?.map((account) => ({
		value: account.cloud_account_id,
		label: account.cloud_account_id,
	}));

	return (
		<div className="hero-section__actions">
			{accounts?.length ? (
				<div className="hero-section__actions-with-account">
					<Select
						value={`Account: ${activeAccount?.cloud_account_id}`}
						options={selectOptions}
						rootClassName="cloud-account-selector"
						placeholder="Select AWS Account"
						suffixIcon={<ChevronDown size={16} color={Color.BG_VANILLA_400} />}
						optionRender={(option): JSX.Element =>
							renderOption(option, activeAccount?.cloud_account_id)
						}
						onChange={(value): void => {
							setActiveAccount(getAccountById(accounts, value));
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
						<Button
							type="default"
							className="hero-section__action-button secondary"
							onClick={(): void => setIsAccountSettingsModalOpen(true)}
						>
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

			<AccountSettingsModal
				isOpen={isAccountSettingsModalOpen}
				onClose={(): void => setIsAccountSettingsModalOpen(false)}
				account={activeAccount as CloudAccount}
				setActiveAccount={setActiveAccount}
			/>
		</div>
	);
}

export default AccountActions;
