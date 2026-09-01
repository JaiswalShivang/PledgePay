package workerpool

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestRunPool_ProcessAllJobs(t *testing.T) {
	ctx := context.Background()
	jobs := make(chan int, 20)

	totalJobs := 20
	for i := 1; i <= totalJobs; i++ {
		jobs <- i
	}
	close(jobs)

	var processedCount int64
	var sum int64

	err := RunPool(ctx, 4, jobs, func(n int) error {
		atomic.AddInt64(&processedCount, 1)
		atomic.AddInt64(&sum, int64(n))
		return nil
	})

	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if processedCount != int64(totalJobs) {
		t.Fatalf("expected %d jobs processed, got %d", totalJobs, processedCount)
	}

	expectedSum := int64(totalJobs * (totalJobs + 1) / 2)
	if sum != expectedSum {
		t.Fatalf("expected sum %d, got %d", expectedSum, sum)
	}
}

func TestRunPool_ContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	jobs := make(chan int)

	go func() {
		for i := 0; i < 1000; i++ {
			select {
			case <-ctx.Done():
				return
			case jobs <- i:
				time.Sleep(10 * time.Millisecond)
			}
		}
		close(jobs)
	}()

	var processedCount int64
	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	err := RunPool(ctx, 3, jobs, func(n int) error {
		atomic.AddInt64(&processedCount, 1)
		time.Sleep(20 * time.Millisecond)
		return nil
	})

	if err == nil {
		t.Fatalf("expected context cancellation error, got nil")
	}

	if processedCount == 0 {
		t.Fatalf("expected at least 1 job to have started processing")
	}
}
