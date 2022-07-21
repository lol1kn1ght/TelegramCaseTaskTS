import Bot, { Message } from 'node-telegram-bot-api';
import { token, mongo as mongo_config } from './config/constants.json';
import { MongoClient } from 'mongodb';
import { mongo_url_type, messages_list_type } from './types';
import { questions_manager } from './questions';
import { buttons } from './buttons';

export const client = new Bot(token);
export const messages_list: messages_list_type = {};
export const buttons_manager = new buttons();

class bot_builder {
  mongo = new MongoClient(this.get_mongo_connection_url().url);
  client = client;
  questions_manager = new questions_manager(this.mongo.db('questions'));
  Buttons = buttons_manager;

  constructor() {
    this.start();
  }

  async start() {
    await this.connect_mongo();
    this.Buttons.setup(this.mongo.db('questions'));
    await this.bind_event();

    await this.login();
  }

  async connect_mongo() {
    await this.mongo.connect();
    console.log('Бд коннектнута');
  }

  login() {
    this.client.startPolling();
    console.log('Бот авторизован');
  }

  bind_event() {
    this.client.on('message', async (ctx) => {
      this.questions_manager.check_message(ctx);
    });
  }

  private get_mongo_connection_url(): mongo_url_type {
    if (mongo_config.auth) {
      const { user, pass, ip, port, db } = mongo_config;
      const url = `mongodb://${user}:${pass}@${ip}:${port}/${db}`;
      return { url, db, ip, pass, port };
    } else {
      const url = 'mongodb://localhost:27017';
      return { url, db: 'questions', ip: 'localhost', pass: '', port: 27017 };
    }
  }
}

new bot_builder();
