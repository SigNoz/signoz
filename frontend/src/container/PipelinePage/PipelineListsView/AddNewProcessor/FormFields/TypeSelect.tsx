import { useTranslation } from 'react-i18next';
import { SelectSimple } from '@signozhq/ui/select';

import { DEFAULT_PROCESSOR_TYPE, processorTypes } from '../config';
import {
	PipelineIndexIcon,
	ProcessorType,
	ProcessorTypeContainer,
	ProcessorTypeWrapper,
} from '../styles';

function TypeSelect({ onChange, value }: TypeSelectProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	const items = processorTypes.map(({ value, label }) => ({
		value,
		label,
	}));

	return (
		<ProcessorTypeWrapper>
			<PipelineIndexIcon>1</PipelineIndexIcon>
			<ProcessorTypeContainer>
				<ProcessorType>{t('processor_type')}</ProcessorType>
				<SelectSimple
					onChange={(value: string | string[]): void => onChange(value)}
					value={value}
					items={items}
					style={{ width: '12.5rem' }}
				/>
			</ProcessorTypeContainer>
		</ProcessorTypeWrapper>
	);
}

TypeSelect.defaultProps = {
	value: DEFAULT_PROCESSOR_TYPE,
};

interface TypeSelectProps {
	onChange: (value: string | unknown) => void;
	value?: string;
}
export default TypeSelect;
