import { Select } from 'antd';
import { State } from 'hooks/useFetch';
import { useNotifications } from 'hooks/useNotifications';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PayloadProps } from 'types/api/channels/getAll';

import { StyledSelect } from './styles';

export interface ChannelSelectProps {
	disabled?: boolean;
	currentValue?: string[];
	onSelectChannels: (s: string[]) => void;
	channels: State<PayloadProps | undefined>;
}

function ChannelSelect({
	disabled,
	currentValue,
	onSelectChannels,
	channels,
}: ChannelSelectProps): JSX.Element | null {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const { notifications } = useNotifications();

	const handleChange = (value: string[]): void => {
		onSelectChannels(value);
	};

	if (channels.error && channels.errorMessage !== '') {
		notifications.error({
			message: 'Error',
			description: channels.errorMessage,
		});
	}
	const renderOptions = (): ReactNode[] => {
		const children: ReactNode[] = [];

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
