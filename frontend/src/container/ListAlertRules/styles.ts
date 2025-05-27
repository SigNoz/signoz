import { Button as ButtonComponent } from 'antd';
import styled from 'styled-components';

export const SearchContainer = styled.div`
	&&& {
		display: flex;
		margin-bottom: 2rem;
		align-items: center;
		gap: 2rem;
	}
	.search-container {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;

		.search-tooltip {
			color: #1890ff;
			cursor: help;
		}
	}
`;

export const Button = styled(ButtonComponent)`
	&&& {
		margin-left: 1em;
	}
`;

export const ColumnButton = styled(ButtonComponent)`
	&&& {
		padding-left: 0;
		padding-right: 0;
		margin-right: 1.5em;
		width: 100%;
		display: flex;
		align-items: center;
	}
`;
