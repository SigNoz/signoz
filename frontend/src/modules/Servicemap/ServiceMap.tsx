//@ts-nocheck

import { useEffect, useMemo, useRef } from 'react';
// eslint-disable-next-line no-restricted-imports
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { Card } from 'antd';
import Spinner from 'components/Spinner';
import TextToolTip from 'components/TextToolTip';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { whilelistedKeys } from 'hooks/useResourceAttribute/config';
import { IResourceAttribute } from 'hooks/useResourceAttribute/types';
import { filterServiceMapSupportedQueries } from 'hooks/useResourceAttribute/utils';
import { getDetailedServiceMapItems, ServiceMapStore } from 'store/actions';
import { AppState } from 'store/reducers';
import styled from 'styled-components';
import { GlobalTime } from 'types/actions/globalTime';

import Map from './Map';

const Container = styled.div`
	.force-graph-container {
		overflow: scroll;
	}

	.force-graph-container .graph-tooltip {
		background: black;
		padding: 1px;
		.keyval {
			display: flex;
			.key {
				margin-right: 4px;
			}
			.val {
				margin-left: auto;
			}
		}
	}
`;

interface ServiceMapProps extends RouteComponentProps<any> {
	serviceMap: ServiceMapStore;
	globalTime: GlobalTime;
	getDetailedServiceMapItems: (
		time: GlobalTime,
		queries: IResourceAttribute[],
	) => void;
}
interface graphNode {
	id: string;
	group: number;
}
interface graphLink {
	source: string;
	target: string;
	value: number;
	callRate: number;
	errorRate: number;
	p99: number;
}
export interface graphDataType {
	nodes: graphNode[];
	links: graphLink[];
}

function ServiceMap(props: ServiceMapProps): JSX.Element {
	const fgRef = useRef();

	const { getDetailedServiceMapItems, globalTime, serviceMap } = props;

	const { queries } = useResourceAttribute();

	const supportedQueries = useMemo(
		() => filterServiceMapSupportedQueries(queries),
		[queries],
	);

	useEffect(() => {
		/*
			Call the apis only when the route is loaded.
			Check this issue: https://github.com/SigNoz/signoz/issues/110
		 */
		getDetailedServiceMapItems(globalTime, supportedQueries);
	}, [globalTime, getDetailedServiceMapItems, supportedQueries]);

	useEffect(() => {
		fgRef.current && fgRef.current.d3Force('charge').strength(-400);
	});

	const renderBody = (): JSX.Element => {
		if (serviceMap.loading) {
			return <Spinner size="large" tip="Loading..." />;
		}

		if (serviceMap.items.length === 0) {
			return <Card>No Service Found</Card>;
		}

		return <Map fgRef={fgRef} serviceMap={serviceMap} />;
	};

	return (
		<Container className="service-map-container">
			<ResourceAttributesFilter
				suffixIcon={
					<TextToolTip
						{...{
							text: `Currently, service map supports filtering of ${whilelistedKeys.join(
								', ',
							)} only, in resource attributes`,
						}}
					/>
				}
			/>

			{renderBody()}
		</Container>
	);
}

const mapStateToProps = (
	state: AppState,
): {
	serviceMap: serviceMapStore;
	globalTime: GlobalTime;
} => ({
	serviceMap: state.serviceMap,
	globalTime: state.globalTime,
});

export default withRouter(
	connect(mapStateToProps, {
		getDetailedServiceMapItems,
	})(ServiceMap),
);
