import { memo, useMemo } from 'react';
import { orange } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import { Popover, Tooltip, Typography } from 'antd';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import { OptionData } from 'components/NewSelect/types';
import { popupContainer } from 'utils/selectPopupContainer';

import { ALL_SELECT_VALUE } from '../utils';
import { SelectItemStyle } from './styles';

const errorIconStyle = { margin: '0 0.5rem' };

interface SelectVariableInputProps {
	variableId: string;
	options: OptionData[];
	value: string | string[] | undefined;
	enableSelectAll: boolean;
	isMultiSelect: boolean;
	onChange: (value: string | string[]) => void;
	onClear: () => void;
	defaultValue?: string | string[];
	onDropdownVisibleChange?: (visible: boolean) => void;
	loading?: boolean;
	errorMessage?: string | null;
	onRetry?: () => void;
	isDynamicVariable?: boolean;
	showRetryButton?: boolean;
	showIncompleteDataMessage?: boolean;
	onSearch?: (searchTerm: string) => void;
	waiting?: boolean;
	waitingMessage?: string;
}

const MAX_TAG_DISPLAY_VALUES = 10;

export const renderMaxTagPlaceholder = (
	omittedValues: { label?: React.ReactNode; value?: string | number }[],
): JSX.Element => {
	const valuesToShow = omittedValues.slice(0, MAX_TAG_DISPLAY_VALUES);
	const hasMore = omittedValues.length > MAX_TAG_DISPLAY_VALUES;
	const tooltipText =
		valuesToShow.map(({ value: v }) => v ?? '').join(', ') +
		(hasMore ? ` + ${omittedValues.length - MAX_TAG_DISPLAY_VALUES} more` : '');

	return (
		<Tooltip title={tooltipText}>
			<span>+ {omittedValues.length} </span>
		</Tooltip>
	);
};

function SelectVariableInput({
	variableId,
	options,
	value,
	onChange,
	onDropdownVisibleChange,
	onClear,
	loading,
	errorMessage,
	onRetry,
	enableSelectAll,
	isMultiSelect,
	defaultValue,
	isDynamicVariable,
	showRetryButton,
	showIncompleteDataMessage,
	onSearch,
	waitingMessage,
}: SelectVariableInputProps): JSX.Element {
	const commonProps = useMemo(
		() => ({
			// main props
			key: variableId,
			value,
			defaultValue,

			// setup props
			placeholder: 'Select value',
			className: 'variable-select',
			popupClassName: 'dropdown-styles',
			getPopupContainer: popupContainer,
			showSearch: true,
			bordered: false,

			// changing props
			'data-testid': 'variable-select',
			onChange,
			loading,
			waitingMessage,
			style: SelectItemStyle,
			options,
			errorMessage,
			onRetry,

			// dynamic variable only props
			isDynamicVariable,
			showRetryButton,
			showIncompleteDataMessage,
			onSearch,
		}),
		[
			variableId,
			defaultValue,
			onChange,
			loading,
			waitingMessage,
			options,
			value,
			errorMessage,
			onRetry,
			isDynamicVariable,
			showRetryButton,
			showIncompleteDataMessage,
			onSearch,
		],
	);

	return (
		<>
			{isMultiSelect ? (
				<CustomMultiSelect
					{...commonProps}
					placement="bottomLeft"
					maxTagCount={2}
					onDropdownVisibleChange={onDropdownVisibleChange}
					maxTagPlaceholder={renderMaxTagPlaceholder}
					onClear={onClear}
					enableAllSelection={enableSelectAll}
					maxTagTextLength={30}
					allowClear={value !== ALL_SELECT_VALUE}
				/>
			) : (
				<CustomSelect {...commonProps} />
			)}

			{errorMessage && (
				<span style={errorIconStyle}>
					<Popover placement="top" content={<Typography>{errorMessage}</Typography>}>
						<WarningOutlined style={{ color: orange[5] }} />
					</Popover>
				</span>
			)}
		</>
	);
}

export default memo(SelectVariableInput);
