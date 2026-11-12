import type { ServicesMapItem } from 'store/actions/serviceMap';

export interface ServiceMapNode {
	id: string;
	/** Calls into the service, summed over its incoming edges. */
	callCount: number;
	callRate: number;
	/** Percentage of incoming calls that failed, weighted by call count. */
	errorRate: number;
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
}

export interface ServiceMapLink {
	source: string;
	target: string;
	callCount: number;
	callRate: number;
	errorRate: number;
	/** Nanoseconds. */
	p99: number;
}

export interface ServiceMapGraph {
	nodes: ServiceMapNode[];
	links: ServiceMapLink[];
}

export type ServiceMapDependency = ServicesMapItem;
