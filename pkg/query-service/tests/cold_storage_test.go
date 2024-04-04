package tests

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"go.signoz.io/signoz/pkg/query-service/model"
)

const (
	endpoint = "http://localhost:8180"
)

var (
	client http.Client
)

func setTTL(table, coldStorage, toColdTTL, deleteTTL string, jwtToken string) ([]byte, error) {
	params := fmt.Sprintf("type=%s&duration=%s", table, deleteTTL)
	if len(toColdTTL) > 0 {
		params += fmt.Sprintf("&coldStorage=%s&toColdDuration=%s", coldStorage, toColdTTL)
	}
	var bearer = "Bearer " + jwtToken
	req, err := http.NewRequest("POST", endpoint+"/api/v1/settings/ttl?"+params, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", bearer)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return b, err
	}

	return b, nil
}

func TestListDisks(t *testing.T) {
	t.Skip()
	email := "alice@signoz.io"
	password := "Password@123"

	loginResp, err := login(email, password, "")
	require.NoError(t, err)

	var bearer = "Bearer " + loginResp.AccessJwt
	req, err := http.NewRequest("POST", endpoint+"/api/v1/disks", nil)
	req.Header.Add("Authorization", bearer)

	resp, err := client.Do(req)
	require.NoError(t, err)

	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.JSONEq(t, `[{"name":"default","type":"local"}, {"name":"s3","type":"s3"}]`, string(b))
}

func TestSetTTL(t *testing.T) {
	email := "alice@signoz.io"
	password := "Password@123"

	loginResp, err := login(email, password, "")
	require.NoError(t, err)

	testCases := []struct {
		caseNo      int
		coldStorage string
		table       string
		coldTTL     string
		deleteTTL   string
		expected    string
	}{
		{
			1, "s3", "traces", "100h", "60h",
			"Delete TTL should be greater than cold storage move TTL.",
		},
		{
			2, "s3", "traces", "100", "60s",
			"Not a valid toCold TTL duration 100",
		},
		{
			3, "s3", "traces", "100s", "100",
			"Not a valid TTL duration 100",
		},
		{
			4, "s3", "metrics", "1h", "2h",
			"move ttl has been successfully set up",
		},
		{
			5, "s3", "traces", "10s", "6h",
			"move ttl has been successfully set up",
		},
	}

	for _, tc := range testCases {
		r, err := setTTL(tc.table, tc.coldStorage, tc.coldTTL, tc.deleteTTL, loginResp.AccessJwt)
		require.NoErrorf(t, err, "Failed case: %d", tc.caseNo)
		require.Containsf(t, string(r), tc.expected, "Failed case: %d", tc.caseNo)
	}

	time.Sleep(20 * time.Second)
	doneCh := make(chan struct{})
	defer close(doneCh)

	count := 0
	for range minioClient.ListObjects(bucketName, "", false, doneCh) {
		count++
	}

	require.True(t, count > 0, "No objects are present in Minio")
	fmt.Printf("=== Found %d objects in Minio\n", count)
}

func getTTL(t *testing.T, table string, jwtToken string) *model.GetTTLResponseItem {
	url := endpoint + fmt.Sprintf("/api/v1/settings/ttl?type=%s", table)
	if len(table) == 0 {
		url = endpoint + "/api/v1/settings/ttl"
	}

	var bearer = "Bearer " + jwtToken
	req, err := http.NewRequest("GET", url, nil)
	require.NoError(t, err)
	req.Header.Add("Authorization", bearer)
	resp, err := client.Do(req)

	require.NoError(t, err)

	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	res := &model.GetTTLResponseItem{}
	require.NoError(t, json.Unmarshal(b, res))
	return res
}

func TestGetTTL(t *testing.T) {
	email := "alice@signoz.io"
	password := "Password@123"

	loginResp, err := login(email, password, "")
	require.NoError(t, err)

	resp := getTTL(t, "traces", loginResp.AccessJwt)
	for resp.Status == "pending" {
		time.Sleep(time.Second)
	}
	require.Equal(t, "success", resp.Status)

	r, err := setTTL("traces", "s3", "1h", "2h", loginResp.AccessJwt)
	require.NoError(t, err)
	require.Contains(t, string(r), "successfully set up")

	resp = getTTL(t, "traces", loginResp.AccessJwt)
	for resp.Status == "pending" {
		time.Sleep(time.Second)
		resp = getTTL(t, "traces", loginResp.AccessJwt)
		require.Equal(t, 1, resp.ExpectedTracesMoveTime)
		require.Equal(t, 2, resp.ExpectedTracesTime)
	}
	resp = getTTL(t, "traces", loginResp.AccessJwt)
	require.Equal(t, "success", resp.Status)
	require.Equal(t, 1, resp.TracesMoveTime)
	require.Equal(t, 2, resp.TracesTime)

	resp = getTTL(t, "metrics", loginResp.AccessJwt)
	for resp.Status == "pending" {
		time.Sleep(time.Second)
	}
	require.Equal(t, "success", resp.Status)

	r, err = setTTL("traces", "s3", "10h", "20h", loginResp.AccessJwt)
	require.NoError(t, err)
	require.Contains(t, string(r), "successfully set up")

	resp = getTTL(t, "traces", loginResp.AccessJwt)
	for resp.Status == "pending" {
		time.Sleep(time.Second)
		resp = getTTL(t, "traces", loginResp.AccessJwt)
	}
	require.Equal(t, "success", resp.Status)
	require.Equal(t, 10, resp.TracesMoveTime)
	require.Equal(t, 20, resp.TracesTime)

	resp = getTTL(t, "metrics", loginResp.AccessJwt)
	for resp.Status != "success" && resp.Status != "failed" {
		time.Sleep(time.Second)
		resp = getTTL(t, "metrics", loginResp.AccessJwt)
	}
	require.Equal(t, "success", resp.Status)
	require.Equal(t, 1, resp.MetricsMoveTime)
	require.Equal(t, 2, resp.MetricsTime)

	r, err = setTTL("metrics", "s3", "0s", "0s", loginResp.AccessJwt)
	require.NoError(t, err)
	require.Contains(t, string(r), "Not a valid TTL duration 0s")

	r, err = setTTL("traces", "s3", "0s", "0s", loginResp.AccessJwt)
	require.NoError(t, err)
	require.Contains(t, string(r), "Not a valid TTL duration 0s")
}

func TestMain(m *testing.M) {
	if err := startCluster(); err != nil {
		fmt.Println(err)
	}
	defer stopCluster()

	m.Run()
}
