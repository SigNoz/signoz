package druidQuery

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"go.uber.org/zap"
)

const (
	SQL_ENDPOINT = "/druid/v2/sql"
)

type SqlClient struct {
	Url      string
	EndPoint string
	Timeout  time.Duration

	Debug        bool
	LastRequest  string
	LastResponse string
}

type SqlQuery struct {
	Query        string `json:"query"`
	Header       bool   `json:"header"`
	ResultFormat string `json:"resultFormat"`
}

func (c *SqlClient) Query(sql string, resultFormat string) ([]byte, error) {

	query := SqlQuery{
		Query:        sql,
		Header:       true,
		ResultFormat: resultFormat,
	}

	reqJson, err := json.Marshal(query)

	//	log request made to druid
	zap.S().Info(string(reqJson))

	result, err := c.QueryRaw(reqJson)
	if err != nil {
		return []byte("Error"), err
	}

	return result, nil
}

func (c *SqlClient) QueryRaw(req []byte) (result []byte, err error) {
	if c.EndPoint == "" {
		c.EndPoint = SQL_ENDPOINT
	}
	endPoint := c.EndPoint
	if c.Debug {
		endPoint += "?pretty"
		c.LastRequest = string(req)
	}
	if err != nil {
		return
	}

	// By default, use 60 second timeout unless specified otherwise
	// by the caller
	clientTimeout := 60 * time.Second
	if c.Timeout != 0 {
		clientTimeout = c.Timeout
	}

	httpClient := &http.Client{
		Timeout: clientTimeout,
	}

	resp, err := httpClient.Post(c.Url+endPoint, "application/json", bytes.NewBuffer(req))
	if err != nil {
		return
	}
	defer func() {
		resp.Body.Close()
	}()

	result, err = ioutil.ReadAll(resp.Body)
	if err != nil {
		return
	}
	if c.Debug {
		c.LastResponse = string(result)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%s: %s", resp.Status, string(result))
	}

	return
}
