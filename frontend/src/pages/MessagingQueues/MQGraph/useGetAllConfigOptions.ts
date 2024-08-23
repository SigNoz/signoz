/* eslint-disable react-hooks/exhaustive-deps */
import { DefaultOptionType } from 'antd/es/select';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { useEffect, useState } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

export interface ConfigOptions {
	attributeKey: string;
	searchText?: string;
}

export interface GetAllConfigOptionsResponse {
	options: DefaultOptionType[];
	isFetching: boolean;
}

export function useGetAllConfigOptions(
	props: ConfigOptions,
): GetAllConfigOptionsResponse {
	const { attributeKey, searchText } = props;
	const [isFetching, setFetching] = useState<boolean>(true);
	const [results, setResults] = useState<DefaultOptionType[]>([]);

	const getValues = async (): Promise<void> => {
		try {
			setResults([]);
			setFetching(true);
			const { payload } = await getAttributesValues({
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				aggregateAttribute: 'kafka_consumer_group_lag',
				attributeKey,
				searchText: searchText ?? '',
				filterAttributeKeyDataType: DataTypes.String,
				tagType: 'tag',
			});

			if (payload) {
				const values = Object.values(payload).find((el) => !!el) || [];
				const options: DefaultOptionType[] = values.map((val: string) => ({
					label: val,
					value: val,
				}));
				setResults(options);
			}
		} catch (e) {
			console.error(e);
		} finally {
			setFetching(false);
		}
	};

	useEffect(() => {
		getValues();
	}, [searchText]);

	return { options: results, isFetching };
}
