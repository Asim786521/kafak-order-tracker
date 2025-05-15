const { Kafka } = require('kafkajs');
const redisClient = require('../redis/client');


console.log('Kafka broker:', process.env.KAFKA_SERVER);

const kafka = new Kafka({
  clientId: 'order-consumer',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'], // make sure KAFKA_BROKER is set correctly
});

const consumer = kafka.consumer({ groupId: 'consumer_group' });

const consumeOrder = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'order', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const order = JSON.parse(message.value.toString());
        const redisKey = `order:${order.orderId}`;

        try {
          console.log(`Consuming order ${order.orderId}...`);

          // Simulate order processing delay
          await new Promise(resolve => setTimeout(resolve, 1000));

          await redisClient.set(redisKey, 'completed');
          console.log(`✅ Order ${order.orderId} marked as completed.`);
        } catch (err) {
          console.error(`❌ Error processing order ${order.orderId}:`, err);
          await redisClient.set(redisKey, 'failed');
        }
      }
    });

    console.log('Kafka consumer is running...');
  } catch (err) {
    console.error('❌ Failed to start Kafka consumer:', err);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Gracefully shutting down Kafka consumer...');
    await consumer.disconnect();
    process.exit(0);
  });
};

module.exports = {
  consumeOrder,
};
