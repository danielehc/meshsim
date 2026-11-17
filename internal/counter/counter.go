package counter

import "sync/atomic"

// Counter is a concurrency-safe in-memory counter.
type Counter struct {
	v int64
}

// Get returns the current value.
func (c *Counter) Get() int64 { return atomic.LoadInt64(&c.v) }

// Add increments by 1 and returns the new value.
func (c *Counter) Add() int64 { return atomic.AddInt64(&c.v, 1) }
