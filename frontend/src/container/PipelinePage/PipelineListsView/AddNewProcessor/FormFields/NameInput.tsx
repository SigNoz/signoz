import { Form, Input } from 'antd';
import { ModalFooterTitle } from 'container/PipelinePage/styles';
import { useTranslation } from 'react-i18next';

import { formValidationRules } from '../../config';
import { ProcessorFormField } from '../config';
import { Container, FormWrapper, PipelineIndexIcon } from '../styles';

function NameInput({ fieldData }: NameInputProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<Container>
			<PipelineIndexIcon size="small">
				{Number(fieldData.id) + 1}
			</PipelineIndexIcon>
			<FormWrapper>
				<Form.Item
					required={false}
					label={<ModalFooterTitle>{fieldData.fieldName}</ModalFooterTitle>}
					key={fieldData.id}
					name={fieldData.name}
					initialValue={fieldData.initialValue}
					rules={fieldData.rules ? fieldData.rules : formValidationRules}
					dependencies={fieldData.dependencies || []}
				>
					<Input placeholder={t(fieldData.placeholder)} />
				</Form.Item>
			</FormWrapper>
		</Container>
	);
}

interface NameInputProps {
	fieldData: ProcessorFormField;
}
export default NameInput;
