import { Select, Spin } from 'antd';
import { SelectProps } from 'antd/es/select';
import debounce from 'lodash-es/debounce';
import React, { useRef, useState } from 'react';

export interface DebounceSelectProps<ValueType = any>
	extends Omit<SelectProps<ValueType>, 'options' | 'children'> {
	fetchOptions: (search: string) => Promise<ValueType[]>;
	debounceTimeout: number;
}

function DebounceSelect<
	ValueType extends {
		key?: string;
		label: React.ReactNode;
		value: string | number;
	} = never
>({
	fetchOptions,
	debounceTimeout = 800,
	...props
}: DebounceSelectProps): JSX.Element {
	const [fetching, setFetching] = useState(false);
	const [options, setOptions] = useState<ValueType[]>([]);
	const fetchRef = useRef(0);

	const debounceFetcher = React.useMemo(() => {
		const loadOptions = (value: string): void => {
			fetchRef.current += 1;
			const fetchId = fetchRef.current;
			setOptions([]);
			setFetching(true);

			fetchOptions(value).then((newOptions) => {
				if (fetchId !== fetchRef.current) {
					// for fetch callback order
					return;
				}

				setOptions(newOptions);
				setFetching(false);
			});
		};

		return debounce(loadOptions, debounceTimeout);
	}, [fetchOptions, debounceTimeout]);

	return (
		<Select<ValueType>
			labelInValue
			filterOption={false}
			onSearch={debounceFetcher}
			notFoundContent={fetching ? <Spin size="small" /> : null}
			style={{ width: '170px' }}
			// as all other props are from SelectProps only
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
			options={options}
		/>
	);
}

export default DebounceSelect;
