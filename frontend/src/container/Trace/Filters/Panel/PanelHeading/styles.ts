import { Button } from 'antd';
import styled, { css } from 'styled-components';

interface Props {
	disabled: boolean;
}

export const Container = styled.div<Props>`
	&&& {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-left: 0.5rem;
		min-height: 5vh;

		cursor: ${({ disabled }) => disabled && 'not-allowed'};

		${({ disabled }) =>
			disabled &&
			css`
				opacity: 0.5;
			`}
	}
`;

export const IconContainer = styled.div`
	&&& {
		margin-right: 0.5rem;
	}
`;

export const TextCotainer = styled.div`
	&&& {
		display: flex;
		cursor: pointer;
	}
`;

export const ButtonComponent = styled(Button)`
	&&& {
		font-size: 0.75rem;
	}
`;

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
	}
`;
