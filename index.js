const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const notion = require("./notion.js");
const bodyParser = require('body-parser')
const auth = require("./auth.js")
const xmlparser = require('express-xml-bodyparser');
const xml2js = require('xml2js');


const logger = morgan("tiny");

const app = express();
app.use(cors());
app.use(xmlparser({normalizeTags : false, explicitArray: false, explicitRoot : false}))
app.use(bodyParser.raw())
app.use(bodyParser.json({}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(logger);

const replyText = (res, FromUserName, ToUserName, CreateTime, text) => {
  const jsonObj = {
    ToUserName: FromUserName,
    FromUserName: ToUserName,
    CreateTime: CreateTime,
    MsgType: "text",
    Content: text,
  }
  var builder = new xml2js.Builder({explicitRoot : false, rootName : "xml"});
  var xml = builder.buildObject(jsonObj);
  res.send(xml);
};

app.get("/api/json", async (req, res) => {
  auth.wechat_auth(req,res)
});

app.post("/api/json", async (req, res) => {
  console.log("InBody", req.body);
  let { ToUserName, FromUserName, MsgType, Content, CreateTime, Recognition } = req.body
  if (MsgType === 'text' || MsgType === 'voice') {
    if (FromUserName != "onrgDwNm0HiyRX8mEoC0AJHy2w6w") {
      replyText(res, FromUserName, ToUserName, CreateTime, "可惜不是来自Grissom主人的指令呢");
      return
    }
    if (MsgType === 'voice') {
      Content = Recognition
    }
    const ret_text = await notion.parseText(Content)
    replyText(res, FromUserName, ToUserName, CreateTime, ret_text);
    return
  } else {
    // for 接口配置测试
    res.send('success')
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
