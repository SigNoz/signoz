package model

type SamlConfig struct {
	SamlEntity string `json:"samlEntity"`
	SamlIdp    string `json:"samlIdp"`
	SamlCert   string `json:"samlCert"`
}
