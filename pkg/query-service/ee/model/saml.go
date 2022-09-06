package model

type SamlConfig struct {
	SamlEntityId string `json:"samlEntityId" db:"samlEntityId"`
	SamlIpdURL   string `json:"samlIpdURL" db:"samlIpdURL"`
	SamlCert     string `json:"samlCert" db:"samlCert"`
}
