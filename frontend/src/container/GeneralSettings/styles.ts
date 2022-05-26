import {
	Col,
	Dropdown as DropDownComponent,
	Input as InputComponent,
	Typography as TypographyComponent,
} from 'antd';
import styled from 'styled-components';

export const RetentionContainer = styled(Col)`
	margin: 0.75rem 0;
`;

export const Input = styled(InputComponent)`
	&&& {
		height: 2rem;
		max-width: 150px;
	}
`;

export const Typography = styled(TypographyComponent)`
	&&& {
		display: flex;
		align-items: center;
	}
`;

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		justify-content: flex-end;
		width: 50%;
		align-items: center;
		margin-top: 3rem;
	}
`;

export const Dropdown = styled(DropDownComponent)`
	&&& {
		display: flex;
		justify-content: center;
		align-items: center;
		max-width: 150px;
		min-width: 150px;
	}
`;

export const TextContainer = styled.div`
	&&& {
		min-width: 100px;
	}
`;

export const ErrorTextContainer = styled.div`
	&&& {
		margin-top: 2rem;
		margin-bottom: 2rem;
		display: flex;
		align-items: center;
		gap: 1rem;

		> article {
			margin-right: 1rem;
		}
	}
`;

export const ToolTipContainer = styled.div`
	&&& {
		margin-top: 2rem;
		margin-bottom: 2rem;
		display: flex;
		align-items: center;
		width: 50%;
		justify-content: flex-end;
	}
`;

export const ErrorText = styled(TypographyComponent)`
	&&& {
		color: #e89a3c;
		font-style: italic;
	}
`;

export const RetentionFieldLabel = styled(TypographyComponent)`
	vertical-align: middle;
	white-space: pre-wrap;
`;

export const RetentionFieldInputContainer = styled.div`
	display: inline-flex;
`;

export const ActionItemsContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
	margin-top: 10%;
`;
