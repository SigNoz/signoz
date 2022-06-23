import { Divider } from 'antd';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import React, { useCallback, useMemo } from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { DeleteQuery } from 'store/actions';
import {
	UpdateQuery,
	UpdateQueryProps,
} from 'store/actions/dashboard/updateQuery';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { DeleteQueryProps } from 'types/actions/dashboard';
import { Widgets } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';

import QueryBuilder from './QueryBuilder';
import { Container } from './styles';

function Query({
	currentIndex,
	queryInput,
	updateQuery,
	deleteQuery,
	name,
	queryCategory,
	updatedLocalQuery,
}: QueryProps): JSX.Element | null {
	const { search } = useLocation();
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboards] = dashboards;
	const { widgets } = selectedDashboards.data;

	const query = new URLSearchParams(search);
	const widgetId = query.get('widgetId') || '';

	const urlQuery = useMemo(() => {
		return new URLSearchParams(search);
	}, [search]);

	const getWidget = (): Widgets | undefined => {
		const widgetId = urlQuery.get('widgetId');
		return widgets?.find((e) => e.id === widgetId);
	};

	const selectedWidget = getWidget() as Widgets;

	// const onChangeHandler = useCallback(
	// 	(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
	// 		setFunc(value);
	// 	},
	// 	[],
	// );

	// const onBlurHandler = (): void => {
	// 	updateQuery({
	// 		currentIndex,
	// 		updatedQuery,
	// 		widgetId,
	// 		yAxisUnit: selectedWidget.yAxisUnit,
	// 	});
	// };

	const onDeleteQueryHandler = (): void => {
		deleteQuery({
			widgetId,
			currentIndex,
		});
	};
	const updateQueryData = (updatedQuery): void => {
		updatedLocalQuery({ currentIndex, updatedQuery });
	};
	// const stageUpdatedQuery = () => {
	// 	updateQuery({
	// 		currentIndex,
	// 		updatedQuery: queryInput,
	// 		widgetId,
	// 		yAxisUnit: selectedWidget.yAxisUnit,
	// 	});
	// };

	if (!queryInput) return null;
	return (
		<>
			<Container>
				{/* <QueryWrapper>
					<InputContainer>
						<Input
							onChangeHandler={(event): void =>
								onChangeHandler(setPromqlQuery, event.target.value)
							}
							size="middle"
							value={promqlQuery}
							addonBefore="PromQL Query"
							onBlur={(): void => onBlurHandler()}
						/>
					</InputContainer>

					<InputContainer>
						<Input
							onChangeHandler={(event): void =>
								onChangeHandler(setLegendFormat, event.target.value)
							}
							size="middle"
							value={legendFormat}
							addonBefore="Legend Format"
							onBlur={(): void => onBlurHandler()}
						/>
					</InputContainer>
				</QueryWrapper>

				<ButtonContainer>
					<Button onClick={onDeleteQueryHandler}>Delete</Button>
					<TextToolTip
						{...{
							text: `More details on how to plot metrics graphs`,
							url: 'https://signoz.io/docs/userguide/send-metrics/#related-videos',
						}}
					/>
				</ButtonContainer> */}
				<QueryBuilder
					name={name}
					updateQueryData={updateQueryData}
					onDelete={onDeleteQueryHandler}
					queryData={queryInput}
					queryCategory={queryCategory}
				/>
			</Container>

			<Divider />
		</>
	);
}

interface DispatchProps {
	updateQuery: (
		props: UpdateQueryProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	deleteQuery: (
		props: DeleteQueryProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateQuery: bindActionCreators(UpdateQuery, dispatch),
	deleteQuery: bindActionCreators(DeleteQuery, dispatch),
});

interface QueryProps extends DispatchProps {
	selectedTime: timePreferance;
	currentIndex: number;
	preQuery: string;
	preLegend: string;
	name: string;
}

export default connect(null, mapDispatchToProps)(Query);
