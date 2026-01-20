export interface CheckoutSuccessPayloadProps {
	redirectURL: string;
}

export interface CheckoutRequestPayloadProps {
	url: string;
}

export interface PayloadProps {
	data: CheckoutSuccessPayloadProps;
	status: string;
}
