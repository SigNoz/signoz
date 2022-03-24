import { Typography } from 'antd';
import styled, { css } from 'styled-components';

const { Text, Title, Paragraph } = Typography;

export const CustomTitle = styled(Title)`
	&&& {
		font-size: 14px;
	}
`;

export const CustomText = styled(Text)`
	&&& {
		color: #2d9cdb;
	}
`;

export const CustomSubTitle = styled(Title)`
	&&& {
		/* color: #bdbdbd; */
		font-size: 14px;
		margin-bottom: 8px;
	}
`;

interface CustomSubTextProps {
	isDarkMode: boolean;
}

export const CustomSubText = styled(Paragraph)<CustomSubTextProps>`
	&&& {
		background: ${({ isDarkMode }): string => (isDarkMode ? '#444' : '#ddd')};
		font-size: 12px;
		padding: 6px 8px;
		word-break: break-all;
		margin-bottom: 16px;
	}
`;

export const CardContainer = styled.div`
	margin: 0 0.5rem;
	position: absolute;
	height: 100%;
	width: 100%;
	flex: 1;
	overflow-y: auto;
`;

const removeMargin = css`
	margin: 0;
`;
const removePadding = css`
	padding: 0;
`;

const selectedSpanDetailsContainer = css`
	margin-left: 0.5rem;
`;

const spanEventsTabsContainer = css`
	margin-top: 1rem;
`;
export const styles = {
	removeMargin,
	removePadding,
	selectedSpanDetailsContainer,
	spanEventsTabsContainer,
};
