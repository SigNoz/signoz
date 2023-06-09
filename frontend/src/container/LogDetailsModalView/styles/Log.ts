import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const LogContainer = styled.div`
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	text-align: left;
	margin-left: -24px;
`;

export const HisoryLogContainer = styled.div`
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	text-align: left;
	margin: 0 -24px;
	* {
		::-webkit-scrollbar {
			width: 0.3rem;
		}
		::-webkit-scrollbar:horizontal {
			height: 0.3rem;
		}
		::-webkit-scrollbar-track {
			background: transparent;
		}
		::-webkit-scrollbar-thumb {
			background: ${themeColors.royalGrey};
			border-radius: 0.625rem;
		}
		::-webkit-scrollbar-thumb:hover {
			background: ${themeColors.matterhornGrey};
		}
		::-webkit-scrollbar-corner {
			background: transparent;
		}
	}
`;

export const HistoryLogHeader = styled.div`
	display: flex;
	align-items: center;
	padding: 8px;

	button {
		margin-left: 8px;
		border-radius: 4px;
	}
`;

export const HistoryLogsScrolled = styled.div`
	max-height: 150px;
	overflow-y: auto;
	overflow-x: hidden;
	background: #262626;
`;

export const Log = styled.div`
	padding: 4px 8px;
`;

export const SpinnerContainer = styled.div`
	display: flex;
	height: 150px;
	align-items: center;
	justify-content: center;
`;
