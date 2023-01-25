const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const xmlparser = require('express-xml-bodyparser');
const xml2js = require('xml2js');
const auth = require('./auth');
const notion = require('./notion');
const cfg = require('./config');

const logger = morgan('tiny');

const xmlParseOpt = { normalizeTags: false, explicitArray: false, explicitRoot: false };

const app = express();
app.use(cors());
app.use(xmlparser(xmlParseOpt));
app.use(bodyParser.raw());
app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger);

const replyText = (res, FromUserName, ToUserName, CreateTime, text) => {
  let jsonObj = {
    ToUserName: FromUserName,
    FromUserName: ToUserName,
    CreateTime,
    MsgType: 'text',
    Content: text,
  };
  const builder = new xml2js.Builder({ explicitRoot: false, rootName: 'xml' });
  let xml = builder.buildObject(jsonObj);
  if (cfg.enableCrypto) {
    const encryptData = auth.encrypt(xml);
    const nonce = '123';
    const signature = auth.getSignature(CreateTime, nonce, encryptData);
    jsonObj = {
      Encrypt: encryptData,
      MsgSignature: signature,
      TimeStamp: CreateTime,
      Nonce: nonce,
    };
    xml = builder.buildObject(jsonObj);
  }
  res.send(xml);
};

app.get('/api/json', async (req, res) => {
  auth.wechat_auth(req, res);
});

app.post('/api/json', async (req, res) => {
  let inBody = req.body;
  if (cfg.enableCrypto) {
    let d = auth.decrypt(req.body.Encrypt);
    console.log(d.message);
    d = await xml2js.parseStringPromise(d.message, xmlParseOpt);
    inBody = d;
  }
  console.log('InBody', inBody);
  const {
    ToUserName, FromUserName, MsgType, CreateTime, Recognition,
  } = inBody;
  let { Content } = inBody;
  if (MsgType === 'text' || MsgType === 'voice') {
    if (FromUserName !== 'onrgDwNm0HiyRX8mEoC0AJHy2w6w') {
      replyText(res, FromUserName, ToUserName, CreateTime, '可惜不是来自Grissom主人的指令呢');
      return;
    }
    if (MsgType === 'voice') {
      Content = Recognition;
    }
    const ret_text = await notion.parseText(Content);
    replyText(res, FromUserName, ToUserName, CreateTime, ret_text);
  } else {
    // for 接口配置测试
    res.send('success');
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  app.listen(port, () => {
    console.log('启动成功', port);
  });
}

bootstrap();
