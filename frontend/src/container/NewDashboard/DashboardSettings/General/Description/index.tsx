import { Input } from 'antd';
import { ChangeEvent, Dispatch, SetStateAction, useCallback } from 'react';

import { Container } from './styles';

const { TextArea } = Input;

function Description({
	description,
	setDescription,
}: DescriptionProps): JSX.Element {
	const onChangeHandler = useCallback(
		(e: ChangeEvent<HTMLTextAreaElement>) => {
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
	setDescription: Dispatch<SetStateAction<string>>;
}

export default Description;
