package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

const (
	endpoint = "http://localhost:8180"
)

var (
	client http.Client
)

func TestHelloWorld(t *testing.T) {
	resp, err := client.Get(endpoint + "/api/v1/disks")
	require.NoError(t, err)

	defer resp.Body.Close()
	b, err := ioutil.ReadAll(resp.Body)
	require.NoError(t, err)

	fmt.Printf("Resp is: %s\n", b)
}

func TestMain(m *testing.M) {
	startCluster()
	// defer stopCluster()

	m.Run()
}
