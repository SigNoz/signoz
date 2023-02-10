import AddToSelectedFields from 'api/logs/AddToSelectedField';
import RemoveSelectedField from 'api/logs/RemoveFromSelectedField';
import store from 'store';
import {
	UPDATE_INTERESTING_FIELDS,
	UPDATE_SELECTED_FIELDS,
} from 'types/actions/logs';

import { RESTRICTED_SELECTED_FIELDS } from './config';
import { OnHandleAddInterestProps, OnHandleRemoveInterestProps } from './types';

export const onHandleAddInterest = async ({
	setInterestingFieldLoading,
	fieldIndex,
	fieldData,
	interesting,
	interestingFieldLoading,
	selected,
}: OnHandleAddInterestProps): Promise<void> => {
	const { dispatch } = store;

	setInterestingFieldLoading((prevState: number[]) => {
		prevState.push(fieldIndex);
		return [...prevState];
	});

	await AddToSelectedFields({
		...fieldData,
		selected: true,
	});

	dispatch({
		type: UPDATE_INTERESTING_FIELDS,
		payload: {
			field: interesting.filter((e) => e.name !== fieldData.name),
			type: 'selected',
		},
	});

	dispatch({
		type: UPDATE_SELECTED_FIELDS,
		payload: {
			field: [...selected, fieldData],
			type: 'selected',
		},
	});

	setInterestingFieldLoading(
		interestingFieldLoading.filter((e) => e !== fieldIndex),
	);
};

export const onHandleRemoveInterest = async ({
	setSelectedFieldLoading,
	selected,
	interesting,
	interestingFieldLoading,
	fieldData,
	fieldIndex,
}: OnHandleRemoveInterestProps): Promise<void> => {
	if (RESTRICTED_SELECTED_FIELDS.includes(fieldData.name)) return;

	const { dispatch } = store;

	setSelectedFieldLoading((prevState) => {
		prevState.push(fieldIndex);
		return [...prevState];
	});

	await RemoveSelectedField({
		...fieldData,
		selected: false,
	});

	dispatch({
		type: UPDATE_SELECTED_FIELDS,
		payload: {
			field: selected.filter((e) => e.name !== fieldData.name),
			type: 'selected',
		},
	});

	dispatch({
		type: UPDATE_INTERESTING_FIELDS,
		payload: {
			field: [...interesting, fieldData],
			type: 'interesting',
		},
	});

	setSelectedFieldLoading(
		interestingFieldLoading.filter((e) => e !== fieldIndex),
	);
};
