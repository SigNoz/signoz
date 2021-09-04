import { Divider } from 'antd';
import getQuery from 'api/widgets/getQuery';
import Input from 'components/Input';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Container, InputContainer } from './styles';

const Query = ({ selectedTime }: QueryProps): JSX.Element => {
	const [promqlQuery, setPromqlQuery] = useState('');
	const [legendFormat, setLegendFormat] = useState('');

	const onChangeHandler = useCallback(
		(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const onBlurHandler = useCallback(() => {
		const { end, start } = getStartAndEndTime({
			type: selectedTime.enum,
		});
		// this is the place we need to fire the query
	}, []);

	const counter = useRef(0);

	useEffect(() => {
		if (counter.current === 0) {
			counter.current = 1;
			onBlurHandler();
		}
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

interface QueryProps {
	selectedTime: timePreferance;
}

export default Query;
