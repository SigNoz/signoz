package tests

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

const (
	endpoint = "http://localhost:8180"
)

var (
	client http.Client
)

func setTTL(table, coldStorage, toColdTTL, deleteTTL string) ([]byte, error) {
	params := fmt.Sprintf("type=%s&duration=%s", table, deleteTTL)
	if len(toColdTTL) > 0 {
		params += fmt.Sprintf("&coldStorage=%s&toColdDuration=%s", coldStorage, toColdTTL)
	}
	resp, err := client.Post(endpoint+"/api/v1/settings/ttl?"+params, "", nil)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	b, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return b, err
	}

	return b, nil
}

func TestListDisks(t *testing.T) {
	resp, err := client.Get(endpoint + "/api/v1/disks")
	require.NoError(t, err)

	defer resp.Body.Close()
	b, err := ioutil.ReadAll(resp.Body)
	require.NoError(t, err)
	require.JSONEq(t, `[{"name":"default","type":"local"}, {"name":"s3","type":"s3"}]`, string(b))
}

func TestSetTTL(t *testing.T) {

	testCases := []struct {
		caseNo      int
		coldStorage string
		table       string
		coldTTL     string
		deleteTTL   string
		expected    string
	}{
		{
			1, "s3", "traces", "100s", "60s",
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
			4, "s3", "traces", "", "60s",
			"move ttl has been successfully set up",
		},
		{
			5, "s3", "traces", "10s", "600s",
			"move ttl has been successfully set up",
		},
		{
			6, "s4", "traces", "10s", "600s",
			"No such volume `s4` in storage policy `tiered`",
		},
	}

	for _, tc := range testCases {
		r, err := setTTL(tc.table, tc.coldStorage, tc.coldTTL, tc.deleteTTL)
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

func TestMain(m *testing.M) {
	if err := startCluster(); err != nil {
		fmt.Println(err)
	}
	defer stopCluster()

	m.Run()
}
