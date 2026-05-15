import { Button as ButtonComponent } from 'antd';
import { Typography as TypographyComponent } from '@signozhq/ui/typography';
import styled from 'styled-components';

export const Button = styled(ButtonComponent)`
	&&& {
		width: min-content;
		align-self: flex-end;
	}
`;
export const ButtonContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 0.5rem;
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
