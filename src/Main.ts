import { Bot } from 'grammy';
import { token } from './config/constants.json';
import { MongoClient } from 'mongodb';

const mongo = new MongoClient('mongodb://localhost:27017');
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

  function is_question(content: string) {
    const words_arr = content.split(' ');

    for (const word of words_arr) {
      if (questions.includes(word.toLocaleLowerCase())) return true;
    }
    return false;
  }

  client.on('message', (message) => {
    if (!message.update.message.text) return;
    if (is_question(message.update.message.text)) {
      questions_collection.insertOne({
        question: message.update.message.text,
        answer: false,
      });
      message.reply('Ваш вопрос принят');
      return;
    }

    message.reply('Это не вопрос');
  });

  client.start();
  console.log('Бот авторизован');
})();
