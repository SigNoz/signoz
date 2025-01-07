import './AccountActions.style.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Select } from 'antd';
import { SelectProps } from 'antd/lib';
import useUrlQuery from 'hooks/useUrlQuery';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import { CloudAccount } from '../ServicesSection/types';

interface AccountActionsProps {
	accounts: CloudAccount[];
}

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

function AccountActions({ accounts }: AccountActionsProps): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const [activeAccountId, setActiveAccountId] = useState<string | null>(
		urlQuery.get('accountId') ?? accounts[0]?.cloud_account_id ?? null,
	);

	const selectOptions: SelectProps['options'] = accounts.map((account) => ({
		value: account.cloud_account_id,
		label: account.cloud_account_id,
	}));

	return (
		<div className="hero-section__actions">
			{accounts.length ? (
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
						<Button type="primary" className="hero-section__action-button primary">
							Add New AWS Account
						</Button>
						<Button type="default" className="hero-section__action-button secondary">
							Account Settings
						</Button>
					</div>
				</div>
			) : (
				<Button type="primary" className="hero-section__action-button primary">
					Integrate Now
				</Button>
			)}
		</div>
	);
}

export default AccountActions;
