import { Divider } from 'antd';
import { AxiosError } from 'axios';
import Input from 'components/Input';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

	// @TODO need to shift this logic to the list not to the individual query as this request is checking the query in the currect widget
	const counter = useRef(0);

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
			} catch (error) {
				queryError({
					errorMessage: (error as AxiosError).toString(),
					widgetId: widgetId,
				});
			}
		}
	}, [promqlQuery]);

	useEffect(() => {
		if (counter.current == 0 && preQuery.length !== 0) {
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
