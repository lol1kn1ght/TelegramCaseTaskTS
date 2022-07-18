import { Bot, Context } from 'grammy';
import { token , mongo as mongo_config } from './config/constants.json';
import { MongoClient } from 'mongodb';
import { question_data_type, answer_type } from './types';


let url: string | undefined;
const { auth, user, pass, ip, port, db } = mongo_config;
if (auth) url = `mongodb://${user}:${pass}@${ip}:${port}/${db}`;
else url = 'mongodb://localhost:27017';

const mongo = new MongoClient(url);
(async () => {
  await mongo.connect();
  console.log('Бд коннектнута');

  const client = new Bot(token);
  const db = mongo.db('questions');
  const questions_collection = db.collection('list');

  const questions = [
    'кто',
    'что',
    'какой',
    'чей',
    'который',
    'сколько',
    'когда',
    'где',
    'куда',
    'как',
    'откуда',
    'почему',
    'зачем',
  ];
  const word_ends = ['?', '.', '!'];

  function get_question(content: string) {
    const words_arr = content.split(' ');
    let is_question = false;
    const result_question: string[] = [];

    for (const word of words_arr) {
      if (questions.includes(word.toLocaleLowerCase()) && !is_question)
        is_question = true;

      if (word_ends.includes(word[word.length - 1]) && is_question) {
        const edited_word = word
          .split('')
          .filter((char) => !word_ends.includes(char))
          .join('');

        result_question.push(edited_word.toLowerCase());
        return result_question;
      }
      if (is_question) result_question.push(word.toLowerCase());
    }

    if (is_question) return result_question;
    else return is_question;
  }

  async function get_data(search_filter: Partial<question_data_type>) {
    const question_data =
      await questions_collection.findOne<question_data_type>(search_filter);

    return question_data;
  }

  async function check_reply(message: Context) {
    const replied_message = message.message;
    const message_content = message.message?.text;
    console.log(replied_message);

    if (!replied_message || !message_content) return;
    const replied_question = await get_data({
      chat_id: replied_message.chat.id,
      message_id: replied_message.message_id,
    });
    if (!replied_question) return;

    replied_question.answers.push({
      content: message_content,
      rating: 0,
    });
    if (!replied_question.answered) replied_question.answered = true;

    questions_collection.updateOne(
      {
        chat_id: replied_message.chat.id,
        message_id: replied_message.message_id,
      },
      {
        $set: {
          answers: replied_question.answers,
          answered: replied_question.answered,
        },
      }
    );
    message.reply('Записал ваш ответ на вопрос!');
  }

  client.on('message', async (message) => {
    const replied_message = message.update.message.reply_to_message;
    const message_content = message.update.message.text;
    if (!message_content) return;

    (() => {
      if (replied_message) return;
      const message_question = get_question(message_content);
      console.log(message_question);

      if (message_question) {
        const question: question_data_type = {
          answered: false,
          answers: [],
          message_id: message.update.message.message_id,
          question: message_question.join(' '),
          chat_id: message.update.message.chat.id,
        };

        questions_collection.insertOne(question);
        message.reply('Ваш вопрос принят');
        return;
      }
    })();
  });

  client.start();
  console.log('Бот авторизован');
})();
