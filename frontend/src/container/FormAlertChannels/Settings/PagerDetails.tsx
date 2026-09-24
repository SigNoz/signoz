import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';

const { TextArea } = Input;

interface PagerDetailsProps {
	setSelectedConfig: Dispatch<SetStateAction<ChannelSpecFormValues>>;
	initialDetails?: Record<string, string>;
}

const serialize = (details?: Record<string, string>): string =>
	details && Object.keys(details).length > 0 ? JSON.stringify(details) : '';

/**
 * The API models these details as a map, so the raw JSON the box edits is held
 * here: a half-typed object is not valid JSON and would not survive a round trip
 * through the form's parsed value.
 */
function PagerDetails({
	setSelectedConfig,
	initialDetails,
}: PagerDetailsProps): JSX.Element {
	const { t } = useTranslation('channels');
	const [text, setText] = useState<string>(() => serialize(initialDetails));
	const [error, setError] = useState<string | null>(null);

	const onChange = (value: string): void => {
		setText(value);

		if (value.trim() === '') {
			setError(null);
			setSelectedConfig((config) => ({ ...config, details: {} }));
			return;
		}

		try {
			const parsed = JSON.parse(value);
			setError(null);
			setSelectedConfig((config) => ({ ...config, details: parsed }));
		} catch {
			setError(t('pager_details_invalid_json'));
		}
	};

	return (
		<Form.Item
			help={error ?? t('help_pager_details')}
			label={t('field_pager_details')}
			validateStatus={error ? 'error' : undefined}
		>
			<TextArea
				rows={4}
				value={text}
				onChange={(event): void => onChange(event.target.value)}
				data-testid="pager-additional-details-textarea"
			/>
		</Form.Item>
	);
}

export default PagerDetails;
