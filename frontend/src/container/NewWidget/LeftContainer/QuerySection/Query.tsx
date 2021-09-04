import { Divider } from 'antd';
import Input from 'components/Input';
import React, { useCallback, useState } from 'react';

import { Container, InputContainer } from './styles';

const Query = (): JSX.Element => {
	const [promqlQuery, setPromqlQuery] = useState('');
	const [legendFormat, setLegendFormat] = useState('');

	const onChangeHandler = useCallback(
		(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const onBlurHandler = useCallback(() => {
		// this is the place we need to fire the query
	}, []);

	return (
		<Container>
			<InputContainer>
				<Input
					onChangeHandler={(event): void =>
						onChangeHandler(setPromqlQuery, event.target.value)
					}
					size="middle"
					value={promqlQuery}
					addonBefore={'PromQL Query'}
					onBlur={onBlurHandler}
				/>
			</InputContainer>

			<InputContainer>
				<Input
					onChangeHandler={(event): void =>
						onChangeHandler(setLegendFormat, event.target.value)
					}
					size="middle"
					value={legendFormat}
					addonBefore={'Legent Format'}
				/>
			</InputContainer>
			<Divider />
		</Container>
	);
};

export default Query;
