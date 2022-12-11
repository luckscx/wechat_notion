const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const notion = require("./notion.js");
const bodyParser = require('body-parser')

const logger = morgan("tiny");

const app = express();
app.use(cors());
app.use(bodyParser.raw())
app.use(bodyParser.json({}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(logger);

const replyText = (res, FromUserName, ToUserName, CreateTime, text) => {
  const now = Math.floor(Date.now() / 1000);
  const jsonObj = {
    ToUserName: FromUserName,
    FromUserName: ToUserName,
    CreateTime: CreateTime,
    MsgType: "text",
    Content: text,
  }
  console.log(jsonObj);
  res.send(jsonObj);
};

app.post("/api/json", async (req, res) => {
  console.log('消息推送', req.body)
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body
  if (MsgType === 'text') {
    if (FromUserName != "onrgDwNm0HiyRX8mEoC0AJHy2w6w") {
      replyText(res, FromUserName, ToUserName, CreateTime, "可惜不是来自Grissom主人的指令呢");
      return
    }
    if (Content === '1111') {
      res.send({
        ToUserName: FromUserName,
        FromUserName: ToUserName,
        CreateTime: CreateTime,
        MsgType: "text",
        Content: "2222",
      })
      return
    } else {
      const ret_text = await notion.parseText(Content)
      console.log(ret_text);
      replyText(res, FromUserName, ToUserName, CreateTime, ret_text);
      return
    }
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
