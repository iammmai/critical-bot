const MongoClient = require("mongodb").MongoClient;

// connect database
const client = new MongoClient(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

module.exports = {
  saveFeedback: (ctx) => {
    client
      .db("criticalBot")
      .collection("feedbacks")
      .insertOne({ message: ctx.message.text, chatID: ctx.chat.id });
  },
  connect: async () => {
    try {
      // Connect the client to the server
      await client.connect();
      // Establish and verify connection
      await client.db().command({ ping: 1 });
      console.log("Connected successfully to server");
    } catch (e) {
      console.error("Error connecting to MongoDB" + e);
    }
  },
  // TODO: maybe this needs to be an upsert
  createChat: (newChat) =>
    client
      .db("criticalBot")
      .collection("chats")
      .updateOne(
        { chatId: newChat.chatId },
        { $set: newChat },
        { upsert: true }
      ),
  getAllChats: () => client.db("criticalBot").collection("chats").find({}),
  removeChat: (chatId) =>
    client.db("criticalBot").collection("chats").deleteOne({ chatId }),
  getRandomQuestion: async () => {
    return await client
      .db("criticalBot")
      .collection("questions")
      .aggregate([{ $sample: { size: 1 } }])
      .toArray();
  },
};
