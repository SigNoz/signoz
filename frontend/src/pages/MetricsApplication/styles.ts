import {
	Button as ButtonComponent,
	Typography as TypographyComponent,
} from 'antd';
import styled from 'styled-components';

export const Button = styled(ButtonComponent)`
	&&& {
		width: min-content;
		align-self: flex-end;
	}
`;

export const AppDexThresholdContainer = styled.div`
	display: flex;
	align-items: center;
`;

export const Typography = styled(TypographyComponent)`
	&&& {
		width: 24rem;
		margin: 0.5rem 0;
	}
`;

export const SaveAndCancelContainer = styled.div`
	display: flex;
	justify-content: flex-end;
	margin-right: 1rem;
`;

export const SaveButton = styled(ButtonComponent)`
	&&& {
		margin: 0 0.5rem;
		display: flex;
		align-items: center;
	}
`;

export const ExcludeErrorCodeContainer = styled.div`
	margin: 1rem 0;
`;
