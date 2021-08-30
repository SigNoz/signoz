import { Col, Row } from 'antd';
import Input from 'components/Input';
import React, { useCallback, useState } from 'react';

const NameOfTheDashboard = (): JSX.Element => {
	const [name, setName] = useState<string>('');

	const onChangeHandler = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setName(e.target.value);
		},
		[],
	);

	return (
		<Row>
			<Col lg={6}>
				<Input
					size="middle"
					placeholder="New Dashboard 1"
					value={name}
					onChangeHandler={onChangeHandler}
				/>
			</Col>
		</Row>
	);
};

export default NameOfTheDashboard;
