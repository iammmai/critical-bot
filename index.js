const { Telegraf } = require("telegraf");
const dotenv = require("dotenv").config();
const mockQuestion = require("./questions.json");
const cron = require("node-cron");
const db = require("./database");

const bot = new Telegraf(process.env.BOT_TOKEN);

const sendQuiz = ({ ctx, question, chatId }) => {
  if (chatId) {
    return bot.telegram.sendQuiz(chatId, question.title, question.options, {
      allows_multiple_answers: true,
      correct_option_id: question.correct_options_idx[0],
      explanation: question.explanationTextFalse,
    });
  }
  return ctx.replyWithQuiz(question.title, question.options, {
    allows_multiple_answers: true,
    correct_option_id: question.correct_options_idx[0],
    explanation: question.explanationTextFalse,
  });
};

bot.command("quit", (ctx) => {
  // Using context shortcut
  ctx.leaveChat();
  //TODO: remove chat from active chat collection
});

bot.start((ctx) =>
  ctx
    .reply(
      "Hi there! I am the critical bot. I will test your knowledge everyday. You can also type /ask to receive a question."
    )
    .then((msg) => {
      // saves chatId to databse
      db.createChat({
        chatId: msg.chat.id,
        userName: msg.chat.username,
        firstName: msg.chat.first_name,
        lastName: msg.chat.last_name,
      });
    })
);

bot.command("ask", async (ctx) => {
  const [question, _] = await db.getRandomQuestion();
  sendQuiz({ ctx, question });
});

// connect to DB
db.run()
  .catch((err) => console.log(err))
  .then(async () => {
    bot.launch();
    // schedule cron job to send out questions everyday at 9
    //TODO: maybe the job should be scheduled based on the users timezone
    cron.schedule("*/5 * * * * *", async () => {
      const chats = db.getAllChats();
      const [question, _] = await db.getRandomQuestion();
      await chats.forEach((chat) => {
        sendQuiz({ chatId: chat.chatId, question });
      });
    });
  });

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
