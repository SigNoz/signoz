import { Divider } from 'antd';
import { AxiosError } from 'axios';
import Input from 'components/Input';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import React, { useCallback, useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTime, QueryError, QueryErrorProps } from 'store/actions';
import {
	GetQueryResult,
	GetQueryResultProps,
} from 'store/actions/dashboard/getQueryResult';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';

import { Container, InputContainer } from './styles';

const Query = ({
	selectedTime,
	currentIndex,
	queryError,
	preLegend,
	preQuery,
	getQueryResult,
}: QueryProps): JSX.Element => {
	const [promqlQuery, setPromqlQuery] = useState(preQuery);
	const [legendFormat, setLegendFormat] = useState(preLegend);
	const { search } = useLocation();
	const { minTime, maxTime } = useSelector<AppState, GlobalTime>(
		(state) => state.globalTime,
	);

	console.log({ minTime, maxTime });

	const query = new URLSearchParams(search);
	const widgetId = query.get('widgetId') || '';

	const onChangeHandler = useCallback(
		(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const onBlurHandler = useCallback(
		async ({ minTime, maxTime }) => {
			if (promqlQuery.length !== 0) {
				try {
					getQueryResult({
						currentIndex,
						legend: legendFormat,
						query: promqlQuery,
						selectedTime: selectedTime.enum,
						widgetId,
						maxTime,
						minTime,
					});
				} catch (error) {
					queryError({
						errorMessage: (error as AxiosError).toString(),
						widgetId: widgetId,
					});
				}
			}
		},
		[
			promqlQuery,
			currentIndex,
			getQueryResult,
			legendFormat,
			queryError,
			widgetId,
			selectedTime,
		],
	);

	useEffect(() => {
		if (preQuery.length !== 0) {
			onBlurHandler({ minTime, maxTime });
		}
	}, [onBlurHandler, preQuery, minTime, maxTime]);

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
					addonBefore={'Legend Format'}
				/>
			</InputContainer>
			<Divider />
		</Container>
	);
};

interface DispatchProps {
	queryError: ({
		errorMessage,
	}: QueryErrorProps) => (dispatch: Dispatch<AppActions>) => void;
	getQueryResult: (
		props: GetQueryResultProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	queryError: bindActionCreators(QueryError, dispatch),
	getQueryResult: bindActionCreators(GetQueryResult, dispatch),
});

interface QueryProps extends DispatchProps {
	selectedTime: timePreferance;
	currentIndex: number;
	preQuery: string;
	preLegend: string;
}

export default connect(null, mapDispatchToProps)(Query);
