const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const notion = require("./notion.js")

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(logger);

app.post("/api/text", async (req, res) => {
  console.log('消息推送', req.body)
  const { ToUserName, FromUserName, MsgType, Content, CreateTime } = req.body
  if (MsgType === 'text') {
    const ret_text = await notion.parseText(Content)
    res.send({
      ToUserName: FromUserName,
      FromUserName: ToUserName,
      CreateTime: CreateTime,
      MsgType: 'text',
      Content: ret_text
    })
  } else {
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
