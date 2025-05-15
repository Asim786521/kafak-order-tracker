const express = require("express");
const router = express.Router();

 
 
const redisClient = require("../redis/client");

router.get("/:id", async (req, res) => {
  try {
    const status = await redisClient.get(`order:${req.params.id}`);

    if (!status) {
      return res.status(400).json({ message: "order not found" });
    }
    return res.json({ orderID: req.params.id, status });
  } catch (err) {
   return res.status(500).json({ message: "redis issuw found" });
  }
});

module.exports = router;
