export interface CheckoutSuccessPayloadProps {
	redirectURL: string;
}

export interface CheckoutRequestPayloadProps {
	licenseKey: string;
	successURL: string;
	cancelURL: string;
}
