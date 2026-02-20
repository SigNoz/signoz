import { ReactNode } from 'react';
import { Tag, Typography } from 'antd';
import styled from 'styled-components';

// --- Styles
export const StyledText = styled(Typography.Text)`
	cursor: pointer;
`;

export const StyledTag = styled(Tag)`
	margin-top: 0.125rem;
	margin-bottom: 0.125rem;
	padding-left: 0.5rem;
	display: flex;
`;

// --- Types
export type HavingFilterTagProps = {
	label: ReactNode;
	value: string;
	disabled: boolean;
	onClose: VoidFunction;
	closable: boolean;
	onUpdate: (value: string) => void;
};

export type HavingTagRenderProps = Omit<HavingFilterTagProps, 'onUpdate'>;

// --- Component
export function HavingFilterTag({
	value,
	closable,
	onClose,
	onUpdate,
}: HavingFilterTagProps): JSX.Element {
	const handleClick = (): void => {
		onUpdate(value);
	};

	return (
		<StyledTag closable={closable} onClose={onClose}>
			<StyledText ellipsis onClick={handleClick}>
				{value}
			</StyledText>
		</StyledTag>
	);
}
