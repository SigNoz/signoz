import { ChangeEvent, Dispatch, SetStateAction, useCallback } from 'react';
import Input from 'components/Input';

function DashboardName({ setName, name }: DashboardNameProps): JSX.Element {
	const onChangeHandler = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
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
}

interface DashboardNameProps {
	name: string;
	setName: Dispatch<SetStateAction<string>>;
}

export default DashboardName;
