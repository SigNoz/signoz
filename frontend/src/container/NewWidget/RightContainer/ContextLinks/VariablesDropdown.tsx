import './VariablesDropdown.styles.scss';

import { Dropdown, Typography } from 'antd';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

interface VariablesDropdownProps {
	onVariableSelect: (variableName: string) => void;
	variables: VariableItem[];
	children: (props: {
		onVariableSelect: (variableName: string) => void;
		isOpen: boolean;
		setIsOpen: (open: boolean) => void;
	}) => ReactNode;
}

interface VariableItem {
	name: string;
	source: string;
}

function VariablesDropdown({
	onVariableSelect,
	variables,
	children,
}: VariablesDropdownProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	// Click outside handler
	useEffect(() => {
		function handleClickOutside(event: MouseEvent): void {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}
		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return (): void => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen]);

	const dropdownItems = useMemo(
		() =>
			variables.map((v) => ({
				key: v.name,
				label: (
					<div className="variable-row">
						<Typography.Text className="variable-name">{`{{${v.name}}}`}</Typography.Text>
						<Typography.Text className="variable-source">{v.source}</Typography.Text>
					</div>
				),
			})),
		[variables],
	);

	return (
		<div className="variables-dropdown-container" ref={wrapperRef}>
			<Dropdown
				menu={{
					items: dropdownItems,
					onClick: ({ key }): void => {
						const variableName = key as string;
						onVariableSelect(`{{${variableName}}}`);
						setIsOpen(false);
					},
				}}
				open={isOpen}
				placement="bottomLeft"
				trigger={['click']}
				getPopupContainer={(): HTMLElement => wrapperRef.current || document.body}
			>
				{children({ onVariableSelect, isOpen, setIsOpen })}
			</Dropdown>
		</div>
	);
}

export default VariablesDropdown;
