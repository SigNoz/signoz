import { useTranslation } from 'react-i18next';

import { FieldTitle } from '../styles';
import { OptionsMenuConfig } from '../types';
import { MaxLinesFieldWrapper, MaxLinesInput } from './styles';

function MaxLinesField({ config }: MaxLinesFieldProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);

	if (!config) return null;

	return (
		<MaxLinesFieldWrapper>
			<FieldTitle>{t('options_menu.maxLines')}</FieldTitle>
			<MaxLinesInput
				controls
				size="small"
				value={config.value}
				onChange={config.onChange}
			/>
		</MaxLinesFieldWrapper>
	);
}

interface MaxLinesFieldProps {
	config: OptionsMenuConfig['maxLines'];
}

export default MaxLinesField;
