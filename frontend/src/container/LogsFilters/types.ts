import { SetStateAction } from 'react';
import {
	IField,
	IInterestingFields,
	ISelectedFields,
} from 'types/api/logs/fields';

type SetLoading = (value: SetStateAction<number[]>) => void;

export type IHandleInterestProps = {
	fieldData: IInterestingFields;
	fieldIndex: number;
};

export type IHandleRemoveInterestProps = {
	fieldData: ISelectedFields;
	fieldIndex: number;
};

export interface OnHandleAddInterestProps {
	setInterestingFieldLoading: SetLoading;
	fieldIndex: number;
	fieldData: ISelectedFields;
	interesting: IField[];
	interestingFieldLoading: number[];
	selected: IField[];
}

export interface OnHandleRemoveInterestProps {
	setSelectedFieldLoading: SetLoading;
	selected: IField[];
	interesting: IField[];
	interestingFieldLoading: number[];
	fieldData: IInterestingFields;
	fieldIndex: number;
}
