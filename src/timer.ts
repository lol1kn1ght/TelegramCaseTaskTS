import { Message } from 'node-telegram-bot-api';
import { client } from './Main';

type timers_list_type = {
  [time: number]: Message;
};

export const timers_list: timers_list_type = {};

export class timer {
  constructor() {
    setInterval(async () => {
      const times_list = Object.keys(timers_list);

      const expired_messages = times_list.filter((time_str) => {
        const time = new Number(time_str);

        if (new Date().getTime() > time) return true;
        else return false;
      });

      for (const time_str of expired_messages) {
        const message =
          timers_list[new Number(time_str) as keyof typeof timers_list];
        await client.deleteMessage(message.chat.id, '' + message.message_id);

        delete timers_list[new Number(time_str) as keyof typeof timers_list];
      }
    }, 1000);
  }
  delete(message: Message, time: number) {
    timers_list[new Date().getTime() + time] = message;
  }
}
