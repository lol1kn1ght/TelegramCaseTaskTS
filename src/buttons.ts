import { Db } from 'mongodb';
import {
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

  setup(db: Db) {
    this.db = db;
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

    console.log(expired_messages);
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
