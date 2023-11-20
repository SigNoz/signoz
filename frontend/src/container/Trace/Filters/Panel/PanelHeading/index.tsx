import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { Card, Divider, Typography } from 'antd';
import getFilters from 'api/trace/getFilters';
import { AxiosError } from 'axios';
import { useNotifications } from 'hooks/useNotifications';
import { MouseEventHandler, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { getFilter, updateURL } from 'store/actions/trace/util';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import {
	AllPanelHeading,
	TraceFilterEnum,
	TraceReducer,
} from 'types/reducer/trace';

import {
	ButtonComponent,
	ButtonContainer,
	Container,
	IconContainer,
	TextContainer,
} from './styles';

const { Text } = Typography;

function PanelHeading(props: PanelHeadingProps): JSX.Element {
	const {
		filterLoading,
		filterToFetchData,
		selectedFilter,
		spansAggregate,
		selectedTags,
		filter,
		isFilterExclude,
		userSelectedFilter,
		spanKind,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const { name: PanelName, isOpen: IsPanelOpen } = props;

	const isDefaultOpen =
		filterToFetchData.find((e) => e === PanelName) !== undefined;

	const [isLoading, setIsLoading] = useState<boolean>(false);

	const global = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const defaultErrorMessage = 'Something went wrong';

	const { notifications } = useNotifications();

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const onExpandHandler: MouseEventHandler<HTMLDivElement> = async (e) => {
		try {
			e.preventDefault();
			e.stopPropagation();

			setIsLoading(true);
			let updatedFilterData: TraceReducer['filterToFetchData'] = [];
			const getprepdatedSelectedFilter = new Map(selectedFilter);
			const getPreUserSelected = new Map(userSelectedFilter);

			updatedFilterData = [PanelName];

			const response = await getFilters({
				end: String(global.maxTime),
				start: String(global.minTime),
				getFilters: updatedFilterData,
				other: Object.fromEntries(getprepdatedSelectedFilter),
				isFilterExclude,
				spanKind,
			});

			if (response.statusCode === 200) {
				const updatedFilter = getFilter(response.payload);

				if (!getPreUserSelected.has(PanelName)) {
					getPreUserSelected.set(
						PanelName,
						Object.keys(updatedFilter.get(PanelName) || []),
					);
				}

				updatedFilterData = [...filterToFetchData, PanelName];
				filter.forEach((value, key) => {
					if (key !== PanelName) {
						updatedFilter.set(key, value);
					}
				});

				dispatch({
					type: UPDATE_ALL_FILTERS,
					payload: {
						current: spansAggregate.currentPage,
						filter: updatedFilter,
						filterToFetchData: updatedFilterData,
						selectedFilter: getprepdatedSelectedFilter,
						selectedTags,
						userSelected: getPreUserSelected,
						isFilterExclude,
						order: spansAggregate.order,
						pageSize: spansAggregate.pageSize,
						orderParam: spansAggregate.orderParam,
						spanKind,
					},
				});

				updateURL(
					getprepdatedSelectedFilter,
					updatedFilterData,
					spansAggregate.currentPage,
					selectedTags,
					isFilterExclude,
					getPreUserSelected,
					spansAggregate.order,
					spansAggregate.pageSize,
					spansAggregate.orderParam,
				);
			} else {
				notifications.error({
					message: response.error || defaultErrorMessage,
				});
			}

			setIsLoading(false);
		} catch (error) {
			notifications.error({
				message: (error as AxiosError).toString() || defaultErrorMessage,
			});
		}
	};

	/**
	 * @description this function removes the selected filter
	 */
	const onCloseHandler = (): void => {
		const preSelectedFilter = new Map(selectedFilter);
		// removing the filter from filter to fetch the data
		const preFilterToFetchTheData = [
			...filterToFetchData.filter((name) => name !== PanelName),
		];

		// preSelectedFilter.delete(PanelName);

		dispatch({
			type: UPDATE_ALL_FILTERS,
			payload: {
				current: spansAggregate.currentPage,
				filter,
				filterToFetchData: preFilterToFetchTheData,
				selectedFilter: preSelectedFilter,
				selectedTags,
				userSelected: userSelectedFilter,
				isFilterExclude,
				order: spansAggregate.order,
				pageSize: spansAggregate.pageSize,
				orderParam: spansAggregate.orderParam,
				spanKind,
			},
		});

		updateURL(
			preSelectedFilter,
			preFilterToFetchTheData,
			spansAggregate.currentPage,
			selectedTags,
			isFilterExclude,
			userSelectedFilter,
			spansAggregate.order,
			spansAggregate.pageSize,
			spansAggregate.orderParam,
		);
	};

	const onClearAllHandler = async (): Promise<void> => {
		try {
			setIsLoading(true);
			const updatedFilter = new Map(selectedFilter);
			const preUserSelected = new Map(userSelectedFilter);

			updatedFilter.delete(PanelName);
			preUserSelected.delete(PanelName);

			const postIsFilterExclude = new Map(isFilterExclude);

			postIsFilterExclude.set(PanelName, false);

			const response = await getFilters({
				end: String(global.maxTime),
				start: String(global.minTime),
				getFilters: filterToFetchData,
				other: Object.fromEntries(updatedFilter),
				isFilterExclude: postIsFilterExclude,
				spanKind,
			});

			if (response.statusCode === 200 && response.payload) {
				const getUpdatedFilter = getFilter(response.payload);

				dispatch({
					type: UPDATE_ALL_FILTERS,
					payload: {
						current: spansAggregate.currentPage,
						filter: getUpdatedFilter,
						filterToFetchData,
						selectedFilter: updatedFilter,
						selectedTags,
						userSelected: preUserSelected,
						isFilterExclude: postIsFilterExclude,
						order: spansAggregate.order,
						pageSize: spansAggregate.pageSize,
						orderParam: spansAggregate.orderParam,
						spanKind,
					},
				});

				updateURL(
					updatedFilter,
					filterToFetchData,
					spansAggregate.currentPage,
					selectedTags,
					postIsFilterExclude,
					preUserSelected,
					spansAggregate.order,
					spansAggregate.pageSize,
					spansAggregate.orderParam,
				);
			} else {
				notifications.error({
					message: response.error || 'Something went wrong',
				});
			}
			setIsLoading(false);
		} catch (error) {
			notifications.error({
				message: (error as AxiosError).toString(),
			});
			setIsLoading(false);
		}
	};

	// const onSelectAllHandler = async () => {
	// 	try {
	// 		setIsLoading(true);
	// 		const preFilter = new Map(filter);
	// 		const preSelectedFilter = new Map(selectedFilter);

	// 		preSelectedFilter.set(
	// 			props.name,
	// 			Object.keys(preFilter.get(props.name) || {}),
	// 		);

	// 		const response = await getFilters({
	// 			end: String(global.maxTime),
	// 			start: String(global.minTime),
	// 			getFilters: filterToFetchData,
	// 			other: Object.fromEntries(preSelectedFilter),
	// 		});

	// 		if (response.statusCode === 200 && response.payload) {
	// 			const getUpatedFilter = getFilter(response.payload);

	// 			preSelectedFilter.set(
	// 				props.name,
	// 				Object.keys(getUpatedFilter.get(props.name) || {}),
	// 			);

	// 			dispatch({
	// 				type: UPDATE_ALL_FILTERS,
	// 				payload: {
	// 					current: spansAggregate.currentPage,
	// 					filter: preFilter,
	// 					filterToFetchData,
	// 					selectedFilter: preSelectedFilter,
	// 					selectedTags,
	// 				},
	// 			});

	// 			updateURL(
	// 				preSelectedFilter,
	// 				filterToFetchData,
	// 				spansAggregate.currentPage,
	// 				selectedTags,
	// 				preFilter,
	// 			);
	// 		}
	// 		setIsLoading(false);
	// 	} catch (error) {
	// 		setIsLoading(false);

	// 		notification.error({
	// 			message: (error as AxiosError).toString(),
	// 		});
	// 	}
	// };

	return (
		<>
			{PanelName !== 'duration' && <Divider plain style={{ margin: 0 }} />}

			<Card bordered={false}>
				<Container
					disabled={filterLoading || isLoading}
					aria-disabled={filterLoading || isLoading}
					aria-expanded={IsPanelOpen}
				>
					<TextContainer onClick={isDefaultOpen ? onCloseHandler : onExpandHandler}>
						<IconContainer>
							{!IsPanelOpen ? <RightOutlined /> : <DownOutlined />}
						</IconContainer>

						<Text style={{ textTransform: 'capitalize' }} ellipsis>
							{AllPanelHeading.find((e) => e.key === PanelName)?.displayValue || ''}
						</Text>
					</TextContainer>

					{PanelName !== 'duration' && (
						<ButtonContainer>
							{/* <ButtonComponent
								aria-disabled={isLoading || filterLoading}
								disabled={isLoading || filterLoading}
								onClick={onSelectAllHandler}
								type="link"
							>
								Select All
							</ButtonComponent> */}

							<ButtonComponent
								aria-disabled={isLoading || filterLoading}
								disabled={isLoading || filterLoading}
								onClick={onClearAllHandler}
								type="link"
							>
								Clear All
							</ButtonComponent>
						</ButtonContainer>
					)}
				</Container>
			</Card>
		</>
	);
}

interface PanelHeadingProps {
	name: TraceFilterEnum;
	isOpen: boolean;
}

export default PanelHeading;
