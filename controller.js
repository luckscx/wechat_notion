const xml2js = require('xml2js');
const auth = require('./auth');
const notion = require('./notion');
const cfg = require('./config');

const xmlParseOpt = { normalizeTags: false, explicitArray: false, explicitRoot: false };

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

const apiParse = async (req, res) => {
  let inBody = req.body;
  if (cfg.enableCrypto) {
    let d = auth.decrypt(inBody.Encrypt);
    d = await xml2js.parseStringPromise(d.message, xmlParseOpt);
    inBody = d;
  }
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
    res.send('');
  }
};

module.exports = { apiParse, xmlParseOpt };
