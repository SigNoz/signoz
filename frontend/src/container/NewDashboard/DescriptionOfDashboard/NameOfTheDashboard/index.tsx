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
		[],
	);

	return (
		<Input
			label="Title"
			labelOnTop
			size="middle"
			placeholder="New Dashboard 1"
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
