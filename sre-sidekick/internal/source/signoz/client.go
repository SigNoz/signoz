package signoz

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client is the low-level SigNoz REST transport. Query planning remains
// separate so profiles can later target other telemetry systems.
type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

func (c *Client) QueryRange(ctx context.Context, request any, response any) error {
	return c.postJSON(ctx, "/api/v5/query_range", request, response)
}

func (c *Client) postJSON(ctx context.Context, path string, request any, response any) error {
	return c.requestJSON(ctx, http.MethodPost, path, request, response)
}

func (c *Client) requestJSON(ctx context.Context, method, path string, request any, response any) error {
	var bodyReader io.Reader = http.NoBody
	if request != nil {
		body, err := json.Marshal(request)
		if err != nil {
			return fmt.Errorf("encode SigNoz request: %w", err)
		}
		bodyReader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, bodyReader)
	if err != nil {
		return fmt.Errorf("create SigNoz request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("SIGNOZ-API-KEY", c.APIKey)
	}

	client := c.HTTPClient
	if client == nil {
		client = http.DefaultClient
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("send SigNoz request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		message, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<10))
		return fmt.Errorf("SigNoz query returned %s: %s", resp.Status, strings.TrimSpace(string(message)))
	}
	if response == nil {
		return nil
	}
	if err := json.NewDecoder(resp.Body).Decode(response); err != nil {
		return fmt.Errorf("decode SigNoz response: %w", err)
	}
	return nil
}

func (c *Client) getJSON(ctx context.Context, path string, response any) error {
	return c.requestJSON(ctx, http.MethodGet, path, nil, response)
}

func (c *Client) putJSON(ctx context.Context, path string, request any, response any) error {
	return c.requestJSON(ctx, http.MethodPut, path, request, response)
}
