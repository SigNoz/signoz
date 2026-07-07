package zeustypes

import (
	"encoding/json"
)

type GettableDeployment struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Cluster struct {
		ID     string `json:"id"`
		Name   string `json:"name"`
		Region struct {
			ID   string `json:"id"`
			Name string `json:"name"`
			DNS  string `json:"dns"`
		} `json:"region"`
	} `json:"cluster"`
}

func NewGettableDeployment(data []byte) (*GettableDeployment, error) {
	deployment := new(GettableDeployment)
	err := json.Unmarshal(data, deployment)
	if err != nil {
		return nil, err
	}

	return deployment, nil
}
