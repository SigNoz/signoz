import { Divider } from 'antd';
import getQuery from 'api/widgets/getQuery';
import Input from 'components/Input';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Container, InputContainer } from './styles';

const Query = ({ selectedTime, currentIndex }: QueryProps): JSX.Element => {
	const [promqlQuery, setPromqlQuery] = useState('system_memory_usage_total');
	const [legendFormat, setLegendFormat] = useState('');

	const onChangeHandler = useCallback(
		(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const onBlurHandler = useCallback(async () => {
		try {
			const { end, start } = getStartAndEndTime({
				type: selectedTime.enum,
			});

			// this is the place we need to fire the query
			const response = await getQuery({
				start,
				end,
				query: promqlQuery,
				step: '30',
			});

			console.log(response.payload?.result);
		} catch (error) {
			// set Error
		}
	}, []);

	const counter = useRef(0);

	useEffect(() => {
		if (counter.current === 0 && promqlQuery.length !== 0) {
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
	currentIndex: number;
}

export default Query;
