const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const xmlparser = require('express-xml-bodyparser');
const auth = require('./auth');
const controller = require('./controller');

const logger = morgan('[:date[iso]] :method :url :status :res[content-length] :response-time ms');

const app = express();
app.use(cors());
app.use(xmlparser(controller.xmlParseOpt));
app.use(bodyParser.raw());
app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger);

app.get('/api/json', async (req, res) => {
  auth.wechat_auth(req, res);
});

app.post('/api/json', controller.apiParse);

const port = process.env.PORT || 80;

async function bootstrap() {
  app.listen(port, () => {
    console.log('启动成功', port);
  });
}

bootstrap();
