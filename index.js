const express = require('express');
require('dotenv').config();
const app = express(); // ❌ You had `express('')` which is incorrect.

const orderRoutes = require('./src/routes/order.js');
const trackRoutes = require('./src/routes/track.js');

const { consumeOrder } = require('./src/consumer/orderConsumer.js');

app.use(express.json());
app.use('/', orderRoutes);
app.use('/track', trackRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Start Kafka consumer
consumeOrder();
