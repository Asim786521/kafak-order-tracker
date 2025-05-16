const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { sendOrderEvent } = require('../producer/orderProducer');
const redisClient = require('../redis/client'); 
const { kafka } = require('../producer/orderProducer'); // Add this line

router.post('/order', async (req, res) => {
  try {
    const orderId = `ORDER_${uuidv4()}`;
    const order = { ...req.body, orderId, status: 'queued' };

    console.log(`[Kafka] Sending order to Kafka: ${JSON.stringify(order)}`);
    await sendOrderEvent(order);
    console.log(`[Kafka] Order sent to Kafka successfully: ${orderId}`);

    // Store in Redis and verify
    const redisKey = `order:${orderId}`;
    console.log(`[Redis] Storing order status in Redis with key: ${redisKey}`);
    await redisClient.set(redisKey, 'queued');
    
    // Verify Redis storage
    const storedValue = await redisClient.get(redisKey);
    console.log(`[Redis] Verified Redis storage: ${redisKey} = ${storedValue}`);

    res.status(201).json({ message: 'Order received', orderId });
  } catch (error) {
    console.error('Error in /order route:', error);
    res.status(500).json({ message: 'Error processing order', error: error.message });
  }
});

// Add a route to check Redis values
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const redisKey = `order:${orderId}`;
    const status = await redisClient.get(redisKey);
    
    if (status) {
      res.status(200).json({ orderId, status });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error('Error retrieving order:', error);
    res.status(500).json({ message: 'Error retrieving order', error: error.message });
  }
});

// Add this route after your existing routes
router.get('/kafka-status', async (req, res) => {
  try {
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    await admin.disconnect();
    
    res.status(200).json({ 
      status: 'connected', 
      topics,
      broker: process.env.KAFKA_SERVER || 'kafka:9092'
    });
  } catch (error) {
    console.error('Kafka connection error:', error);
    res.status(500).json({ 
      status: 'disconnected', 
      error: error.message,
      broker: process.env.KAFKA_SERVER || 'kafka:9092'
    });
  }
});

module.exports = router;