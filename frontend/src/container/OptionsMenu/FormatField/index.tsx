import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleGroup } from '@signozhq/ui/toggle-group';

import { FieldTitle } from '../styles';
import { LogViewMode, OptionsMenuConfig } from '../types';
import { FormatFieldWrapper } from './styles';

function FormatField({ config }: FormatFieldProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);

	const onChange = useCallback(
		(value: string) => {
			if (!config) {
				return;
			}

			config.onChange(value as LogViewMode);
		},
		[config],
	);

	if (!config) {
		return null;
	}

	return (
		<FormatFieldWrapper direction="vertical">
			<FieldTitle>{t('options_menu.format')}</FieldTitle>
			<ToggleGroup
				variant="outlined"
				color="secondary"
				type="single"
				size="sm"
				value={config.value}
				onChange={onChange}
				items={[
					{ value: 'raw', label: t('options_menu.raw') },
					{ value: 'list', label: t('options_menu.default') },
					{ value: 'table', label: t('options_menu.column') },
				]}
			/>
		</FormatFieldWrapper>
	);
}

interface FormatFieldProps {
	config: OptionsMenuConfig['format'];
}

export default FormatField;
