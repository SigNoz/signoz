package engine

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
)

func fingerprint(ctx context.Context, sql string, args []any) string {
	h := sha1.New()
	h.Write([]byte(sql))
	for _, a := range args {
		fmt.Fprintf(h, "%v|", a)
	}
	return hex.EncodeToString(h.Sum(nil))
}
