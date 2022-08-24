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

type bucket struct {
	upperBound float64
	count      float64
}

type buckets []bucket

func (b buckets) Len() int           { return len(b) }
func (b buckets) Swap(i, j int)      { b[i], b[j] = b[j], b[i] }
func (b buckets) Less(i, j int) bool { return b[i].upperBound < b[j].upperBound }

func bucketQuantile(q float64, buckets buckets) float64 {
	if q < 0 {
		return math.Inf(-1)
	}
	if q > 1 {
		return math.Inf(+1)
	}
	if len(buckets) < 2 {
		return math.NaN()
	}
	sort.Sort(buckets)
	if !math.IsInf(buckets[len(buckets)-1].upperBound, +1) {
		return math.NaN()
	}

	ensureMonotonic(buckets)

	rank := q * buckets[len(buckets)-1].count
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

func ensureMonotonic(buckets buckets) {
	max := buckets[0].count
	for i := range buckets[1:] {
		switch {
		case buckets[i].count > max:
			max = buckets[i].count
		case buckets[i].count < max:
			buckets[i].count = max
		}
	}
}

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
		parts := strings.Split(text, "\",")

		var bucketNumbers []float64
		text = parts[0][2 : len(parts[0])-1]
		for _, num := range strings.Split(text, ",") {
			num = strings.TrimSpace(num)
			number, err := strconv.ParseFloat(num, 64)
			if err == nil {
				bucketNumbers = append(bucketNumbers, number)
			}
		}

		var bucketCounts []float64
		text = parts[1][2 : len(parts[1])-1]
		for _, num := range strings.Split(text, ",") {
			num = strings.TrimSpace(num)
			number, err := strconv.ParseFloat(num, 64)
			if err == nil {
				bucketCounts = append(bucketCounts, number)
			}
		}

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
