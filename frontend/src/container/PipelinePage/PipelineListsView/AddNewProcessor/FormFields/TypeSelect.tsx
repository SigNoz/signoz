import { Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_PROCESSOR_TYPE, processorTypes } from '../config';
import {
	PipelineIndexIcon,
	ProcessorType,
	ProcessorTypeContainer,
	ProcessorTypeWrapper,
} from '../styles';

function TypeSelect({ onChange, value }: TypeSelectProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<ProcessorTypeWrapper>
			<PipelineIndexIcon size="small">1</PipelineIndexIcon>
			<ProcessorTypeContainer>
				<ProcessorType>{t('processor_type')}</ProcessorType>
				<Select style={{ width: 200 }} onChange={onChange} defaultValue={value}>
					{processorTypes.map(({ value, label }) => (
						<Select.Option key={value + label} value={value}>
							{label}
						</Select.Option>
					))}
				</Select>
			</ProcessorTypeContainer>
		</ProcessorTypeWrapper>
	);
}

TypeSelect.defaultProps = {
	value: DEFAULT_PROCESSOR_TYPE,
};

interface TypeSelectProps {
	onChange: (type: string) => void;
	value?: string;
}
export default TypeSelect;
