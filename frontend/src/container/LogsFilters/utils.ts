import { message } from 'antd';
import addToSelectedFields from 'api/logs/AddToSelectedField';
import removeSelectedField from 'api/logs/RemoveFromSelectedField';
import store from 'store';
import {
	UPDATE_INTERESTING_FIELDS,
	UPDATE_SELECTED_FIELDS,
} from 'types/actions/logs';
import { ErrorResponse } from 'types/api';

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

	try {
		await addToSelectedFields({
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
	} catch (errRes) {
		message.error((errRes as ErrorResponse)?.error);
	} finally {
		setInterestingFieldLoading(
			interestingFieldLoading.filter((e) => e !== fieldIndex),
		);
	}
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

	try {
		await removeSelectedField({
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
	} catch (errRes) {
		message.error((errRes as ErrorResponse)?.error);
	} finally {
		setSelectedFieldLoading(
			interestingFieldLoading.filter((e) => e !== fieldIndex),
		);
	}
};
