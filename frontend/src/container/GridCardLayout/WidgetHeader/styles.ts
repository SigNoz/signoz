import { grey } from '@ant-design/colors';
import { Typography as TypographyComponent } from 'antd';
import styled from 'styled-components';

export const HeaderContainer = styled.div<{ hover: boolean }>`
	padding: 0.25rem 0.5rem 0.25rem 0;
	font-size: 0.8rem;
	display: flex;
	justify-content: flex-end;
`;

export const HeaderContentContainer = styled.span`
	cursor: pointer;
	position: relative;
`;

export const ThesholdContainer = styled.span`
	margin-top: -0.3rem;
`;

export const DisplayThresholdContainer = styled.div`
	display: flex;
	align-items: center;
	width: auto;
	justify-content: space-between;
`;

export const WidgetHeaderContainer = styled.div`
	display: flex;
	align-items: center;
	height: 30px;
	width: 100%;
	justify-content: space-between;
`;

export const ArrowContainer = styled.span<{ hover: boolean }>`
	visibility: ${({ hover }): string => (hover ? 'visible' : 'hidden')};
`;

export const Typography = styled(TypographyComponent)`
	&&& {
		width: auto;
		margin-left: 0.2rem;
		color: ${grey[2]};
	}
`;

export const TypographHeading = styled(TypographyComponent)`
	&&& {
		color: ${grey[2]};
	}
`;
