import Bot from 'node-telegram-bot-api';
import { token, mongo as mongo_config } from './config/constants.json';
import { MongoClient } from 'mongodb';
import { mongo_url_type } from './types';
import { questions_manager } from './questions';

export const client = new Bot(token);

class bot_builder {
  mongo = new MongoClient(this.get_mongo_connection_url().url);
  client = client;
  questions_manager = new questions_manager(this.mongo.db('questions'));

  constructor() {
    this.start();
  }

  async start() {
    await this.connect_mongo();
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
    this.client.onText(/\\test/, (ctx) => {
      console.log('cmd');
    });

    this.client.on('message', (ctx) => {
      console.log('Новое сообщение');

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
      return { url, db: 'gtaEZ', ip: 'localhost', pass: '', port: 27017 };
    }
  }
}

new bot_builder();
