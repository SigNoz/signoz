import { ReactNode } from 'react';
import { UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { MenuItemKeys } from './contants';

export interface MenuItem {
	key: TWidgetOptions;
	icon: ReactNode;
	label: string;
	isVisible: boolean;
	disabled: boolean;
	danger?: boolean;
}

export type TWidgetOptions =
	| MenuItemKeys.View
	| MenuItemKeys.Edit
	| MenuItemKeys.Delete
	| MenuItemKeys.Clone;

export type KeyMethodMappingProps<T extends TWidgetOptions> = {
	[K in T]: {
		key: TWidgetOptions;
		method?: VoidFunction;
	};
};

export interface IWidgetHeaderProps {
	title: ReactNode;
	widget: Widgets;
	onView: VoidFunction;
	onDelete?: VoidFunction;
	onClone?: VoidFunction;
	parentHover: boolean;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>;
	errorMessage: string | undefined;
	allowDelete?: boolean;
	allowClone?: boolean;
	allowEdit?: boolean;
	allowThreshold?: boolean;
	threshold?: number;
}

export interface DisplayThresholdProps {
	threshold: ReactNode;
}
