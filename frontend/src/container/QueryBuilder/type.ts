import { QueryBuilderStateT } from 'constants/queryBuilder';
import React from 'react';

export interface QueryBuilderContainerPropsI {
	children: React.ReactElement | React.ReactNode;
}

export interface InitialStateI {
	search: string;
}

export type VoidFunctionWithValue = (value: string) => void;
export type VoidFunction = () => void;

export interface ContextValueI {
	values: InitialStateI;
	onChangeHandler: (type: QueryBuilderStateT) => VoidFunctionWithValue;
	onSubmitHandler: VoidFunction;
}
