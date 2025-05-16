const { Kafka, Partitioners } = require("kafkajs");

const kafka = new Kafka({
  clientId: "order_app",
  brokers: ['kafka:9092'],  // Remove process.env and set directly to kafka:9092
  connectionTimeout: 3000,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

let producerConnected = false;

const sendOrderEvent = async (order) => {
  try {
    if (!producerConnected) {
      console.log('[Kafka] Connecting to producer...');
      await producer.connect();
      producerConnected = true;
      console.log('[Kafka] Producer connected successfully');
    }

    const retries = 5;
    let attempts = 0;
    let success = false;
    let lastError = null;

    while (attempts < retries && !success) {
      try {
        await producer.send({
          topic: "order",
          messages: [{ value: JSON.stringify(order) }],
        });
        success = true;
        console.log(`[Kafka] Order ${order.orderId} sent successfully!`);
      } catch (error) {
        attempts++;
        lastError = error;
        console.error(`[Kafka] Attempt ${attempts}/${retries} failed: ${error.message}`);
        if (attempts < retries) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
        }
      }
    }

    if (!success) {
      throw new Error(`Failed to send order after ${retries} attempts. Last error: ${lastError?.message}`);
    }
    
    return success;
  } catch (error) {
    console.error(`[Kafka] Error: ${error.message}`);
    throw error;
  }
};

process.on("exit", async () => {
  if (producerConnected) {
    await producer.disconnect();
  }
});

module.exports = {
  sendOrderEvent,
  kafka
};
