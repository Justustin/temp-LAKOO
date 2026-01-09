package consumer

import (
	"context"
	"fmt"
	"sync"

	// "github.com/segmentio/kafka-go"
	"github.com/Flow-Indo/LAKOO/backend/services/notification-service/config"
	kafkaService "github.com/Flow-Indo/LAKOO/backend/shared/kafka"
	"go.uber.org/zap"
)

type MessageRouter interface {
	Route(ctx context.Context, topic string, key []byte, message []byte) error
}

type Manager struct {
	router    MessageRouter
	wg        sync.WaitGroup
	logger    *zap.Logger
	consumers []*kafkaService.KafkaConsumer
}

func NewManager(router MessageRouter, logger *zap.Logger) *Manager {
	return &Manager{
		router: router,
		logger: logger,
	}
}

func (m *Manager) consume(ctx context.Context, topic string, consumerId string) {
	defer m.wg.Done() //says to parent that my job is done, will be called when this consume exits

	kafka_consumer := kafkaService.NewConsumer(config.Envs.KAFKA_BROKERS, topic, config.Envs.KAFKA_GROUP_ID)
	m.consumers = append(m.consumers, kafka_consumer) //for one worker append its consumer to then close all consumers all at once

	m.logger.Info(
		"Consumer started",
		zap.String("topic", topic),
		zap.String("consumer", consumerId),
	)
	for {
		key, value, err := kafka_consumer.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil { //context was cancelled, should be a clean shutdown, cancel what the worker is doing
				break
			}

			continue
		}

		if err := m.router.Route(ctx, topic, key, value); err != nil {
			m.logger.Error("Failed to route message",
				zap.String("topic", topic),
				zap.String("consumer", consumerId),
				zap.Error(err),
			)
		}
	}
}

func (m *Manager) Run(ctx context.Context, topics []string) {
	consumersPerTopic := 3

	for _, topic := range topics {
		m.logger.Info("Starting consumers for topic",
			zap.String("topic", topic),
			zap.Int("consumers", consumersPerTopic),
		)
		for i := 0; i < consumersPerTopic; i++ {
			m.wg.Add(1)

			go m.consume(ctx, topic, fmt.Sprintf("%s-consumer-%d", topic, i))
		}
	}
}

func (m *Manager) Shutdown() {
	m.logger.Info("shutting down consumer manager")

	for _, r := range m.consumers {
		if err := r.Close(); err != nil {
			m.logger.Error("failed to close kafka reader", zap.Error(err))
		}
	}

	m.wg.Wait() //waits for all go routines to call Done()
	m.logger.Info("all workers have shut down")
}
