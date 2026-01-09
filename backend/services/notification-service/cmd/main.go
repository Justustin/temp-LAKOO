package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/Flow-Indo/LAKOO/backend/services/notification-service/config"
	"github.com/Flow-Indo/LAKOO/backend/services/notification-service/internal/client"
	"github.com/Flow-Indo/LAKOO/backend/services/notification-service/internal/consumer"
	"github.com/Flow-Indo/LAKOO/backend/services/notification-service/internal/events"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync() //called when main() exits, prevents losing the last log messages during crash/shutdown

	ctx, cancel := context.WithCancel(context.Background()) //cancel is the function to call when you want to shutdown the entire app
	sigchan := make(chan os.Signal, 1)                      //To listen for shutdown signals from the operating system like ctrl + c
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	//What it does: Tells Go to send specific OS signals to our sigchan
	//SIGINT: Signal Interrupt (Ctrl+C in terminal)
	//SIGTERM: Signal Terminate (kill command, Kubernetes pod shutdown, etc.)
	//Purpose: Catch when someone wants to stop the app

	whatsAppNotifier := client.NewWhatsAppService() //the one that will send messages to whatsapp

	//router: to route different topics to different handlers
	router := events.NewRouter()

	payment_handler := events.NewPaymentHandler(*whatsAppNotifier)
	router.Register("payment_event", payment_handler)
	router.Register("order_event", payment_handler)

	consumer_manager := consumer.NewManager(router, logger)
	consumer_manager.Run(ctx, config.Envs.KAFKA_TOPICS)

	<-sigchan
	logger.Info("shutdown signal received")

	cancel() //signals workers to stop reading new messages, and for handlers take care of data corruption problem

	consumer_manager.Shutdown() //cleans up resources, like closes kafka connections
	logger.Info("service shutdown gracefully")
}

// // NotificationService listens for Kafka events and processes them.
// type NotificationService struct {
// 	consumer *kafka.KafkaConsumer
// }

// // NewNotificationService initializes a new Kafka consumer for notifications.
// func NewNotificationService() *NotificationService {
// 	return &NotificationService{
// 		consumer: kafka.NewConsumer(
// 			[]string{"localhost:9092"}, // Kafka brokers
// 			"notification-events",      // Consumer group ID
// 		),
// 	}
// }

// // Start begins consuming messages and processes them until shutdown.
// func (s *NotificationService) Start(ctx context.Context) {
// 	log.Println("🚀 Notification service started. Listening for events...")

// 	for {
// 		select {
// 		case <-ctx.Done():
// 			log.Println("🛑 Shutting down notification service...")
// 			return

// 		default:
// 			key, value, err := s.consumer.ReadMessage(ctx)
// 			if err != nil {
// 				if err == context.Canceled {
// 					log.Println("Context canceled, stopping consumer...")
// 					return
// 				}
// 				log.Printf("⚠️ Error reading message: %v", err)
// 				continue
// 			}

// 			// Process the message
// 			log.Printf("📩 Received message - Key: %s | Value: %s", key, value)
// 			s.handleEvent(string(key), string(value))
// 		}
// 	}
// }

// // handleEvent processes the event data (you can customize this)
// func (s *NotificationService) handleEvent(key, value string) {
// 	// TODO: implement logic — for now, just print
// 	fmt.Printf("🔔 Handling event [%s]: %s\n", key, value)
// }

// // main starts the service and gracefully shuts it down on SIGINT/SIGTERM.
// func main() {
// 	service := NewNotificationService()

// 	// Handle OS signals for graceful shutdown
// 	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
// 	defer stop()

// 	// Run the consumer
// 	service.Start(ctx)
// }
