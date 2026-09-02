package workerpool

import (
	"context"
	"fmt"
	"runtime"
	"sync"
)

func RunPool[T any](ctx context.Context, size int, jobs <-chan T, fn func(T) error) error {
	if size <= 0 {
		size = runtime.NumCPU()
	}

	var wg sync.WaitGroup
	errChan := make(chan error, size)

	for i := 0; i < size; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case job, ok := <-jobs:
					if !ok {
						return
					}
					if err := fn(job); err != nil {
						select {
						case errChan <- fmt.Errorf("worker %d failed: %w", workerID, err):
						default:
						}
					}
				}
			}
		}(i)
	}

	wg.Wait()
	close(errChan)

	var firstErr error
	for err := range errChan {
		if firstErr == nil {
			firstErr = err
		}
	}

	if ctx.Err() != nil {
		return ctx.Err()
	}

	return firstErr
}
