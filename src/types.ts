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
