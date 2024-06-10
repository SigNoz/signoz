package common

import (
	"context"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func GetUserFromContext(ctx context.Context) *model.UserPayload {
	user, ok := ctx.Value(constants.ContextUserKey).(*model.UserPayload)
	if !ok {
		return nil
	}
	return user
}

func GCD(a, b int64) int64 {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}

func LCM(a, b int64) int64 {
	return (a * b) / GCD(a, b)
}

// LCMList computes the LCM of a list of int64 numbers.
func LCMList(nums []int64) int64 {
	if len(nums) == 0 {
		return 1
	}
	result := nums[0]
	for _, num := range nums[1:] {
		result = LCM(result, num)
	}
	return result
}
