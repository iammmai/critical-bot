const { Telegraf } = require("telegraf");
const dotenv = require("dotenv").config();
const mockQuestion = require("./questions.json");
const cron = require("node-cron");
const db = require("./database");

// connect to DB
db.run().catch((err) => console.log(err));

const bot = new Telegraf(process.env.BOT_TOKEN);

const sendQuiz = (ctx, question) => {
  ctx.replyWithQuiz(question.title, question.options, {
    allows_multiple_answers: true,
    correct_option_id: question.correct_options_idx[0],
    explanation: question.explanationTextFalse,
  });
};

bot.command("quit", (ctx) => {
  // Using context shortcut
  ctx.leaveChat();
});

bot.start((ctx) =>
  ctx
    .reply(
      "Hi there! I am the critical bot. I will test your knowledge everyday. You can also type /ask to receive a question."
    )
    .then((msg) => {
      // saves chatId to databse so we can send them a question everyday
      db.createChat({
        chatId: msg.chat.id,
        userName: msg.chat.username,
        firstName: msg.chat.first_name,
        lastName: msg.chat.last_name,
      });
      // schedule cron job that sends question everyday at 9
      cron.schedule("0 9 * * *", async () => {
        const [question, _] = await db.getRandomQuestion();
        sendQuiz(ctx, question);
      });
    })
);

bot.command("ask", async (ctx) => {
  const [question, _] = await db.getRandomQuestion();
  sendQuiz(ctx, question);
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
