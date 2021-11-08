import Editor from 'components/Editor';
import React, { useCallback, useRef } from 'react';
import { Button } from 'antd';
import { EditFilled } from '@ant-design/icons';
import { ButtonContainer } from './styles';

const EditRules = () => {
	const value = useRef<string>('');

	const onClickHandler = useCallback(() => {
		console.log(value.current);
	}, []);

	return (
		<>
			<Editor value={value} />

			<ButtonContainer>
				<Button icon={<EditFilled />} onClick={onClickHandler}>
					Edit
				</Button>
			</ButtonContainer>
		</>
	);
};

export default EditRules;
