import { Divider } from 'antd';
import getQuery from 'api/widgets/getQuery';
import Input from 'components/Input';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import getStartAndEndTime from 'lib/getStartAndEndTime';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { useLocation } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	QueryError,
	QueryErrorProps,
	QuerySuccess,
	QuerySuccessProps,
} from 'store/actions';
import AppActions from 'types/actions';

import { Container, InputContainer } from './styles';

const Query = ({
	selectedTime,
	currentIndex,
	queryError,
	querySuccess,
}: QueryProps): JSX.Element => {
	const [promqlQuery, setPromqlQuery] = useState('');
	const [legendFormat, setLegendFormat] = useState('');
	const { search } = useLocation();

	const query = new URLSearchParams(search);
	const widgetId = query.get('widgetId');

	const onChangeHandler = useCallback(
		(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const onBlurHandler = useCallback(async () => {
		if (promqlQuery.length !== 0) {
			try {
				const { end, start } = getStartAndEndTime({
					type: selectedTime.enum,
				});

				// this is the place we need to fire the query
				const response = await getQuery({
					start: start.slice(2),
					end,
					query: promqlQuery,
					step: '30',
				});

				if (response.statusCode === 200) {
					querySuccess({ data: response.payload.result });
				} else {
					if (response.error !== null) {
						queryError({
							errorMessage: response.error,
							widgetId: widgetId || '',
						});
					}
				}
			} catch (error) {
				// set Error
			}
		}
	}, [promqlQuery]);

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

interface DispatchProps {
	querySuccess: ({
		data,
	}: QuerySuccessProps) => (dispatch: Dispatch<AppActions>) => void;
	queryError: ({
		errorMessage,
	}: QueryErrorProps) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	querySuccess: bindActionCreators(QuerySuccess, dispatch),
	queryError: bindActionCreators(QueryError, dispatch),
});

interface QueryProps extends DispatchProps {
	selectedTime: timePreferance;
	currentIndex: number;
}

export default connect(null, mapDispatchToProps)(Query);
