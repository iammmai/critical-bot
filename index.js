const { Telegraf } = require("telegraf");
const { createWatchCompilerHost } = require("typescript");
const dotenv = require("dotenv").config();
const question = require("./questions.json");
const cron = require("node-cron");

const bot = new Telegraf(process.env.BOT_TOKEN);

cron.schedule("0 9 * * *", () => {
  // TODO: fetch all users from database and send them questions
});

bot.command("quit", (ctx) => {
  // Using context shortcut
  ctx.leaveChat();
});

bot.start((ctx) =>
  ctx
    .reply("Hi there! I am the critical bot. Type /ask to receive a question.")
    .then((msg) => {
      // TODO: add chatId to a database so we can send them questions everuday
    })
);

bot.command("ask", (ctx) => {
  // TODO: pick a question
  ctx.replyWithQuiz(question.title, question.options, {
    allows_multiple_answers: true,
    correct_option_id: question.correct_options_idx[0],
    explanation: question.explanationTextFalse,
  });
});

// bot.on("inline_query", (ctx) => {
//   const result = [];
//   // Explicit usage
//   ctx.telegram.answerInlineQuery(ctx.inlineQuery.id, result);

//   // Using context shortcut
//   ctx.answerInlineQuery(result);
// });

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
