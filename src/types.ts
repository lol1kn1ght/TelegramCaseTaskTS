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
};
