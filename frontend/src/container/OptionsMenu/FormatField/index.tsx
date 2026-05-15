import './FormatField.styles.scss';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';
import { LogViewMode } from 'container/LogsTable';

import { FieldTitle } from '../styles';
import { OptionsMenuConfig } from '../types';
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
				type="single"
				size="sm"
				value={config.value}
				onChange={onChange}
				className="format-field-toggle-group"
			>
				<ToggleGroupItem value="raw" className="format-field-toggle-item">
					{t('options_menu.raw')}
				</ToggleGroupItem>
				<ToggleGroupItem value="list" className="format-field-toggle-item">
					{t('options_menu.default')}
				</ToggleGroupItem>
				<ToggleGroupItem value="table" className="format-field-toggle-item">
					{t('options_menu.column')}
				</ToggleGroupItem>
			</ToggleGroup>
		</FormatFieldWrapper>
	);
}

interface FormatFieldProps {
	config: OptionsMenuConfig['format'];
}

export default FormatField;
