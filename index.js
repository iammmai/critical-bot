const { Telegraf, Markup } = require("telegraf");
const dotenv = require("dotenv").config();
const cron = require("node-cron");
const db = require("./database");
const express = require("express");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.telegram.setWebhook(`${process.env.URL}/secret`);
const app = express();

app.use(bot.webhookCallback(`/secret`));
app.listen(3000, () => {
  console.log(`Example app listening on port 3000!`);
});

const sendQuiz = async ({ ctx, question, chatId }) => {
  const extra = {
    allows_multiple_answers: true,
    correct_option_id: question.correct_options_idx[0],
    is_anonymous: false,
    type: "quiz",
  };
  if (chatId) {
    return await bot.telegram.sendQuiz(
      chatId,
      question.title,
      question.options,
      extra
    );
  }
  return await ctx.replyWithQuiz(question.title, question.options, extra);
};

bot.help((ctx) => {
  ctx.reply(
    "/start to launch the bot\n" +
      "/ask to receive a mc question\n" +
      "/quit to stop the bot from sending questions\n" +
      "/feedback to send us feedback"
    //todo open questions
  );
});

bot.command("feedback", (ctx) => {
  db.saveFeedback(ctx);
  ctx.reply("Thanks for your feedback!🎉");
});

bot.command("quit", (ctx) => {
  db.removeChat(ctx.chat.id);
  ctx.reply("Sad to see you go!😢");
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
  const quiz = await sendQuiz({ ctx, question });
  try {
    // saves a mapping between Telegram pollId and our questions, so that we can send the explanationText later
    db.createQuiz(quiz.poll.id, question);
  } catch (error) {
    console.log(error);
  }
});

bot.on("poll_answer", async (msg) => {
  const quiz = await db.getQuizForPoll(msg.update.poll_answer.poll_id);
  quiz &&
    bot.telegram.sendMessage(
      msg.update.poll_answer.user.id,
      quiz.explanationText
    );
});

// connect to DB
db.connect()
  .catch((err) => console.log(err))
  .then(async () => {
    bot.launch();
    // schedule cron job to send out questions everyday at 9
    //TODO: maybe the job should be scheduled based on the users timezone
    cron.schedule("0 9 * * *", async () => {
      const chats = db.getAllChats();
      const [question, _] = await db.getRandomQuestion();
      await chats.forEach((chat) => {
        const quiz = sendQuiz({ chatId: chat.chatId, question });
        try {
          db.createQuiz(quiz.poll.id, question);
        } catch (error) {
          console.log(error);
        }
      });
    });
  });

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
