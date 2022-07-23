import { Message, InlineKeyboardButton } from 'node-telegram-bot-api';
import { client, buttons_manager } from './Main';
import { Db } from 'mongodb';
import { question_data_type } from './types';
import { timer } from './timer';

const timer_deleter = new timer();
export class questions_manager {
  private messages_awaiter: {
    [k: number]: {
      [k: number]: number;
    };
  } = {};
  private message: Message | undefined;
  constructor(private db: Db) {}

  async check_message(message: Message) {
    const questions_collection = this.db.collection('list');
    if (!message) return;
    this.message = message;
    const replied_message = message.reply_to_message;
    if (!message.text) return;
    const question = await this.get_question(message);

    if (question && !replied_message) {
      const question_data = await this.get_data({
        question: question,
      });
      if (!question_data) {
        this.write_question(message);
        return;
      }

      this.get_answers(question_data);
      return;
    }

    if (replied_message) {
      const replied_question = await this.get_question(replied_message);
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
      await this.write_answer(message, question_data);
      return;
    }
  }

  async write_question(message: Message) {
    if (!message || !message.text) return;
    const question = await this.get_question(message);
    if (!question) return;
    const questions_collection = this.db.collection('list');
    const result_question = question.toLowerCase();
    const question_data: question_data_type = {
      //пидор
      answered: false,
      answers: [],
      chat_id: message.chat.id,
      message_id: message.message_id,
      question: result_question,
    };
    questions_collection.insertOne(question_data);
    client.sendMessage(
      message.chat.id,
      'К сожалению у меня нет ответа на этот вопрос, но я записал его в базу данных и буду собирать ответы на него!\n\nДобавить свой ответ на вопрос можно просто свайпнуть сообщение с вопросом влево и написать на него ваш ответ',
      {
        reply_to_message_id: message.message_id,
      }
    );
  }

  async get_question(message: Message): Promise<string | undefined> {
    const content = message.text?.toLowerCase();
    if (!content) return;
    let has_anchor = false;
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

    for (let word of content_arr) {
      word = word.toLowerCase();
      if (anchor_words.includes(word)) has_anchor = true;

      if (has_anchor) {
        const edited_word = word.replace(/(\?|!|\.)/gi, '');
        result_question.push(edited_word);
        if (word_ends.includes(word[word.length - 1])) break;
      }
    }

    if (has_anchor && content.includes('?')) {
      if (!content.startsWith('вопрос')) {
        let merged_question = result_question.join(' ');
        if (merged_question[merged_question.length - 1] != '?')
          merged_question += '?';
        const notif_message = await client.sendMessage(
          message.chat.id,
          `Приветствую! Если вы хотите задать мне вопрос, то напишите ваш вопрос заново, но в начале укажите слово "вопрос". Данное сообщение удалится через 5 минут.\n\n Пример вопроса:\nвопрос ${merged_question}`,
          {
            reply_to_message_id: message.message_id,
          }
        );

        timer_deleter.delete(notif_message, 300000);
        return undefined;
      }

      return result_question[0] ? result_question.join(' ') : undefined;
    }
    return undefined;
  }

  async get_answers(question_data: question_data_type) {
    if (!this.message) return;
    let { answers } = question_data;
    answers = answers.sort((a, b) => b.rating - a.rating);

    if (!answers[0]) {
      client?.sendMessage(
        this.message.chat.id,
        'На этот вопрос еще не было ответов, подождите пока кто-то ответит на него :('
      );
      return;
    }

    let answers_content = '';
    let position = 1;
    const buttons: InlineKeyboardButton[][] = [[]];

    for (const answer of answers) {
      answers_content += `#${position} Ответ: ${answer.content}\nПопулярность: ${answer.rating}\n\n`;

      buttons[0].push({
        text: `Вопрос ${position++}`,
        callback_data: `${this.message.chat.id}_${
          this.message.from?.id
        }_${answers.indexOf(answer)}`,
      });
    }

    answers_content = `На ваш вопрос были найдены такие ответы:\n\n${answers_content}Пожалуйста, оцените наиболее подходящий, на ваш взгляд, ответ через кнопки ниже, чтобы мы смогли улучшить подбор ответов для вас и других людей :)`;

    buttons_manager.send_buttons({
      buttons: buttons,
      content: answers_content,
      message: this.message,
      question_data,
    });
  }

  async write_answer(message: Message, question_data: question_data_type) {
    if (!this.message) return;
    const replied_message = message.reply_to_message;
    if (!replied_message || !message.text) return;
    const questions_collection = this.db.collection('list');

    const same_answer = question_data.answers.filter(
      (answer) => answer.content.toLowerCase() === message.text?.toLowerCase()
    )[0];

    if (same_answer) {
      client.sendMessage(
        message.chat.id,
        'Такой ответ уже существует в базе данных',
        {
          reply_to_message_id: message.message_id,
        }
      );
      return;
    }
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
      'Спасибо, что ответили на этот вопрос! Я записал ваш ответ и в будущем буду использовать его как вариант для ответа на этот вопрос',
      {
        reply_to_message_id: message.message_id,
      }
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

  async await_message(chat_id: number, user_id: number) {
    this.messages_awaiter[chat_id][user_id] = new Date().getTime() + 180000;
  }
}
