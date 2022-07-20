import { Db } from 'mongodb';
import {
  CallbackQuery,
  InlineKeyboardButton,
  Message,
  SendMessageOptions,
} from 'node-telegram-bot-api';
import { client, messages_list } from './Main';
import {
  question_data_type,
  message_id_type,
  messages_list_type,
} from './types';

export class buttons {
  client = client;
  messages_list = messages_list;
  db: Db | undefined;

  constructor() {
    this.bind_events();
  }

  setup(db: Db) {
    this.db = db;
  }

  async bind_events() {
    client.on('callback_query', (callback) => {
      const chat_id = callback.message?.chat.id;
      const from = callback.from;
      if (!from) return;
      const user_id = from.id;

      if (!chat_id || !user_id) return;

      const callback_data = callback.data;
      if (!callback_data) return;

      const parsed_data = callback_data.split('_');
      const parsed_ids = parsed_data.map((elem) => Number(elem));

      if (parsed_ids.length != 3) return;

      const awaited_info = messages_list[chat_id][user_id];

      if (!awaited_info) {
        client.editMessageReplyMarkup({
          inline_keyboard: [],
        });

        return;
      }

      this.update_rating({
        answer_position: parsed_ids[2],
        message: awaited_info.message,
        question_data: awaited_info.question_data,
        callback,
      });
    });

    // setInterval(() => {

    // }, 15000);
  }

  async update_rating(data: {
    question_data: question_data_type;
    answer_position: number;
    message: Message;
    callback: CallbackQuery;
  }) {
    const { answer_position, message, question_data, callback } = data;

    const { answers } = question_data;
    const current_answer = answers[answer_position];

    if (!current_answer) return;
    ++current_answer.rating;
    answers[answer_position] = current_answer;

    const questions_collection = this.db?.collection('list');

    questions_collection?.updateOne(
      {
        question: question_data.question,
      },
      {
        $set: {
          answers,
        },
      }
    );

    client.sendMessage(
      message.chat.id,
      `@${callback.from.username}, Спасибо, что оценили ответ! Ваша оценка поможет другим участникам найти наиболее подходящий для них ответ`,
      {
        reply_to_message_id: message.message_id,
      }
    );

    client.editMessageReplyMarkup(
      {
        inline_keyboard: [],
      },
      {
        message_id: message.message_id,
        chat_id: message.chat.id,
      }
    );
  }

  check_expired_messages() {
    const messages_chats_ids = Object.keys(this.messages_list);
    const expired_messages: message_id_type[] = [];

    for (const chat_string_id of messages_chats_ids) {
      const chat_id = Number(chat_string_id);
      const current_chat =
        this.messages_list[chat_id as keyof messages_list_type];
      const current_messages = Object.values(current_chat);
      const expired = current_messages.filter(
        (message_data) => message_data.till < new Date().getTime()
      );

      expired_messages.concat(expired);
    }

    expired_messages;
  }

  async send_buttons(data: {
    message: Message;
    question_data: question_data_type;
    content: string;
    buttons: InlineKeyboardButton[][];
    options?: SendMessageOptions;
    time?: number;
  }) {
    const {
      buttons,
      content,
      message,
      options = {},
      question_data,
      time = 180000,
    } = data;

    const buttons_message = await client.sendMessage(message.chat.id, content, {
      ...options,
      reply_markup: {
        inline_keyboard: buttons,
      },
      reply_to_message_id: message.message_id,
    });
    if (!message.from) return;
    if (!messages_list[message.chat.id]) messages_list[message.chat.id] = {};
    messages_list[message.chat.id][message.from?.id] = {
      question_data,
      till: new Date().getTime() + time,
      message: buttons_message,
    };
  }
}
