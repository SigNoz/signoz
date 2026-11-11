import getRandomColor from 'lib/getRandomColor';
import { v4 } from 'uuid';

import { useCreateAlertState } from '../context';
import {
	INITIAL_INFO_THRESHOLD,
	INITIAL_RANDOM_THRESHOLD,
	INITIAL_WARNING_THRESHOLD,
} from '../context/constants';
import { Threshold } from '../context/types';
import { ThresholdList, UpdateThreshold } from './types';

export function useThresholdList(): ThresholdList {
	const { thresholdState, setThresholdState } = useCreateAlertState();
	const { thresholds } = thresholdState;

	const addThreshold = (overrides?: Partial<Threshold>): void => {
		let newThreshold;
		if (thresholds.length === 1) {
			newThreshold = { ...INITIAL_WARNING_THRESHOLD, id: v4() };
		} else if (thresholds.length === 2) {
			newThreshold = { ...INITIAL_INFO_THRESHOLD, id: v4() };
		} else {
			newThreshold = {
				...INITIAL_RANDOM_THRESHOLD,
				id: v4(),
				color: getRandomColor(),
			};
		}
		setThresholdState({
			type: 'SET_THRESHOLDS',
			payload: [...thresholds, { ...newThreshold, ...overrides }],
		});
	};

	const removeThreshold = (id: string): void => {
		if (thresholds.length > 1) {
			setThresholdState({
				type: 'SET_THRESHOLDS',
				payload: thresholds.filter((t) => t.id !== id),
			});
		}
	};

	const updateThreshold: UpdateThreshold = (id, field, value) => {
		setThresholdState({
			type: 'SET_THRESHOLDS',
			payload: thresholds.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
		});
	};

	return { addThreshold, removeThreshold, updateThreshold };
}
