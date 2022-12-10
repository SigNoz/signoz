import { Tooltip } from 'antd';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ITraceTag } from 'types/api/trace/getTraceItem';
import AppReducer from 'types/reducer/app';

import EllipsedButton from '../EllipsedButton';
import { CustomSubText, CustomSubTitle, SubTextContainer } from '../styles';
import { CommonTagsProps } from '.';
import { Container } from './styles';

function Tag({ tags, onToggleHandler, setText }: TagProps): JSX.Element {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);

	const { value, isEllipsed } = useMemo(() => {
		const value = tags.key === 'error' ? 'true' : tags.value;

		return {
			value,
			isEllipsed: value.length > 24,
		};
	}, [tags]);

	return (
		<React.Fragment key={JSON.stringify(tags)}>
			{tags.value && (
				<Container>
					<CustomSubTitle>{tags.key}</CustomSubTitle>
					<SubTextContainer isDarkMode={isDarkMode}>
						<Tooltip overlay={(): string => value}>
							<CustomSubText
								ellipsis={{
									rows: isEllipsed ? 1 : 0,
								}}
								isDarkMode={isDarkMode}
							>
								{value}
							</CustomSubText>

							{isEllipsed && (
								<EllipsedButton
									{...{
										event: tags.key,
										onToggleHandler,
										setText,
										value,
										buttonText: 'View full value',
									}}
								/>
							)}
						</Tooltip>
					</SubTextContainer>
				</Container>
			)}
		</React.Fragment>
	);
}

interface TagProps extends CommonTagsProps {
	tags: ITraceTag;
}

export default Tag;
