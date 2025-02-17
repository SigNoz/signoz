import './AccountActions.style.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Select, Skeleton } from 'antd';
import { SelectProps } from 'antd/lib';
import { useAwsAccounts } from 'hooks/integration/aws/useAwsAccounts';
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

function AccountActionsRenderer({
	accounts,
	isLoading,
	activeAccount,
	selectOptions,
	onAccountChange,
	onIntegrationModalOpen,
	onAccountSettingsModalOpen,
}: {
	accounts: CloudAccount[] | undefined;
	isLoading: boolean;
	activeAccount: CloudAccount | null;
	selectOptions: SelectProps['options'];
	onAccountChange: (value: string) => void;
	onIntegrationModalOpen: () => void;
	onAccountSettingsModalOpen: () => void;
}): JSX.Element {
	if (isLoading) {
		return (
			<div className="hero-section__actions-with-account">
				<Skeleton.Input
					active
					size="large"
					block
					className="hero-section__input-skeleton"
				/>
				<div className="hero-section__action-buttons">
					<Skeleton.Button
						active
						size="large"
						className="hero-section__new-account-button-skeleton"
					/>
					<Skeleton.Button
						active
						size="large"
						className="hero-section__account-settings-button-skeleton"
					/>
				</div>
			</div>
		);
	}
	if (accounts?.length) {
		return (
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
					onChange={onAccountChange}
				/>
				<div className="hero-section__action-buttons">
					<Button
						type="primary"
						className="hero-section__action-button primary"
						onClick={onIntegrationModalOpen}
					>
						Add New AWS Account
					</Button>
					<Button
						type="default"
						className="hero-section__action-button secondary"
						onClick={onAccountSettingsModalOpen}
					>
						Account Settings
					</Button>
				</div>
			</div>
		);
	}
	return (
		<Button
			className="hero-section__action-button primary"
			onClick={onIntegrationModalOpen}
		>
			Integrate Now
		</Button>
	);
}

function AccountActions(): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const { data: accounts, isLoading } = useAwsAccounts();

	const initialAccount = useMemo(
		() =>
			accounts?.length
				? getAccountById(accounts, urlQuery.get('cloudAccountId') || '') ||
				  accounts[0]
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
			const latestUrlQuery = new URLSearchParams(window.location.search);
			latestUrlQuery.set('cloudAccountId', initialAccount.cloud_account_id);
			navigate({ search: latestUrlQuery.toString() });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialAccount]);

	const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
	const [isAccountSettingsModalOpen, setIsAccountSettingsModalOpen] = useState(
		false,
	);

	const selectOptions: SelectProps['options'] = useMemo(
		() =>
			accounts?.length
				? accounts.map((account) => ({
						value: account.cloud_account_id,
						label: account.cloud_account_id,
				  }))
				: [],
		[accounts],
	);

	return (
		<div className="hero-section__actions">
			<AccountActionsRenderer
				accounts={accounts}
				isLoading={isLoading}
				activeAccount={activeAccount}
				selectOptions={selectOptions}
				onAccountChange={(value): void => {
					if (accounts) {
						setActiveAccount(getAccountById(accounts, value));
						urlQuery.set('cloudAccountId', value);
						navigate({ search: urlQuery.toString() });
					}
				}}
				onIntegrationModalOpen={(): void => setIsIntegrationModalOpen(true)}
				onAccountSettingsModalOpen={(): void => setIsAccountSettingsModalOpen(true)}
			/>

			{isIntegrationModalOpen && (
				<CloudAccountSetupModal
					onClose={(): void => setIsIntegrationModalOpen(false)}
				/>
			)}

			{isAccountSettingsModalOpen && (
				<AccountSettingsModal
					onClose={(): void => setIsAccountSettingsModalOpen(false)}
					account={activeAccount as CloudAccount}
					setActiveAccount={setActiveAccount}
				/>
			)}
		</div>
	);
}

export default AccountActions;
