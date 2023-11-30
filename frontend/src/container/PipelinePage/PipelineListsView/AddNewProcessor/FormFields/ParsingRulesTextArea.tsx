import { Form, Input } from 'antd';
import { ModalFooterTitle } from 'container/PipelinePage/styles';
import { useTranslation } from 'react-i18next';

import { ProcessorFormField } from '../config';
import { Container, FormWrapper, PipelineIndexIcon } from '../styles';

function ParsingRulesTextArea({
	fieldData,
}: ParsingRulesTextAreaProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<Container>
			<PipelineIndexIcon size="small">
				{Number(fieldData.id) + 1}
			</PipelineIndexIcon>
			<FormWrapper>
				<Form.Item
					name={fieldData.name}
					label={<ModalFooterTitle>{fieldData.fieldName}</ModalFooterTitle>}
				>
					<Input.TextArea rows={4} placeholder={t(fieldData.placeholder)} />
				</Form.Item>
			</FormWrapper>
		</Container>
	);
}

interface ParsingRulesTextAreaProps {
	fieldData: ProcessorFormField;
}
export default ParsingRulesTextArea;
