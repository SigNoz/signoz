import { PlusOutlined } from '@ant-design/icons';
import { Select, Spin } from 'antd';
import useComponentPermission from 'hooks/useComponentPermission';
import { State } from 'hooks/useFetch';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PayloadProps } from 'types/api/channels/getAll';

import { StyledCreateChannelOption, StyledSelect } from './styles';

export interface ChannelSelectProps {
	disabled?: boolean;
	currentValue?: string[];
	onSelectChannels: (s: string[]) => void;
	onDropdownOpen: () => void;
	channels: State<PayloadProps | undefined>;
	handleCreateNewChannels: () => void;
}

function ChannelSelect({
	disabled,
	currentValue,
	onSelectChannels,
	onDropdownOpen,
	channels,
	handleCreateNewChannels,
}: ChannelSelectProps): JSX.Element | null {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const { notifications } = useNotifications();

	const handleChange = (value: string[]): void => {
		if (value.includes('add-new-channel')) {
			handleCreateNewChannels();
			return;
		}
		onSelectChannels(value);
	};

	if (channels.error && channels.errorMessage !== '') {
		notifications.error({
			message: 'Error',
			description: channels.errorMessage,
		});
	}

	const { user } = useAppContext();
	const [addNewChannelPermission] = useComponentPermission(
		['add_new_channel'],
		user.role,
	);

	const renderOptions = (): ReactNode[] => {
		const children: ReactNode[] = [];

		if (!channels.loading && addNewChannelPermission) {
			children.push(
				<Select.Option key="add-new-channel" value="add-new-channel">
					<StyledCreateChannelOption>
						<PlusOutlined />
						Create a new channel
					</StyledCreateChannelOption>
				</Select.Option>,
			);
		}

		if (
			channels.loading ||
			channels.payload === undefined ||
			channels.payload.length === 0
		) {
			return children;
		}

		channels.payload.forEach((o) => {
			children.push(
				<Select.Option key={o.id} value={o.name}>
					{o.name}
				</Select.Option>,
			);
		});

		return children;
	};

	return (
		<StyledSelect
			disabled={disabled}
			status={channels.error ? 'error' : ''}
			mode="multiple"
			style={{ width: '100%' }}
			placeholder={t('placeholder_channel_select')}
			data-testid="alert-channel-select"
			value={currentValue}
			notFoundContent={channels.loading && <Spin size="small" />}
			onDropdownVisibleChange={(open): void => {
				if (open) {
					onDropdownOpen();
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
