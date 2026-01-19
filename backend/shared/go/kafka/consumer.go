package kafka

import (
	"context"

	"github.com/segmentio/kafka-go"
)

type KafkaConsumer struct {
	reader *kafka.Reader
}

func NewConsumer(brokers []string, topic string, groupId string) *KafkaConsumer {
	return &KafkaConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers: brokers,
			Topic:   topic,
			GroupID: groupId,
		}),
	}
}

func (c *KafkaConsumer) ReadMessage(ctx context.Context) ([]byte, []byte, error) {
	msg, err := c.reader.ReadMessage(ctx) //when ctx is cancelled or times out, this will return an error
	if err != nil {
		return nil, nil, err
	}

	return msg.Key, msg.Value, nil
}

func (c *KafkaConsumer) Close() error {
	return c.reader.Close()
}
