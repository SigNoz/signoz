import { Divider } from 'antd';
import { AxiosError } from 'axios';
import Input from 'components/Input';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import React, { useCallback, useState } from 'react';
import { connect } from 'react-redux';
import { useLocation } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { QueryError, QueryErrorProps } from 'store/actions';
import {
	GetQueryResult,
	GetQueryResultProps,
} from 'store/actions/dashboard/getQueryResult';
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

	const query = new URLSearchParams(search);
	const widgetId = query.get('widgetId') || '';

	const onChangeHandler = useCallback(
		(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const onBlurHandler = useCallback(async () => {
		if (promqlQuery.length !== 0) {
			try {
				getQueryResult({
					currentIndex,
					legend: legendFormat,
					query: promqlQuery,
					selectedTime: selectedTime.enum,
					widgetId,
				});
				// // this is the place we need to fire the query
				// const response = await getQuery({
				// 	start,
				// 	end,
				// 	query: promqlQuery,
				// 	step: '30',
				// });
				// if (response.statusCode === 200) {
				// 	querySuccess({
				// 		queryData: response.payload.result,
				// 		legend: legendFormat,
				// 		query: promqlQuery,
				// 		queryIndex: currentIndex,
				// 		widgetId: widgetId,
				// 	});
				// } else {
				// 	if (response.error !== null) {
				// 		queryError({
				// 			errorMessage: response.error,
				// 			widgetId: widgetId,
				// 		});
				// 	}
				// }
			} catch (error) {
				queryError({
					errorMessage: (error as AxiosError).toString(),
					widgetId: widgetId,
				});
			}
		}
	}, [promqlQuery]);

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
