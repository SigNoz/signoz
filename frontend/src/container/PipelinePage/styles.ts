import { Button as ButtonComponent } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 2rem;
		align-items: center;
	}
`;

export const Button = styled(ButtonComponent)`
	&&& {
		margin-left: 1em;
	}
`;

export const Container = styled.div`
	margin-top: 3rem;
`;

export const AlertContentWrapper = styled.div`
	font-weight: 400;
	font-style: normal;
	font-size: 0.75rem;
`;

export const ListItemTitleWrapper = styled.p`
	display: flex;
	font-style: normal;
	font-weight: 400;
	font-size: 0.813rem;
	line-height: 0rem;
	color: ${themeColors.gainsboro};
`;

export const ModalFooterTitle = styled.span`
	font-style: normal;
	font-weight: 400;
	font-size: 0.75rem;
	line-height: 1.25rem;
`;
