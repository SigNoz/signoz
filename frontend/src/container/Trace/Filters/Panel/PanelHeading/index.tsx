import React, { useState } from 'react';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { Card, Typography, Divider, notification } from 'antd';

import {
	ButtonComponent,
	ButtonContainer,
	Container,
	IconContainer,
	TextCotainer,
} from './styles';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
const { Text } = Typography;

import { AllPanelHeading } from 'types/reducer/trace';
import getFilters from 'api/trace/getFilters';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getFilter, updateURL } from 'store/actions/trace/util';
import AppActions from 'types/actions';
import { Dispatch } from 'redux';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';
import { AxiosError } from 'axios';

const PanelHeading = (props: PanelHeadingProps): JSX.Element => {
	const {
		filterLoading,
		filterToFetchData,
		selectedFilter,
		spansAggregate,
		selectedTags,
		filter,
		isFilterExclude,
		userSelectedFilter,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const isDefaultOpen =
		filterToFetchData.find((e) => e === props.name) !== undefined;

	const [isLoading, setIsLoading] = useState<boolean>(false);

	const global = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const onExpandHandler: React.MouseEventHandler<HTMLDivElement> = async (e) => {
		try {
			e.preventDefault();
			e.stopPropagation();

			setIsLoading(true);
			let updatedFilterData: TraceReducer['filterToFetchData'] = [];
			const getprepdatedSelectedFilter = new Map(selectedFilter);
			const getPreUserSelected = new Map(userSelectedFilter);

			if (!isDefaultOpen) {
				updatedFilterData = [props.name];
			} else {
				// removing the selected filter
				updatedFilterData = [
					...filterToFetchData.filter((name) => name !== props.name),
				];
				getprepdatedSelectedFilter.delete(props.name);
				getPreUserSelected.delete(props.name);
			}

			const response = await getFilters({
				end: String(global.maxTime),
				start: String(global.minTime),
				getFilters: updatedFilterData,
				other: Object.fromEntries(getprepdatedSelectedFilter),
				isFilterExclude,
			});

			if (response.statusCode === 200) {
				const updatedFilter = getFilter(response.payload);

				// is closed
				if (!isDefaultOpen) {
					// getprepdatedSelectedFilter.set(
					// 	props.name,
					// 	Object.keys(updatedFilter.get(props.name) || {}),
					// );

					getPreUserSelected.set(
						props.name,
						Object.keys(updatedFilter.get(props.name) || {}),
					);

					updatedFilterData = [...filterToFetchData, props.name];
				}

				// now append the non prop.name trace filter enum over the list
				// selectedFilter.forEach((value, key) => {
				// 	if (key !== props.name) {
				// 		getprepdatedSelectedFilter.set(key, value);
				// 	}
				// });

				getPreUserSelected.forEach((value, key) => {
					if (key !== props.name) {
						getPreUserSelected.set(key, value);
					}
				});
				filter.forEach((value, key) => {
					if (key !== props.name) {
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
					},
				});

				updateURL(
					getprepdatedSelectedFilter,
					updatedFilterData,
					spansAggregate.currentPage,
					selectedTags,
					updatedFilter,
					isFilterExclude,
					getPreUserSelected,
				);
			} else {
				notification.error({
					message: response.error || 'Something went wrong',
				});
			}

			setIsLoading(false);
		} catch (error) {
			notification.error({
				message: (error as AxiosError).toString() || 'Something went wrong',
			});
		}
	};

	const onClearAllHandler = async () => {
		try {
			setIsLoading(true);
			const updatedFilter = new Map(selectedFilter);
			const preUserSelected = new Map(userSelectedFilter);

			updatedFilter.delete(props.name);
			preUserSelected.delete(props.name);

			const postIsFilterExclude = new Map(isFilterExclude);

			postIsFilterExclude.set(props.name, false);

			const response = await getFilters({
				end: String(global.maxTime),
				start: String(global.minTime),
				getFilters: filterToFetchData,
				other: Object.fromEntries(preUserSelected),
				isFilterExclude: postIsFilterExclude,
			});

			if (response.statusCode === 200 && response.payload) {
				const getUpatedFilter = getFilter(response.payload);

				dispatch({
					type: UPDATE_ALL_FILTERS,
					payload: {
						current: spansAggregate.currentPage,
						filter: getUpatedFilter,
						filterToFetchData,
						selectedFilter: updatedFilter,
						selectedTags,
						userSelected: preUserSelected,
						isFilterExclude: postIsFilterExclude,
					},
				});

				updateURL(
					updatedFilter,
					filterToFetchData,
					spansAggregate.currentPage,
					selectedTags,
					getUpatedFilter,
					postIsFilterExclude,
					preUserSelected,
				);
			} else {
				notification.error({
					message: response.error || 'Something went wrong',
				});
			}
			setIsLoading(false);
		} catch (error) {
			notification.error({
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
			{props.name !== 'duration' && <Divider plain style={{ margin: 0 }} />}

			<Card bordered={false}>
				<Container
					disabled={filterLoading || isLoading}
					aria-disabled={filterLoading || isLoading}
					aria-expanded={props.isOpen}
				>
					<TextCotainer onClick={onExpandHandler}>
						<IconContainer>
							{!props.isOpen ? <RightOutlined /> : <DownOutlined />}
						</IconContainer>

						<Text style={{ textTransform: 'capitalize' }} ellipsis>
							{AllPanelHeading.find((e) => e.key === props.name)?.displayValue || ''}
						</Text>
					</TextCotainer>

					{props.name !== 'duration' && (
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
};

interface PanelHeadingProps {
	name: TraceFilterEnum;
	isOpen: boolean;
}

export default PanelHeading;
