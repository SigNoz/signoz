package app

import (
	"context"
	"fmt"

	"golang.org/x/time/rate"
)

// The rate limiter supports the following
// 1. The limit should be applied on per user-identifier.
// 2. The type of rate limit used is token bucket, to handle burst requests.
// 3. The rate-limiter doesn't ensure that the identifer is valid or not. It is the responsibility
// of the user to ensure it.
type RateLimiter struct {
	requestPerSecond int
	burstSize        int
	identifierMap    map[string]*rate.Limiter
}

func NewRateLimiter(requestPerSecond, burstSize int) *RateLimiter {
	return &RateLimiter{
		requestPerSecond: requestPerSecond,
		burstSize:        burstSize,
	}
}

func (rl *RateLimiter) LimitsIdentifier(id string) bool {
	_, found := rl.identifierMap[id]
	return found
}

func (rl *RateLimiter) AddIdentifier(id string) {
	rl.identifierMap[id] = rate.NewLimiter(rate.Limit(rl.requestPerSecond), rl.burstSize)
}

func (rl *RateLimiter) Limit(id string) error {
	limiter, found := rl.identifierMap[id]
	if !found {
		return nil
	}
	if err := limiter.Wait(context.Background()); err != nil {
		return fmt.Errorf("rate limit exceeded: %v", err)
	}
	return nil
}
