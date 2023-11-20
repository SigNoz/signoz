import { Select } from 'antd';
import getChannels from 'api/channels/getAll';
import useFetch from 'hooks/useFetch';
import { useNotifications } from 'hooks/useNotifications';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { StyledSelect } from './styles';

export interface ChannelSelectProps {
	currentValue?: string[];
	onSelectChannels: (s: string[]) => void;
}

function ChannelSelect({
	currentValue,
	onSelectChannels,
}: ChannelSelectProps): JSX.Element | null {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const { loading, payload, error, errorMessage } = useFetch(getChannels);

	const { notifications } = useNotifications();

	const handleChange = (value: string[]): void => {
		onSelectChannels(value);
	};

	if (error && errorMessage !== '') {
		notifications.error({
			message: 'Error',
			description: errorMessage,
		});
	}
	const renderOptions = (): ReactNode[] => {
		const children: ReactNode[] = [];

		if (loading || payload === undefined || payload.length === 0) {
			return children;
		}

		payload.forEach((o) => {
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
			status={error ? 'error' : ''}
			mode="multiple"
			style={{ width: '100%' }}
			placeholder={t('placeholder_channel_select')}
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
	currentValue: [],
};
export default ChannelSelect;
