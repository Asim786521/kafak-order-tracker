const { Kafka, Partitioners } = require("kafkajs");

const kafka = new Kafka({
  clientId: "order_app",
  brokers: [process.env.KAFKA_SERVER || 'kafka:9092'],
  // Add connection timeout and retry configuration
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
      await producer.connect();
      producerConnected = true;
    }

    const retries = 5;
    let attempts = 0;
    let success = false;

    while (attempts < retries && !success) {
      try {
        await producer.send({
          topic: "order",
          messages: [{ value: JSON.stringify(order) }],
        });
        success = true;
        console.log("Order event sent successfully!");
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} failed: ${error.message}`);
        if (attempts < retries) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    }

    if (!success) {
      console.error(`Failed to send order after ${retries} attempts.`);
    }
  } catch (error) {
    console.error(`Error connecting to Kafka or sending order event: ${error.message}`);
  }
};

process.on("exit", async () => {
  if (producerConnected) {
    await producer.disconnect();
  }
});

module.exports = {
  sendOrderEvent,
};
