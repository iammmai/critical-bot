const MongoClient = require("mongodb").MongoClient;

// connect database
const client = new MongoClient(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

module.exports = {
  run: async () => {
    try {
      // Connect the client to the server
      await client.connect();
      // Establish and verify connection
      await client.db().command({ ping: 1 });
      console.log("Connected successfully to server");
    } catch {
      console.error("Error connecting to MongoDB");
    }
  },
  createChat: async (newChat) => {
    const result = await client
      .db("criticalBot")
      .collection("chats")
      .insertOne(newChat);
    console.log(`New chat joined with id ${result._id}`);
  },
  getRandomQuestion: async () => {
    return await client
      .db("criticalBot")
      .collection("questions")
      .aggregate([{ $sample: { size: 1 } }])
      .toArray();
  },
};
