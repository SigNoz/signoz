import { Input, InputRef, Popover } from 'antd';
import SearchFields from 'container/LogsSearchFilter/SearchFields';
import { useCallback, useRef, useState } from 'react';

import { Container, DropDownContainer } from '../../LogsSearchFilter/styles';

interface ILogSearchFilter {
	query: string;
	setQuery: (value: string) => void;
}

function LogSearchFilter({ query, setQuery }: ILogSearchFilter): JSX.Element {
	// const [searchText, setSearchText] = useState('');
	const [showDropDown, setShowDropDown] = useState(false);
	const searchRef = useRef<InputRef>(null);

	const onDropDownToggleHandler = useCallback(
		(value: boolean) => (): void => {
			setShowDropDown(value);
		},
		[],
	);

	const onPopOverChange = useCallback(
		(isVisible: boolean) => {
			onDropDownToggleHandler(isVisible)();
		},
		[onDropDownToggleHandler],
	);

	return (
		<Container>
			<Popover
				placement="bottom"
				content={
					<DropDownContainer>
						<SearchFields
							updateQueryString={setQuery}
							onDropDownToggleHandler={onDropDownToggleHandler}
						/>
					</DropDownContainer>
				}
				trigger="click"
				overlayInnerStyle={{
					minWidth: 800,
					width: `${searchRef?.current?.input?.offsetWidth || 0}px`,
				}}
				open={showDropDown}
				destroyTooltipOnHide
				onOpenChange={onPopOverChange}
			>
				<Input.Search
					ref={searchRef}
					placeholder="Search Filter"
					value={query}
					onChange={(e): void => {
						const { value } = e.target;
						setQuery(value);
					}}
					onSearch={setQuery}
					allowClear
				/>
			</Popover>
		</Container>
	);
}

export default LogSearchFilter;
