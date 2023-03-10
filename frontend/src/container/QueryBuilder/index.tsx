import { QueryBuilderStateT } from 'constants/queryBuilder';
import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';

import {
	ContextValueI,
	InitialStateI,
	QueryBuilderContainerPropsI,
	VoidFunction,
	VoidFunctionWithValue,
} from './type';

const initialState: InitialStateI = {
	search: '',
};

const defaultContextValue: ContextValueI = {
	values: initialState,
	onChangeHandler: (): VoidFunction => (): void => {},
	onSubmitHandler: (): void => {},
};

const QueryBuilderContext = createContext<ContextValueI>(defaultContextValue);
const useQueryBuilderContext = (): ContextValueI =>
	useContext(QueryBuilderContext);

function QueryBuilderContainer({
	children,
}: QueryBuilderContainerPropsI): JSX.Element {
	const [values, setValues] = useState<InitialStateI>(initialState);

	const onChangeHandler = useCallback(
		(type: QueryBuilderStateT): VoidFunctionWithValue => (
			value: string,
		): void => {
			setValues((prev) => ({ ...prev, [type]: value }));
		},
		[],
	);

	const onSubmitHandler = useCallback(() => {
		console.log(values, '----values');
	}, [values]);

	const providerValue = useMemo(
		() => ({
			values,
			onChangeHandler,
			onSubmitHandler,
		}),
		[onChangeHandler, values, onSubmitHandler],
	);

	return (
		<QueryBuilderContext.Provider value={providerValue}>
			{children}
		</QueryBuilderContext.Provider>
	);
}

export { QueryBuilderContainer, useQueryBuilderContext };
