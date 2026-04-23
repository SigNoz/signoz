import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Color } from '@signozhq/design-tokens';
import { Button } from '@signozhq/ui';
import { Select, Skeleton } from 'antd';
import { SelectProps } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { useListAccounts } from 'api/generated/services/cloudintegration';
import { getAccountById } from 'container/Integrations/CloudIntegration/utils';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import useUrlQuery from 'hooks/useUrlQuery';
import { ChevronDown, Dot, PencilLine, Plug, Plus } from 'lucide-react';

import { mapAccountDtoToAwsCloudAccount } from '../../mapAwsCloudAccountFromDto';
import { CloudAccount } from '../../types';
import AccountSettingsModal from './AccountSettingsModal';
import CloudAccountSetupModal from './CloudAccountSetupModal';

import './AccountActions.style.scss';

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
				<Skeleton.Input active block className="hero-section__input-skeleton" />
			</div>
		);
	}

	if (accounts?.length) {
		return (
			<div className="hero-section__actions-with-account">
				<div className="hero-section__actions-with-account-selector-container">
					<div className="selected-cloud-integration-account-status">
						<Dot size={24} color={Color.BG_FOREST_500} />
					</div>

					<div className="account-selector-label">Account:</div>

					<span className="account-selector">
						<Select
							value={activeAccount?.providerAccountId}
							options={selectOptions}
							rootClassName="cloud-account-selector"
							popupMatchSelectWidth={false}
							placeholder="Select AWS Account"
							suffixIcon={<ChevronDown size={16} color={Color.BG_VANILLA_400} />}
							onChange={onAccountChange}
						/>
					</span>
				</div>
				<div className="hero-section__action-buttons">
					<Button
						variant="link"
						size="sm"
						color="secondary"
						prefix={<PencilLine size={14} />}
						onClick={onAccountSettingsModalOpen}
					>
						Edit Account
					</Button>

					<Button
						variant="link"
						size="sm"
						color="secondary"
						onClick={onIntegrationModalOpen}
						prefix={<Plus size={14} />}
					>
						Add New Account
					</Button>
				</div>
			</div>
		);
	}
	return (
		<Button
			variant="solid"
			color="primary"
			prefix={<Plug size={14} />}
			onClick={onIntegrationModalOpen}
			size="sm"
		>
			Integrate Now
		</Button>
	);
}

function AccountActions(): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const { data: listAccountsResponse, isLoading } = useListAccounts({
		cloudProvider: INTEGRATION_TYPES.AWS,
	});
	const accounts = useMemo((): CloudAccount[] | undefined => {
		const raw = listAccountsResponse?.data?.accounts;
		if (!raw) {
			return undefined;
		}
		return raw
			.map(mapAccountDtoToAwsCloudAccount)
			.filter((account): account is CloudAccount => account !== null);
	}, [listAccountsResponse]);

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
			return;
		}

		setActiveAccount(null);
		const latestUrlQuery = new URLSearchParams(window.location.search);
		latestUrlQuery.delete('cloudAccountId');
		navigate({ search: latestUrlQuery.toString() });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialAccount]);

	const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
	const startAccountConnectionAttempt = (): void => {
		setIsIntegrationModalOpen(true);
		logEvent('AWS Integration: Account connection attempt started', {});
	};

	const [isAccountSettingsModalOpen, setIsAccountSettingsModalOpen] = useState(
		false,
	);
	const openAccountSettings = (): void => {
		setIsAccountSettingsModalOpen(true);
		logEvent('AWS Integration: Account settings viewed', {
			cloudAccountId: activeAccount?.cloud_account_id,
		});
	};

	// log telemetry event when an account is viewed.
	useEffect(() => {
		if (activeAccount) {
			logEvent('AWS Integration: Account viewed', {
				cloudAccountId: activeAccount?.cloud_account_id,
				status: activeAccount?.status,
				enabledRegions: activeAccount?.config?.regions,
			});
		}
	}, [activeAccount]);

	const selectOptions: SelectProps['options'] = useMemo(
		() =>
			accounts?.length
				? accounts.map((account) => ({
						value: account.cloud_account_id,
						label: account.providerAccountId,
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
				onIntegrationModalOpen={startAccountConnectionAttempt}
				onAccountSettingsModalOpen={openAccountSettings}
			/>

			{isIntegrationModalOpen && (
				<CloudAccountSetupModal
					onClose={(): void => setIsIntegrationModalOpen(false)}
				/>
			)}

			{isAccountSettingsModalOpen && activeAccount && (
				<AccountSettingsModal
					onClose={(): void => setIsAccountSettingsModalOpen(false)}
					account={activeAccount}
					setActiveAccount={setActiveAccount}
				/>
			)}
		</div>
	);
}

export default AccountActions;
