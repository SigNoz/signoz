import { useMachine } from '@xstate/react';
import { Select, Spin } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { convertTraceKeyToMetric } from 'lib/resourceAttributesQueryToPromQL';
import { map } from 'lodash-es';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SetResourceAttributeQueries } from 'store/actions/metrics/setResourceAttributeQueries';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { v4 as uuid } from 'uuid';

import QueryChip from './QueryChip';
import { ResourceAttributesFilterMachine } from './ResourceAttributesFilter.Machine';
import { QueryChipItem, SearchContainer } from './styles';
import { IOption, IResourceAttributeQuery } from './types';
import { createQuery, GetTagKeys, GetTagValues, OperatorSchema } from './utils';

function ResourceAttributesFilter(): JSX.Element {
	const [disabled, setDisabled] = useState(
		!(history.location.pathname === ROUTES.APPLICATION),
	);

	useEffect(() => {
		const unListen = history.listen(({ pathname }) => {
			setDisabled(!(pathname === ROUTES.APPLICATION));
		});
		return (): void => {
			unListen();
		};
	}, []);

	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const dispatch = useDispatch();
	const resourceAttributesQueries = useSelector(
		(state) => state.metrics.resourceAttributeQueries,
	);
	const [loading, setLoading] = useState(true);
	const [selectedValues, setSelectedValues] = useState<string[]>([]);
	const [staging, setStaging] = useState<string[]>([]);
	const [queries, setQueries] = useState<IResourceAttributeQuery[]>([]);
	const [optionsData, setOptionsData] = useState<{
		mode: undefined | 'tags' | 'multiple';
		options: IOption[];
	}>({
		mode: undefined,
		options: [],
	});

	const [state, send] = useMachine(ResourceAttributesFilterMachine, {
		actions: {
			onSelectTagKey: () => {
				setLoading(true);
				GetTagKeys()
					.then((tagKeys) => setOptionsData({ options: tagKeys, mode: undefined }))
					.finally(() => {
						setLoading(false);
					});
			},
			onSelectOperator: () => {
				setOptionsData({ options: OperatorSchema, mode: undefined });
			},
			onSelectTagValue: () => {
				setLoading(true);
				if (staging[0])
					GetTagValues(convertTraceKeyToMetric(staging[0]))
						.then((tagValuesOptions) =>
							setOptionsData({ options: tagValuesOptions, mode: 'multiple' }),
						)
						.finally(() => {
							setLoading(false);
						});
			},
			onBlurPurge: () => {
				setSelectedValues([]);
				setStaging([]);
			},
			onValidateQuery: (): void => {
				if (staging.length < 2 || selectedValues.length === 0) {
					return;
				}

				const generatedQuery = createQuery([...staging, selectedValues]);
				if (generatedQuery) {
					dispatch(SetResourceAttributeQueries([...queries, generatedQuery]));
				}
			},
		},
	});

	useEffect(() => {
		setQueries(resourceAttributesQueries);
	}, [resourceAttributesQueries]);

	const handleFocus = (): void => {
		if (state.value === 'Idle') {
			send('NEXT');
		}
	};

	const handleBlur = () => {
		send('onBlur');
	};
	const handleChange = (value: never): void => {
		if (!optionsData.mode) {
			setStaging((prevStaging) => [...prevStaging, value]);
			setSelectedValues([]);
			send('NEXT');
			return;
		}

		setSelectedValues([...value]);
	};

	const handleClose = (id: string): void => {
		dispatch(
			SetResourceAttributeQueries(
				queries.filter((queryData) => queryData.id !== id),
			),
		);
	};
	return (
		<SearchContainer isDarkMode={isDarkMode} disabled={disabled}>
			<div
				style={{
					maxWidth: '70%',
					display: 'flex',
					overflowX: 'auto',
				}}
			>
				{map(
					queries,
					(query): JSX.Element => {
						return (
							<QueryChip
								disabled={disabled}
								key={query.id}
								queryData={query}
								onClose={handleClose}
							/>
						);
					},
				)}
				{map(staging, (item) => {
					return <QueryChipItem key={uuid()}>{item}</QueryChipItem>;
				})}
			</div>
			<Select
				disabled={disabled}
				onChange={handleChange}
				bordered={false}
				value={selectedValues}
				style={{ flex: 1 }}
				options={optionsData.options}
				mode={optionsData?.mode}
				showArrow={false}
				onFocus={handleFocus}
				onBlur={handleBlur}
				notFoundContent={
					loading ? (
						<span>
							<Spin size="small" /> Loading...{' '}
						</span>
					) : null
				}
			/>
		</SearchContainer>
	);
}

export default ResourceAttributesFilter;
