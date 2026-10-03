package signoz

import (
	"context"
	"fmt"
)

func (c *Client) GenerateDashboard(ctx context.Context, data map[string]any) (string, bool, error) {
	title, _ := data["title"].(string)
	var list struct {
		Data []struct {
			ID   string         `json:"id"`
			Data map[string]any `json:"data"`
		} `json:"data"`
	}
	if err := c.getJSON(ctx, "/api/v1/dashboards", &list); err != nil {
		return "", false, err
	}
	for _, dashboard := range list.Data {
		if got, _ := dashboard.Data["title"].(string); got == title {
			if err := c.putJSON(ctx, "/api/v1/dashboards/"+dashboard.ID, data, nil); err != nil {
				return "", false, err
			}
			return dashboard.ID, false, nil
		}
	}
	var created struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := c.postJSON(ctx, "/api/v1/dashboards", data, &created); err != nil {
		return "", false, err
	}
	if created.Data.ID == "" {
		return "", false, fmt.Errorf("SigNoz dashboard response did not contain an id")
	}
	return created.Data.ID, true, nil
}

func (c *Client) EnsureChannel(ctx context.Context, name string, webhookURL ...string) error {
	var list struct {
		Data []struct {
			Name string `json:"name"`
		} `json:"data"`
	}
	if err := c.getJSON(ctx, "/api/v1/channels", &list); err != nil {
		return err
	}
	for _, channel := range list.Data {
		if channel.Name == name {
			return nil
		}
	}
	if len(webhookURL) == 0 || webhookURL[0] == "" {
		return fmt.Errorf("webhook URL is required to create SigNoz channel %q", name)
	}
	return c.postJSON(ctx, "/api/v1/channels", map[string]any{
		"name": name, "webhook_configs": []any{map[string]any{"url": webhookURL[0], "send_resolved": true}},
	}, nil)
}

func (c *Client) GenerateBurnRateAlert(ctx context.Context, alertName string, rule map[string]any) (bool, error) {
	var list struct {
		Data []struct {
			Alert string `json:"alert"`
		} `json:"data"`
	}
	if err := c.getJSON(ctx, "/api/v2/rules", &list); err != nil {
		return false, err
	}
	for _, existing := range list.Data {
		if existing.Alert == alertName {
			return false, nil
		}
	}
	if err := c.postJSON(ctx, "/api/v2/rules", rule, nil); err != nil {
		return false, err
	}
	return true, nil
}
