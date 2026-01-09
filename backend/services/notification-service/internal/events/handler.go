package events

import "context"

type Handler interface {
	Handle(ctx context.Context, key []byte, message []byte) error
}
