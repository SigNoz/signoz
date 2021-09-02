import { Input } from 'antd';
import { Form } from 'antd';
import React, { useCallback } from 'react';

import { Container } from './styles';
const { TextArea } = Input;

const Description = ({
	description,
	setDescription,
}: DescriptionProps): JSX.Element => {
	const onChangeHandler = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setDescription(e.target.value);
		},
		[],
	);

	return (
		<Container>
			<Form.Item labelCol={{ span: 24 }} label="Description">
				<TextArea
					placeholder={'Description of the dashboard'}
					onChange={onChangeHandler}
					value={description}
				></TextArea>
			</Form.Item>
		</Container>
	);
};

interface DescriptionProps {
	description: string;
	setDescription: React.Dispatch<React.SetStateAction<string>>;
}

export default Description;
