import {
	Dropdown as DropDownComponent,
	Input as InputComponent,
	Typography as TypographyComponent,
} from 'antd';
import styled from 'styled-components';

export const RetentionContainer = styled.div`
	width: 50%;
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1rem;
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

export const Container = styled.div`
	&&& {
		display: flex;
		flex-direction: column;
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
	}
`;

export const ErrorText = styled(TypographyComponent)`
	&&& {
		color: #e89a3c;
		font-style: italic;
	}
`;
