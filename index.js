const { Telegraf, Markup } = require("telegraf");
const dotenv = require("dotenv").config();
const cron = require("node-cron");
const db = require("./database");
const express = require("express");

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.telegram.setWebhook(`${process.env.URL}/`, {
  allowed_updates: ["poll_answer"],
  max_connections: 40,
});
const app = express();

app.use(bot.webhookCallback(`/${process.env.WEBHOOK_TOKEN}`));
app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}!`);
});

const sendQuiz = async ({ ctx, question, chatId }) => {
  const extra = {
    allows_multiple_answers: false,
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
      "/quit to stop the bot from sending questions\n" +
      "/feedback to send us feedback\n" +
      "/question to get an open question"
  );
});

bot.command("feedback", (ctx) => {
  db.saveFeedback(ctx);
  ctx.reply("Thanks for your feedback!🎉");
});

bot.command("question", async (ctx) => {
  let questionObj = await db.getRandomOpenQuestion();
  ctx.reply(questionObj[0].title);
});

bot.command("quit", (ctx) => {
  db.removeChat(ctx.chat.id);
  ctx.reply("Sad to see you go!😢");
});

bot.start((ctx) =>
  bot.telegram
    .sendMessage(
      ctx.chat.id,
      "Hi " +
        ctx.chat.username +
        "\\! I am the critical bot\\. I will send you everyday *at 9 am UTC one multiple choice question*\\. You can also type /question to receive an *open question* and /help for further information\\! I'm developed by students from different backgrounds as a university project\\. If you want to send us *feedback* just write /feedback [your text]",
      { parse_mode: "MarkdownV2" }
    )
    .catch((err) => console.log("Error sending message", err))
    .then((msg) => {
      // saves chatId to databse
      db.createChat({
        chatId: msg.chat.id,
        userName: msg.chat.username,
        firstName: msg.chat.first_name,
        lastName: msg.chat.last_name,
        lastQuestionIndex: -1,
      });
    })
);

// todo comment
// bot.command("ask", async (ctx) => {
//   const [question, _] = await db.getRandomQuestion();
//   const quiz = await sendQuiz({ ctx, question });
//   try {
//     // saves a mapping between Telegram pollId and our questions, so that we can send the explanationText later
//     db.createQuiz({ pollId: quiz.poll.id, question });
//   } catch (error) {
//     console.log(error);
//   }
// });

bot.on("poll_answer", async (msg) => {
  const quiz = await db.getQuizForPoll(msg.update.poll_answer.poll_id);
  quiz &&
    bot.telegram.sendMessage(
      msg.update.poll_answer.user.id,
      quiz.explanationText
    );
  // update poll with the answer
  db.updateQuizAnswer({
    pollId: msg.update.poll_answer.poll_id,
    answer: msg.update.poll_answer.option_ids,
  });
});

// connect to DB
db.connect()
  .catch((err) => console.log(err))
  .then(async () => {
    bot.launch();
    // schedule cron job to send out questions everyday at 9
    cron.schedule("0 9 * * *", async () => {
      const chats = db.getAllChats();
      await chats.forEach(async (chat) => {
        const currentQuestionIdx = chat.lastQuestionIndex;
        let question = await db.getNextQuestion(currentQuestionIdx + 1);
        if (!question) {
          question = await db.getNextQuestion(0);
        }
        try {
          const quiz = await sendQuiz({
            chatId: chat.chatId,
            question,
          });
          db.createQuiz({
            pollId: quiz.poll.id,
            question,
            chatId: chat.chatId,
          });
          db.updateLastQuestionIndex(chat.chatId, question.idx);
        } catch (error) {
          console.log(error);
        }
      });
    });
  })
  .catch((err) => console.log(err));

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
