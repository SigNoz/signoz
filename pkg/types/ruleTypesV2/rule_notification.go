package ruletypesv2

import (
	"encoding/json"
	"fmt"
)

// RoutingPolicyRuleNotification implements RuleNotification
type RoutingPolicyRuleNotification struct {
	RoutingConfigs           []string `json:"routingConfigs"`
	Match                    string   `json:"match"`
	DefaultChannels          []string `json:"defaultChannels"`
	MultiNotificationEnabled bool     `json:"multiNotificationEnabled"`
	MultiNotification        []string `json:"multiNotification"`
	Renotification           string   `json:"renotification"`
}

func (rprn *RoutingPolicyRuleNotification) Kind() string {
	return "ROUTING_POLICY"
}

func (rprn *RoutingPolicyRuleNotification) Validate() error {
	if len(rprn.RoutingConfigs) == 0 && len(rprn.DefaultChannels) == 0 {
		return fmt.Errorf("either routing configs or default channels must be specified")
	}
	return nil
}

func (rprn *RoutingPolicyRuleNotification) MarshalJSON() ([]byte, error) {
	wrapper := struct {
		Kind string      `json:"kind"`
		Spec interface{} `json:"spec"`
	}{
		Kind: rprn.Kind(),
		Spec: *rprn,
	}
	return json.Marshal(wrapper)
}