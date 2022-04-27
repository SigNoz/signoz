import { useMachine } from '@xstate/react';
import { Select, Spin } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { convertMetricKeyToTrace } from 'lib/resourceAttributes';
import { map } from 'lodash-es';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ResetInitialData } from 'store/actions/metrics/resetInitialData';
import { SetResourceAttributeQueries } from 'store/actions/metrics/setResourceAttributeQueries';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import MetricReducer from 'types/reducer/metrics';
import { v4 as uuid } from 'uuid';

import QueryChip from './QueryChip';
import { ResourceAttributesFilterMachine } from './ResourceAttributesFilter.Machine';
import { QueryChipItem, SearchContainer } from './styles';
import { IOption, IResourceAttributeQuery } from './types';
import { createQuery, GetTagKeys, GetTagValues, OperatorSchema } from './utils';

function ResourceAttributesFilter(): JSX.Element {
	const dispatch = useDispatch();
	const [disabled, setDisabled] = useState(
		!(history.location.pathname === ROUTES.APPLICATION),
	);

	useEffect(() => {
		const unListen = history.listen(({ pathname }) => {
			setDisabled(!(pathname === ROUTES.APPLICATION));
		});
		return (): void => {
			if (!history.location.pathname.startsWith(`${ROUTES.APPLICATION}/`)) {
				dispatch(ResetInitialData());
			}
			unListen();
		};
	}, [dispatch]);

	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const { resourceAttributeQueries } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
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

	const dispatchQueries = (updatedQueries: IResourceAttributeQuery[]): void => {
		dispatch(SetResourceAttributeQueries(updatedQueries));
	};

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
					GetTagValues(staging[0])
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
					dispatchQueries([...queries, generatedQuery]);
				}
			},
		},
	});

	useEffect(() => {
		setQueries(resourceAttributeQueries);
	}, [resourceAttributeQueries]);

	const handleFocus = (): void => {
		if (state.value === 'Idle') {
			send('NEXT');
		}
	};

	const handleBlur = (): void => {
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
		dispatchQueries(queries.filter((queryData) => queryData.id !== id));
	};
	const placeholder =
		queries.length || staging.length || selectedValues.length
			? ''
			: 'Search and Filter based on resource attributes.';
	return (
		<SearchContainer isDarkMode={isDarkMode} disabled={disabled}>
			<div
				style={{
					maxWidth: disabled ? '100%' : '70%',
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
				{map(staging, (item, idx) => {
					return (
						<QueryChipItem key={uuid()}>
							{idx === 0 ? convertMetricKeyToTrace(item) : item}
						</QueryChipItem>
					);
				})}
			</div>
			{!disabled && (
				<Select
					placeholder={placeholder}
					disabled={disabled}
					onChange={handleChange}
					bordered={false}
					value={selectedValues as never}
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
			)}
		</SearchContainer>
	);
}

export default ResourceAttributesFilter;
