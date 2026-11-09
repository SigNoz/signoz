import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from '@signozhq/icons';
import { Select, Spin } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useChannelSearch } from 'hooks/notificationChannels/useChannelSearch';
import { useNotificationChannelCollectionPermissions } from 'hooks/notificationChannels/useNotificationChannelCollectionPermissions';
import { useNotifications } from 'hooks/useNotifications';

import { StyledCreateChannelOption, StyledSelect } from './styles';

export interface ChannelSelectProps {
	disabled?: boolean;
	currentValue?: string[];
	onSelectChannels: (s: string[]) => void;
	handleCreateNewChannels: () => void;
}

function ChannelSelect({
	disabled,
	currentValue,
	onSelectChannels,
	handleCreateNewChannels,
}: ChannelSelectProps): JSX.Element | null {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const { notifications } = useNotifications();
	const {
		options,
		searchTerm,
		setSearchTerm,
		isSearching,
		isError: hasError,
		error,
		refetch,
		loadMoreOnScroll,
	} = useChannelSearch();

	const handleChange = (value: string[]): void => {
		if (value.includes('add-new-channel')) {
			handleCreateNewChannels();
			return;
		}
		onSelectChannels(value);
	};

	if (hasError) {
		const apiError = convertToApiError(error);
		notifications.error({
			message: apiError?.getErrorCode?.() || 'Error',
			description: apiError?.getErrorMessage?.() || 'Something went wrong',
		});
	}

	const { canCreate: addNewChannelPermission } =
		useNotificationChannelCollectionPermissions();

	const renderOptions = (): ReactNode[] => {
		const children: ReactNode[] = [];

		if (!isSearching && addNewChannelPermission) {
			children.push(
				<Select.Option key="add-new-channel" value="add-new-channel">
					<StyledCreateChannelOption>
						<Plus size="md" />
						Create a new channel
					</StyledCreateChannelOption>
				</Select.Option>,
			);
		}

		options.forEach((o) => {
			children.push(
				<Select.Option key={o.value} value={o.value}>
					{o.label}
				</Select.Option>,
			);
		});

		return children;
	};

	return (
		<StyledSelect
			disabled={disabled}
			status={hasError ? 'error' : ''}
			mode="multiple"
			style={{ width: '100%' }}
			placeholder={t('placeholder_channel_select')}
			data-testid="alert-channel-select"
			value={currentValue}
			searchValue={searchTerm}
			onSearch={setSearchTerm}
			onSelect={(): void => setSearchTerm('')}
			filterOption={false}
			onPopupScroll={loadMoreOnScroll}
			notFoundContent={isSearching && <Spin size="small" />}
			onDropdownVisibleChange={(open): void => {
				if (open) {
					refetch();
				} else {
					setSearchTerm('');
				}
			}}
			onChange={(value): void => {
				handleChange(value as string[]);
			}}
			optionLabelProp="label"
		>
			{renderOptions()}
		</StyledSelect>
	);
}

ChannelSelect.defaultProps = {
	disabled: false,
	currentValue: [],
};
export default ChannelSelect;
