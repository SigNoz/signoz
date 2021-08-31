import Input from 'components/Input';
import React, { useCallback, useState } from 'react';

import { Container, InputContainer } from './styles';

const QuerySection = (): JSX.Element => {
	const [promqlQuery, setPromqlQuery] = useState('');
	const [legendFormat, setLegendFormat] = useState('');

	const onChangeHandler = useCallback(
		(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

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
		</Container>
	);
};

export default QuerySection;
