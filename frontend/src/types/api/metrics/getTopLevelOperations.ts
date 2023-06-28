export type TopLevelOperations = string[];

export interface Props {
	service: string;
}

export type PayloadProps = TopLevelOperations;

export type ServiceDataProps = {
	[serviceName: string]: string[];
};
