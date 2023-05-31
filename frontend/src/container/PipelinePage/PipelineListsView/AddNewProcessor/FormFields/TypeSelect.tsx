import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { DEFAULT_PROCESSOR_TYPE, processorTypes } from '../config';
import {
	PipelineIndexIcon,
	ProcessorType,
	ProcessorTypeContainer,
	ProcessorTypeWrapper,
	StyledSelect,
} from '../styles';

function TypeSelect({ onChange, value }: TypeSelectProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<ProcessorTypeWrapper>
			<PipelineIndexIcon size="small">1</PipelineIndexIcon>
			<ProcessorTypeContainer>
				<ProcessorType>{t('processor_type')}</ProcessorType>
				<StyledSelect
					onChange={(value: string | unknown): void => onChange(value)}
					value={value}
				>
					{processorTypes.map(({ value, label }) => (
						<Select.Option key={value + label} value={value}>
							{label}
						</Select.Option>
					))}
				</StyledSelect>
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
