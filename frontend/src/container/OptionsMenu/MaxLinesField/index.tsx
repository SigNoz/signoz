import { useTranslation } from 'react-i18next';
import { Typography } from '@signozhq/ui/typography';

import { OptionsMenuConfig } from '../types';
import { MaxLinesFieldWrapper, MaxLinesInput } from './styles';

function MaxLinesField({ config }: MaxLinesFieldProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);

	if (!config) {
		return null;
	}

	return (
		<MaxLinesFieldWrapper>
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{t('options_menu.maxLines')}
			</Typography>
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
