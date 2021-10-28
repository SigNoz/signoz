import { Card, Tag } from 'antd';
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
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

const Filter = ({
	updateSelectedOperation,
	updateSelectedService,
	updateSelectedTags,
	updateSelectedLatency,
}: FilterProps): JSX.Element => {
	const {
		selectedService,
		selectedOperation,
		selectedLatency,
		selectedTags,
	} = useSelector<AppState, TraceReducer>((state) => state.trace);

	function handleCloseTag(value: any): void {
		if (value === 'service') {
			updateSelectedService('');
		}
		if (value === 'operation') {
			updateSelectedOperation('');
		}
		if (value === 'maxLatency') {
			updateSelectedLatency({
				max: value.max,
				min: '',
			});
		}
		if (value === 'minLatency') {
			updateSelectedLatency({
				max: '',
				min: value.min,
			});
		}
	}

	function handleCloseTagElement(item: TagItem): void {
		updateSelectedTags(selectedTags.filter((e) => e.key !== item.key));
	}

	return (
		<Card>
			{selectedService.length !== 0 && (
				<Tag
					closable
					onClose={(): void => {
						handleCloseTag('service');
					}}
				>
					service:{selectedService}
				</Tag>
			)}

			{selectedOperation.length !== 0 && (
				<Tag
					closable
					onClose={(): void => {
						handleCloseTag('operation');
					}}
				>
					operation:{selectedOperation}
				</Tag>
			)}

			{selectedLatency?.min.length !== 0 && (
				<Tag
					closable
					onClose={(): void => {
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
					onClose={(): void => {
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
					onClose={(): void => {
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
	updateSelectedLatency: (
		selectedLatency: TraceReducer['selectedLatency'],
	) => (dispatch: Dispatch<AppActions>) => void;
	updateSelectedOperation: (
		selectedOperation: TraceReducer['selectedOperation'],
	) => (dispatch: Dispatch<AppActions>) => void;
	updateSelectedService: (
		selectedService: TraceReducer['selectedService'],
	) => (dispatch: Dispatch<AppActions>) => void;
	updateSelectedTags: (
		selectedTags: TraceReducer['selectedTags'],
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateSelectedLatency: bindActionCreators(UpdateSelectedLatency, dispatch),
	updateSelectedOperation: bindActionCreators(UpdateSelectedOperation, dispatch),
	updateSelectedService: bindActionCreators(UpdateSelectedService, dispatch),
	updateSelectedTags: bindActionCreators(UpdateSelectedTags, dispatch),
});

type FilterProps = DispatchProps;

export default connect(null, mapDispatchToProps)(Filter);
