package metrics

import (
	"context"
	"fmt"
	"time"

	"go.signoz.io/signoz/pkg/query-service/cache/status"
)

type cacheMiddleware struct {
	cache Cache
	next  Service
}

func NewCacheMiddleware(cache Cache, next Service) Service {
	return &cacheMiddleware{cache: cache, next: next}
}

func (c *cacheMiddleware) GetMetrics(ctx context.Context, req *GetMetricsRequest) (*GetMetricsResponse, error) {
	cacheKey := c.getCacheKey(req)
	data, retrieveStatus, err := c.cache.Retrieve(cacheKey, false)
	if err != nil {
		return nil, err
	}
	if retrieveStatus == status.RetrieveStatusHit {
		return &GetMetricsResponse{
			Data: data,
		}, nil
	}

	resp, err := c.next.GetMetrics(ctx, req)
	if err != nil {
		return nil, err
	}

	err = c.cache.Store(cacheKey, resp.Data, time.Duration(req.TTL)*time.Second)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (c *cacheMiddleware) getCacheKey(req *GetMetricsRequest) string {
	return fmt.Sprintf("%s:%s:%s", req.ServiceName, req.OperationName, req.StartTime)
}
