import {
	Dispatch,
	SetStateAction,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { InputRef } from 'antd';
import { AutoComplete, Input, Typography } from 'antd';
import { popupContainer } from 'utils/selectPopupContainer';

import SettingsSection from '../../components/SettingsSection/SettingsSection';

import './GeneralSettingsSection.styles.scss';

const { TextArea } = Input;

interface VariableOption {
	value: string;
	label: string;
}

interface GeneralSettingsSectionProps {
	title: string;
	setTitle: Dispatch<SetStateAction<string>>;
	description: string;
	setDescription: Dispatch<SetStateAction<string>>;
	dashboardVariables: Record<string, { name?: string }>;
}

export default function GeneralSettingsSection({
	title,
	setTitle,
	description,
	setDescription,
	dashboardVariables,
}: GeneralSettingsSectionProps): JSX.Element {
	const [inputValue, setInputValue] = useState(title);
	const [autoCompleteOpen, setAutoCompleteOpen] = useState(false);
	const [cursorPos, setCursorPos] = useState(0);
	const inputRef = useRef<InputRef>(null);

	const onChangeHandler = (
		setFunc: Dispatch<SetStateAction<string>>,
		value: string,
	): void => {
		setFunc(value);
	};

	const dashboardVariableOptions = useMemo<VariableOption[]>(() => {
		return Object.entries(dashboardVariables).map(([, value]) => ({
			value: value.name || '',
			label: value.name || '',
		}));
	}, [dashboardVariables]);

	const updateCursorAndDropdown = useCallback(
		(value: string, pos: number): void => {
			setCursorPos(pos);
			const lastDollar = value.lastIndexOf('$', pos - 1);
			setAutoCompleteOpen(lastDollar !== -1 && pos >= lastDollar + 1);
		},
		[],
	);

	const onInputChange = useCallback(
		(value: string): void => {
			setInputValue(value);
			onChangeHandler(setTitle, value);
			setTimeout(() => {
				const pos = inputRef.current?.input?.selectionStart ?? 0;
				updateCursorAndDropdown(value, pos);
			}, 0);
		},
		[setTitle, updateCursorAndDropdown],
	);

	const onSelect = useCallback(
		(selectedValue: string): void => {
			const pos = cursorPos;
			const value = inputValue;
			const lastDollar = value.lastIndexOf('$', pos - 1);
			const textBeforeDollar = value.substring(0, lastDollar);
			const textAfterDollar = value.substring(lastDollar + 1);
			const match = textAfterDollar.match(/^([a-zA-Z0-9_.]*)/);
			const rest = textAfterDollar.substring(match ? match[1].length : 0);
			const newValue = `${textBeforeDollar}$${selectedValue}${rest}`;
			setInputValue(newValue);
			onChangeHandler(setTitle, newValue);
			setAutoCompleteOpen(false);
			setTimeout(() => {
				const newCursor = `${textBeforeDollar}$${selectedValue}`.length;
				inputRef.current?.input?.setSelectionRange(newCursor, newCursor);
				setCursorPos(newCursor);
			}, 0);
		},
		[cursorPos, inputValue, setTitle],
	);

	const filterOption = useCallback(
		(currentInputValue: string, option?: VariableOption): boolean => {
			const pos = cursorPos;
			const value = currentInputValue;
			const lastDollar = value.lastIndexOf('$', pos - 1);
			if (lastDollar === -1) {
				return false;
			}
			const afterDollar = value.substring(lastDollar + 1, pos).toLowerCase();
			return option?.value.toLowerCase().startsWith(afterDollar) || false;
		},
		[cursorPos],
	);

	const handleInputCursor = useCallback((): void => {
		const pos = inputRef.current?.input?.selectionStart ?? 0;
		updateCursorAndDropdown(inputValue, pos);
	}, [inputValue, updateCursorAndDropdown]);

	return (
		<SettingsSection title="General" defaultOpen icon={null}>
			<section className="general-settings__name-description control-container">
				<Typography.Text className="section-heading">Name</Typography.Text>
				<AutoComplete
					options={dashboardVariableOptions}
					value={inputValue}
					onChange={onInputChange}
					onSelect={onSelect}
					filterOption={filterOption}
					getPopupContainer={popupContainer}
					placeholder="Enter the panel name here..."
					open={autoCompleteOpen}
				>
					<Input
						rootClassName="general-settings__name-input"
						ref={inputRef}
						onSelect={handleInputCursor}
						data-testid="panel-name-input"
						onClick={handleInputCursor}
						onBlur={(): void => setAutoCompleteOpen(false)}
					/>
				</AutoComplete>
				<Typography.Text className="section-heading">Description</Typography.Text>
				<TextArea
					placeholder="Enter the panel description here..."
					bordered
					allowClear
					value={description}
					data-testid="panel-description-input"
					onChange={(event): void =>
						onChangeHandler(setDescription, event.target.value)
					}
					rootClassName="general-settings__description-input"
				/>
			</section>
		</SettingsSection>
	);
}
