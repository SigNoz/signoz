import { Space, Typography } from 'antd';
import styled, { css } from 'styled-components';

const { Title, Paragraph } = Typography;

export const CustomTitle = styled(Title)`
	&&& {
		font-size: 14px;
	}
`;

export const CustomText = styled(Paragraph)`
	&&& {
		color: #2d9cdb;
	}
`;

export const CustomSubTitle = styled(Title)`
	&&& {
		font-size: 14px;
		margin-bottom: 0.1rem;
		margin-top: 0.5rem;
	}
`;

interface CustomSubTextProps {
	isDarkMode: boolean;
}

export const SubTextContainer = styled.div<CustomSubTextProps>`
	&&& {
		background: ${({ isDarkMode }): string => (isDarkMode ? '#444' : '#ddd')};
	}
`;

export const CustomSubText = styled(Paragraph)<CustomSubTextProps>`
	&&& {
		background: ${({ isDarkMode }): string => (isDarkMode ? '#444' : '#ddd')};
		font-size: 12px;
		padding: 4px 8px;
		word-break: break-all;
		margin-bottom: 0rem;
	}
`;

export const CardContainer = styled.div`
	margin: 0 0.5rem;
	position: absolute;
	height: 100%;
	width: 100%;
	flex: 1;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: auto;
`;

export const CustomSpace = styled(Space)`
	&&& {
		.ant-space-item {
			width: 100%;
		}
	}
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

const overflow = css`
	width: 95%;

	> div.ant-space-item:nth-child(4) {
		overflow-x: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const buttonContainer = css`
	height: 1.5rem;
`;

export const styles = {
	removeMargin,
	removePadding,
	selectedSpanDetailsContainer,
	spanEventsTabsContainer,
	overflow,
	buttonContainer,
};
