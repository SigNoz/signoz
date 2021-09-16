import { Divider } from 'antd';
import Input from 'components/Input';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import React, { useCallback, useState } from 'react';
import { connect } from 'react-redux';
import { useLocation } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	UpdateQuery,
	UpdateQueryProps,
} from 'store/actions/dashboard/updateQuery';
import AppActions from 'types/actions';

import { Container, InputContainer } from './styles';

const Query = ({
	currentIndex,
	preLegend,
	preQuery,
	updateQuery,
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

	const onBlurHandler = (): void => {
		updateQuery({
			currentIndex,
			legend: legendFormat,
			query: promqlQuery,
			widgetId,
		});
	};

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
					addonBefore={'Legend Format'}
					onBlur={(): void => onBlurHandler()}
				/>
			</InputContainer>
			<Divider />
		</Container>
	);
};

interface DispatchProps {
	updateQuery: (
		props: UpdateQueryProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateQuery: bindActionCreators(UpdateQuery, dispatch),
});

interface QueryProps extends DispatchProps {
	selectedTime: timePreferance;
	currentIndex: number;
	preQuery: string;
	preLegend: string;
}

export default connect(null, mapDispatchToProps)(Query);
