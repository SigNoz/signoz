package model

type FeatureSet map[string]bool

const Basic = "BASIC_PLAN"

var BasicPlan = FeatureSet{
	Basic: true,
}
