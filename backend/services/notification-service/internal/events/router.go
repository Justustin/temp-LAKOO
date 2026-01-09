package events

import (
	"context"
	"fmt"
)

type Router struct {
	handlers map[string]Handler
}

func NewRouter() *Router {
	return &Router{
		handlers: make(map[string]Handler),
	}
}

func (r *Router) Register(topic string, handler Handler) {
	r.handlers[topic] = handler
}

func (r *Router) Route(ctx context.Context, topic string, key []byte, message []byte) error {
	handler, ok := r.handlers[topic]
	if !ok {
		return fmt.Errorf("no handler registered for this topic: %s", topic)
	}

	return handler.Handle(ctx, key, message)
}
