import { Message } from 'node-telegram-bot-api';
import { client } from './Main';
import { Db } from 'mongodb';
import { question_data_type } from './types';

export class questions_manager {
  private messages_awaiter: {
    [k: number]: number;
  } = {};
  private message: Message | undefined;
  constructor(private db: Db) {}

  async check_message(message: Message) {
    const questions_collection = this.db.collection('list');
    if (!message) return;
    this.message = message;
    const replied_message = message.reply_to_message;
    if (!message.text) return;
    const question = this.get_question(message.text);

    if (question && !replied_message) {
      const question_data = await this.get_data({
        question: question.toLowerCase(),
      });
      if (!question_data) {
        this.write_question(message);
        return;
      }

      this.get_answers(question_data);
      return;
    }

    if (replied_message) {
      const replied_question = this.get_question(replied_message.text!);
      const question_data =
        await questions_collection.findOne<question_data_type>({
          $or: [
            {
              message_id: replied_message.message_id,
              chat_id: replied_message.chat.id,
            },
            {
              question: replied_question?.toLowerCase(),
            },
          ],
        });

      if (!question_data) return;
      await this.write_answer(message, question_data); // бот лох!
      return;
    }
  }

  async write_question(message: Message) {
    if (!message || !message.text) return;
    const question = this.get_question(message.text); //скатина
    if (!question) return;
    const questions_collection = this.db.collection('list'); //работай!
    const question_data: question_data_type = {
      //пидор
      answered: false,
      answers: [],
      chat_id: message.chat.id,
      message_id: message.message_id,
      question: question.toLowerCase(),
    };
    questions_collection.insertOne(question_data);
    client.sendMessage(
      message.chat.id,
      'Ваш вопрос успешно записан в базу данных'
    );
  }

  get_question(content: string): string | undefined {
    let is_question = false;
    const content_arr = content.split(' ');
    const result_question = [];
    const anchor_words = [
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

    for (const word of content_arr) {
      if (anchor_words.includes(word)) is_question = true;

      if (is_question) {
        const edited_word = word.replace(/(\?|!|\.|,)/gi, '');
        result_question.push(edited_word);
        if (word_ends.includes(word[word.length - 1])) break;
      }
    }

    return result_question[0] ? result_question.join(' ') : undefined;
  }

  async get_answers(question_data: question_data_type) {
    if (!this.message) return;
    const { answers } = question_data;

    if (!answers[0]) {
      client?.sendMessage(
        this.message.chat.id,
        'На этот вопрос еще не было ответов, подождите пока кто-то ответит на него :('
      );
      return;
    }

    let answers_content = '';

    for (const answer of answers) {
      answers_content += `Ответ: ${answer.content}\nПопулярность: ${answer.rating}\n\n`;
    }

    console.log(answers_content);
    client.sendMessage(this.message.chat.id, answers_content);
  }

  async write_answer(message: Message, question_data: question_data_type) {
    if (!this.message) return;
    const replied_message = message.reply_to_message;
    if (!replied_message || !message.text) return;
    const questions_collection = this.db.collection('list');

    const same_answer = question_data.answers.filter(
      (answer) => answer.content.toLowerCase() === message.text?.toLowerCase()
    )[0];

    if (!same_answer)
      question_data.answers.push({
        content: message.text,
        rating: 0,
        chat_id: message.chat.id,
      });
    question_data.answered = true;
    await questions_collection.updateOne(
      {
        $or: [
          {
            message_id: replied_message.message_id,
            chat_id: replied_message.chat.id,
          },
          {
            question: question_data.question,
          },
        ],
      },
      {
        $set: {
          answers: question_data.answers,
          answered: question_data.answered,
        },
      }
    );
    client.sendMessage(
      this.message?.chat.id,
      'Спасибо, что ответили на этот вопрос! Я записал ваш ответ и в будущем буду использовать его как вариант для ответа на этот вопрос'
    );
  }

  async get_data(filter_data: Partial<question_data_type>) {
    const questions_collection = this.db.collection('list');
    const question_data =
      await questions_collection.findOne<question_data_type>(filter_data);
    return question_data;
  }

  async write_data(
    filter: Partial<question_data_type>,
    data: Partial<question_data_type>
  ) {
    const questions_collection = this.db.collection('list');

    questions_collection.updateOne(filter, {
      $set: data,
    });
  }
}
