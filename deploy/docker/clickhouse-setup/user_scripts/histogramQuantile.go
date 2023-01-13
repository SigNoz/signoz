package main

import (
	"bufio"
	"fmt"
	"math"
	"os"
	"sort"
	"strconv"
	"strings"
)

// NOTE: executable must be built with target OS and architecture set to linux/amd64
// env GOOS=linux GOARCH=amd64 go build -o histogramQuantile histogramQuantile.go

// The following code is adapted from the following source:
// https://github.com/prometheus/prometheus/blob/main/promql/quantile.go

type bucket struct {
	upperBound float64
	count      float64
}

// buckets implements sort.Interface.
type buckets []bucket

func (b buckets) Len() int           { return len(b) }
func (b buckets) Swap(i, j int)      { b[i], b[j] = b[j], b[i] }
func (b buckets) Less(i, j int) bool { return b[i].upperBound < b[j].upperBound }

// bucketQuantile calculates the quantile 'q' based on the given buckets. The
// buckets will be sorted by upperBound by this function (i.e. no sorting
// needed before calling this function). The quantile value is interpolated
// assuming a linear distribution within a bucket. However, if the quantile
// falls into the highest bucket, the upper bound of the 2nd highest bucket is
// returned. A natural lower bound of 0 is assumed if the upper bound of the
// lowest bucket is greater 0. In that case, interpolation in the lowest bucket
// happens linearly between 0 and the upper bound of the lowest bucket.
// However, if the lowest bucket has an upper bound less or equal 0, this upper
// bound is returned if the quantile falls into the lowest bucket.
//
// There are a number of special cases (once we have a way to report errors
// happening during evaluations of AST functions, we should report those
// explicitly):
//
// If 'buckets' has 0 observations, NaN is returned.
//
// If 'buckets' has fewer than 2 elements, NaN is returned.
//
// If the highest bucket is not +Inf, NaN is returned.
//
// If q==NaN, NaN is returned.
//
// If q<0, -Inf is returned.
//
// If q>1, +Inf is returned.
func bucketQuantile(q float64, buckets buckets) float64 {
	if math.IsNaN(q) {
		return math.NaN()
	}
	if q < 0 {
		return math.Inf(-1)
	}
	if q > 1 {
		return math.Inf(+1)
	}
	sort.Sort(buckets)
	if !math.IsInf(buckets[len(buckets)-1].upperBound, +1) {
		return math.NaN()
	}

	buckets = coalesceBuckets(buckets)
	ensureMonotonic(buckets)

	if len(buckets) < 2 {
		return math.NaN()
	}
	observations := buckets[len(buckets)-1].count
	if observations == 0 {
		return math.NaN()
	}
	rank := q * observations
	b := sort.Search(len(buckets)-1, func(i int) bool { return buckets[i].count >= rank })

	if b == len(buckets)-1 {
		return buckets[len(buckets)-2].upperBound
	}
	if b == 0 && buckets[0].upperBound <= 0 {
		return buckets[0].upperBound
	}
	var (
		bucketStart float64
		bucketEnd   = buckets[b].upperBound
		count       = buckets[b].count
	)
	if b > 0 {
		bucketStart = buckets[b-1].upperBound
		count -= buckets[b-1].count
		rank -= buckets[b-1].count
	}
	return bucketStart + (bucketEnd-bucketStart)*(rank/count)
}

// coalesceBuckets merges buckets with the same upper bound.
//
// The input buckets must be sorted.
func coalesceBuckets(buckets buckets) buckets {
	last := buckets[0]
	i := 0
	for _, b := range buckets[1:] {
		if b.upperBound == last.upperBound {
			last.count += b.count
		} else {
			buckets[i] = last
			last = b
			i++
		}
	}
	buckets[i] = last
	return buckets[:i+1]
}

// The assumption that bucket counts increase monotonically with increasing
// upperBound may be violated during:
//
//   * Recording rule evaluation of histogram_quantile, especially when rate()
//      has been applied to the underlying bucket timeseries.
//   * Evaluation of histogram_quantile computed over federated bucket
//      timeseries, especially when rate() has been applied.
//
// This is because scraped data is not made available to rule evaluation or
// federation atomically, so some buckets are computed with data from the
// most recent scrapes, but the other buckets are missing data from the most
// recent scrape.
//
// Monotonicity is usually guaranteed because if a bucket with upper bound
// u1 has count c1, then any bucket with a higher upper bound u > u1 must
// have counted all c1 observations and perhaps more, so that c  >= c1.
//
// Randomly interspersed partial sampling breaks that guarantee, and rate()
// exacerbates it. Specifically, suppose bucket le=1000 has a count of 10 from
// 4 samples but the bucket with le=2000 has a count of 7 from 3 samples. The
// monotonicity is broken. It is exacerbated by rate() because under normal
// operation, cumulative counting of buckets will cause the bucket counts to
// diverge such that small differences from missing samples are not a problem.
// rate() removes this divergence.)
//
// bucketQuantile depends on that monotonicity to do a binary search for the
// bucket with the φ-quantile count, so breaking the monotonicity
// guarantee causes bucketQuantile() to return undefined (nonsense) results.
//
// As a somewhat hacky solution until ingestion is atomic per scrape, we
// calculate the "envelope" of the histogram buckets, essentially removing
// any decreases in the count between successive buckets.

func ensureMonotonic(buckets buckets) {
	max := buckets[0].count
	for i := 1; i < len(buckets); i++ {
		switch {
		case buckets[i].count > max:
			max = buckets[i].count
		case buckets[i].count < max:
			buckets[i].count = max
		}
	}
}

// End of copied code.

func readLines() []string {
	r := bufio.NewReader(os.Stdin)
	bytes := []byte{}
	lines := []string{}
	for {
		line, isPrefix, err := r.ReadLine()
		if err != nil {
			break
		}
		bytes = append(bytes, line...)
		if !isPrefix {
			str := strings.TrimSpace(string(bytes))
			if len(str) > 0 {
				lines = append(lines, str)
				bytes = []byte{}
			}
		}
	}
	if len(bytes) > 0 {
		lines = append(lines, string(bytes))
	}
	return lines
}

func main() {
	lines := readLines()
	for _, text := range lines {
		// Example input
		// "[1, 2, 4, 8, 16]", "[1, 5, 8, 10, 14]", 0.9"
		// bounds - counts - quantile
		parts := strings.Split(text, "\",")

		var bucketNumbers []float64
		// Strip the ends with square brackets
		text = parts[0][2 : len(parts[0])-1]
		// Parse the bucket bounds
		for _, num := range strings.Split(text, ",") {
			num = strings.TrimSpace(num)
			number, err := strconv.ParseFloat(num, 64)
			if err == nil {
				bucketNumbers = append(bucketNumbers, number)
			}
		}

		var bucketCounts []float64
		// Strip the ends with square brackets
		text = parts[1][2 : len(parts[1])-1]
		// Parse the bucket counts
		for _, num := range strings.Split(text, ",") {
			num = strings.TrimSpace(num)
			number, err := strconv.ParseFloat(num, 64)
			if err == nil {
				bucketCounts = append(bucketCounts, number)
			}
		}

		// Parse the quantile
		q, err := strconv.ParseFloat(parts[2], 64)
		var b buckets

		if err == nil {
			for i := 0; i < len(bucketNumbers); i++ {
				b = append(b, bucket{upperBound: bucketNumbers[i], count: bucketCounts[i]})
			}
		}
		fmt.Println(bucketQuantile(q, b))
	}
}
