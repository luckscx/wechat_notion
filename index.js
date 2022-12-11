const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const notion = require("./notion.js");
const convert = require('xml-js');

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(logger);

const replyText = (res, FromUserName, ToUserName, text) => {
  const now = Math.floor(Date.now() / 1000);
  const jsonObj = {
    ToUserName: FromUserName,
    FromUserName: ToUserName,
    CreateTime: now,
    MsgType: "text",
    Content: text,
  }
  var options = {compact: true, ignoreComment: true, spaces: 0};
  const xmlObj = convert.json2xml(jsonObj, options)
  res.send(xmlObj);
};

app.post("/api/text", async (req, res) => {
  console.log("Get PostBody", req.body);
  const { ToUserName, FromUserName, MsgType, Content} = req.body;
  if (FromUserName != "onrgDwNm0HiyRX8mEoC0AJHy2w6w") {
    replyText(res, FromUserName, ToUserName, "可惜不是来自Grissom主人的指令呢");
    return
  }
  if (MsgType === "text") {
    const ret_text = await notion.parseText(Content);
    replyText(res, FromUserName, ToUserName, ret_text);
  } else {
    res.send("success");
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
