import Input from 'components/Input';
import React, { useCallback } from 'react';

const NameOfTheDashboard = ({
	setName,
	name,
}: NameOfTheDashboardProps): JSX.Element => {
	const onChangeHandler = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setName(e.target.value);
		},
		[setName],
	);

	return (
		<Input
			size="middle"
			placeholder="Title"
			value={name}
			onChangeHandler={onChangeHandler}
		/>
	);
};

interface NameOfTheDashboardProps {
	name: string;
	setName: React.Dispatch<React.SetStateAction<string>>;
}

export default NameOfTheDashboard;
