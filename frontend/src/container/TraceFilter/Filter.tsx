import { Tag } from 'antd';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import React from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { TagItem } from 'store/actions';
import {
	UpdateSelectedLatency,
	UpdateSelectedOperation,
	UpdateSelectedService,
	UpdateSelectedTags,
} from 'store/actions/trace';
import {
	UpdateSelectedData,
	UpdateSelectedDataProps,
} from 'store/actions/trace/updateSelectedData';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

import { Card } from './styles';

const Filter = ({
	updatedQueryParams,
	updateSelectedData,
	updateSelectedTags,
}: FilterProps): JSX.Element => {
	const {
		selectedService,
		selectedOperation,
		selectedLatency,
		selectedTags,
		selectedKind,
		selectedEntity,
		selectedAggOption,
	} = useSelector<AppState, TraceReducer>((state) => state.trace);

	function handleCloseTag(value: string): void {
		if (value === 'service') {
			updatedQueryParams([''], [METRICS_PAGE_QUERY_PARAM.service]);
			updateSelectedData({
				selectedAggOption,
				selectedEntity,
				selectedKind,
				selectedLatency,
				selectedOperation,
				selectedService: '',
			});
		}
		if (value === 'operation') {
			updatedQueryParams([''], [METRICS_PAGE_QUERY_PARAM.operation]);
			updateSelectedData({
				selectedAggOption,
				selectedEntity,
				selectedKind,
				selectedLatency,
				selectedOperation: '',
				selectedService,
			});
		}
		if (value === 'maxLatency') {
			updatedQueryParams([''], [METRICS_PAGE_QUERY_PARAM.latencyMax]);
			updateSelectedData({
				selectedAggOption,
				selectedEntity,
				selectedKind,
				selectedLatency: {
					min: selectedLatency.min,
					max: '',
				},
				selectedOperation,
				selectedService,
			});
		}
		if (value === 'minLatency') {
			updatedQueryParams([''], [METRICS_PAGE_QUERY_PARAM.latencyMin]);
			updateSelectedData({
				selectedAggOption,
				selectedEntity,
				selectedKind,
				selectedLatency: {
					min: '',
					max: selectedLatency.max,
				},
				selectedOperation,
				selectedService,
			});
		}
	}

	function handleCloseTagElement(item: TagItem): void {
		const updatedSelectedtags = selectedTags.filter((e) => e.key !== item.key);

		updatedQueryParams(
			[updatedSelectedtags],
			[METRICS_PAGE_QUERY_PARAM.selectedTags],
		);
		updateSelectedTags(updatedSelectedtags);
	}

	return (
		<Card>
			{selectedService.length !== 0 && (
				<Tag
					closable
					onClose={(e): void => {
						e.preventDefault();
						handleCloseTag('service');
					}}
				>
					service:{selectedService}
				</Tag>
			)}

			{selectedOperation.length !== 0 && (
				<Tag
					closable
					onClose={(e): void => {
						e.preventDefault();
						handleCloseTag('operation');
					}}
				>
					operation:{selectedOperation}
				</Tag>
			)}

			{selectedLatency?.min.length !== 0 && (
				<Tag
					closable
					onClose={(e): void => {
						e.preventDefault();
						handleCloseTag('minLatency');
					}}
				>
					minLatency:
					{(parseInt(selectedLatency?.min || '0') / 1000000).toString()}ms
				</Tag>
			)}
			{selectedLatency?.max.length !== 0 && (
				<Tag
					closable
					onClose={(e): void => {
						e.preventDefault();
						handleCloseTag('maxLatency');
					}}
				>
					maxLatency:
					{(parseInt(selectedLatency?.max || '0') / 1000000).toString()}ms
				</Tag>
			)}

			{selectedTags.map((item) => (
				<Tag
					closable
					key={`${item.key}-${item.operator}-${item.value}`}
					onClose={(e): void => {
						e.preventDefault();
						handleCloseTagElement(item);
					}}
				>
					{item.key} {item.operator} {item.value}
				</Tag>
			))}
		</Card>
	);
};

interface DispatchProps {
	updateSelectedTags: (
		selectedTags: TraceReducer['selectedTags'],
	) => (dispatch: Dispatch<AppActions>) => void;
	updateSelectedData: (props: UpdateSelectedDataProps) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateSelectedTags: bindActionCreators(UpdateSelectedTags, dispatch),
	updateSelectedData: bindActionCreators(UpdateSelectedData, dispatch),
});

interface FilterProps extends DispatchProps {
	updatedQueryParams: (updatedValue: string[], key: string[]) => void;
}

export default connect(null, mapDispatchToProps)(Filter);
