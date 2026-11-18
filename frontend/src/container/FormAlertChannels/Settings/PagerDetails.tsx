import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Input as AntdInput } from 'antd';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormField from '../FormField';

const { TextArea } = AntdInput;

const serialize = (details?: Record<string, string>): string =>
	details && Object.keys(details).length > 0 ? JSON.stringify(details) : '';

function PagerDetails(): JSX.Element {
	const { t } = useTranslation('channels');
	const { getValues, setValue } = useFormContext<ChannelSpecFormValues>();

	const [text, setText] = useState<string>(() =>
		serialize(getValues('details') ?? undefined),
	);
	const [error, setError] = useState<string | null>(null);

	const onChange = (value: string): void => {
		setText(value);

		if (value.trim() === '') {
			setError(null);
			setValue('details', {}, { shouldDirty: true });
			return;
		}

		try {
			setValue('details', JSON.parse(value), { shouldDirty: true });
			setError(null);
		} catch {
			setError(t('pager_details_invalid_json'));
		}
	};

	return (
		<FormField
			error={error ?? undefined}
			help={t('help_pager_details')}
			label={t('field_pager_details')}
		>
			<TextArea
				rows={4}
				value={text}
				onChange={(event): void => onChange(event.target.value)}
				data-testid="pager-additional-details-textarea"
			/>
		</FormField>
	);
}

export default PagerDetails;
