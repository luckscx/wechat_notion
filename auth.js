const WXCrypto = require('./msg_crypto');
const config = require('./config');

const wxCrypto = new WXCrypto(config.token, config.secret, config.appid);

const encrypt = (text) => wxCrypto.encrypt(text);

const decrypt = (text) => wxCrypto.decrypt(text);

const getSignature = (timestamp, nonce, decryptData) => wxCrypto.getSignature(timestamp, nonce, decryptData);

const wechat_auth = (req, res) => {
  const { token } = config; // 获取配置的token
  const { signature } = req.query; // 获取微信发送请求参数signature
  const { nonce } = req.query; // 获取微信发送请求参数nonce
  const { timestamp } = req.query; // 获取微信发送请求参数timestamp

  const sha = getSignature(timestamp, nonce, token);

  // 如果加密组合结果等于微信的请求参数signature，验证通过
  if (sha === signature) {
    const { echostr } = req.query; // 获取微信请求参数echostr
    res.send(`${echostr}`); // 正常返回请求参数echostr
  } else {
    res.send('验证失败');
  }
};

module.exports = {
  wechat_auth, encrypt, decrypt, getSignature,
};
