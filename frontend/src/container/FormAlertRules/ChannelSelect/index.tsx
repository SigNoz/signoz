import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from '@signozhq/icons';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import useComponentPermission from 'hooks/useComponentPermission';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { Channels } from 'types/api/channels/getAll';
import APIError from 'types/api/error';

import { StyledCreateChannelOption } from './styles';

const ADD_NEW_CHANNEL_VALUE = 'add-new-channel';

export interface ChannelSelectProps {
	disabled?: boolean;
	currentValue?: string[];
	onSelectChannels: (s: string[]) => void;
	onDropdownOpen: () => void;
	isLoading: boolean;
	channels: Channels[];
	hasError: boolean;
	error: APIError;
	handleCreateNewChannels: () => void;
}

function ChannelSelect({
	disabled,
	currentValue,
	onSelectChannels,
	onDropdownOpen,
	channels,
	isLoading,
	hasError,
	error,
	handleCreateNewChannels,
}: ChannelSelectProps): JSX.Element | null {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const { notifications } = useNotifications();

	const handleChange = (value: string | string[]): void => {
		const arr = Array.isArray(value) ? value : [value];
		if (arr.includes(ADD_NEW_CHANNEL_VALUE)) {
			handleCreateNewChannels();
			return;
		}
		onSelectChannels(arr);
	};

	if (hasError) {
		notifications.error({
			message: error?.getErrorCode?.() || 'Error',
			description: error?.getErrorMessage?.() || 'Something went wrong',
		});
	}

	const { user } = useAppContext();
	const [addNewChannelPermission] = useComponentPermission(
		['add_new_channel'],
		user.role,
	);

	const items = useMemo<ComboboxSimpleItem[]>(() => {
		const result: ComboboxSimpleItem[] = [];

		if (!isLoading && addNewChannelPermission) {
			result.push({
				value: ADD_NEW_CHANNEL_VALUE,
				label: (
					<StyledCreateChannelOption>
						<Plus size="md" />
						Create a new channel
					</StyledCreateChannelOption>
				),
				displayValue: 'Create a new channel',
			});
		}

		if (!isLoading && channels.length > 0) {
			channels.forEach((o) => {
				result.push({
					value: o.name,
					label: o.name,
				});
			});
		}

		return result;
	}, [isLoading, addNewChannelPermission, channels]);

	return (
		<ComboboxSimple
			multiple
			style={{
				width: '100%',
				borderRadius: 4,
			}}
			disabled={disabled}
			className={hasError ? 'channel-select-error' : undefined}
			placeholder={t('placeholder_channel_select')}
			testId="alert-channel-select"
			value={currentValue}
			loading={isLoading}
			items={items}
			onChange={(value): void => {
				// ComboboxSimple has no onOpen callback, so we fire onDropdownOpen
				// (the refetch trigger) on the first interaction via onChange.
				onDropdownOpen();
				handleChange(value);
			}}
		/>
	);
}

ChannelSelect.defaultProps = {
	disabled: false,
	currentValue: [],
};
export default ChannelSelect;
