import { Message } from 'node-telegram-bot-api';

export type question_data_type = {
  question: string;
  answers: answer_type[];
  answered: boolean;
  chat_id: number;
  message_id: number;
};

export type answer_type = {
  content: string;
  rating: number;
  chat_id: number;
};

export type mongo_url_type = {
  url: string;
  db: string;
  ip: string;
  pass: string;
  port: number;
};

export type awaiter_filter = (message: Message) => boolean;

export type message_id_type = {
  [user_id: number]: {
    till: number;
    question_data: question_data_type;
    message: Message;
  };
};

export type messages_list_type = {
  [channel_id: number]: message_id_type;
};
