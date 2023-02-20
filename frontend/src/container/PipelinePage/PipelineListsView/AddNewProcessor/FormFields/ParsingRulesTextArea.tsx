import { Form, Input } from 'antd';
import { ModalFooterTitle } from 'container/PipelinePage/styles';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ProcessorFormField } from '../config';
import { Container, PipelineIndexIcon } from '../styles';

function ParsingRulesTextArea({
	fieldData,
}: ParsingRulesTextAreaProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<Container>
			<PipelineIndexIcon size="small">
				{Number(fieldData.id) + 1}
			</PipelineIndexIcon>
			<div style={{ width: '100%' }}>
				<Form.Item
					name={fieldData.name}
					label={<ModalFooterTitle>{fieldData.fieldName}</ModalFooterTitle>}
				>
					<Input.TextArea
						rows={4}
						name={fieldData.name}
						placeholder={t(fieldData.placeholder)}
					/>
				</Form.Item>
			</div>
		</Container>
	);
}

interface ParsingRulesTextAreaProps {
	fieldData: ProcessorFormField;
}
export default ParsingRulesTextArea;
