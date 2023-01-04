import { Input } from 'antd';
import React, { useCallback } from 'react';

import { Container } from './styles';

const { TextArea } = Input;

function Description({
	description,
	setDescription,
}: DescriptionProps): JSX.Element {
	const onChangeHandler = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setDescription(e.target.value);
		},
		[setDescription],
	);

	return (
		<Container>
			<TextArea
				placeholder="Description of the dashboard"
				onChange={onChangeHandler}
				value={description}
			/>
		</Container>
	);
}

interface DescriptionProps {
	description: string;
	setDescription: React.Dispatch<React.SetStateAction<string>>;
}

export default Description;
