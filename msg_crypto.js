const crypto = require('crypto');

/**
 * 提供基于PKCS7算法的加解密接口
 *
 */
const PKCS7Encoder = {};

/**
 * 删除解密后明文的补位字符
 *
 * @param {String} text 解密后的明文
 */
PKCS7Encoder.decode = (text) => {
  let pad = text[text.length - 1];

  if (pad < 1 || pad > 32) {
    pad = 0;
  }

  return text.slice(0, text.length - pad);
};

/**
 * 对需要加密的明文进行填充补位
 *
 * @param {String} text 需要进行填充补位操作的明文
 */
PKCS7Encoder.encode = (text) => {
  const blockSize = 32;
  const textLength = text.length;
  // 计算需要填充的位数
  const amountToPad = blockSize - (textLength % blockSize);

  const result = Buffer.alloc(amountToPad);
  result.fill(amountToPad);

  return Buffer.concat([text, result]);
};

/**
 * 微信企业平台加解密信息构造函数
 *
 * @param {String} token          公众平台上，开发者设置的Token
 * @param {String} encodingAESKey 公众平台上，开发者设置的EncodingAESKey
 * @param {String} id         企业号的CorpId或者AppId
 */
const WXBizMsgCrypt = function WXBizMsgCrypt(token, encodingAESKey, id) {
  if (!token || !encodingAESKey || !id) {
    throw new Error('please check arguments');
  }
  this.token = token;
  this.id = id;
  const AESKey = Buffer.from(`${encodingAESKey}=`, 'base64');
  if (AESKey.length !== 32) {
    throw new Error('encodingAESKey invalid');
  }
  this.key = AESKey;
  this.iv = AESKey.slice(0, 16);
};

/**
 * 获取签名
 *
 * @param {String} timestamp    时间戳
 * @param {String} nonce        随机数
 * @param {String} encrypt      加密后的文本
 */
WXBizMsgCrypt.prototype.getSignature = function getSignature(timestamp, nonce, encrypt) {
  const shasum = crypto.createHash('sha1');
  const arr = [this.token, timestamp, nonce, encrypt].sort();
  shasum.update(arr.join(''));

  return shasum.digest('hex');
};

/**
 * 对密文进行解密
 *
 * @param {String} text 待解密的密文
 */
WXBizMsgCrypt.prototype.decrypt = function decrypt(text) {
  // 创建解密对象，AES采用CBC模式，数据采用PKCS#7填充；IV初始向量大小为16字节，取AESKey前16字节
  const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, this.iv);
  decipher.setAutoPadding(false);
  let deciphered = Buffer.concat([decipher.update(text, 'base64'), decipher.final()]);

  deciphered = PKCS7Encoder.decode(deciphered);
  // 算法：AES_Encrypt[random(16B) + msg_len(4B) + msg + $CorpID]
  // 去除16位随机数
  const content = deciphered.slice(16);
  const length = content.slice(0, 4).readUInt32BE(0);

  return {
    message: content.slice(4, length + 4).toString(),
    id: content.slice(length + 4).toString(),
  };
};

/**
 * 对明文进行加密
 *
 * @param {String} text 待加密的明文
 */
WXBizMsgCrypt.prototype.encrypt = function encrypt(text) {
  // 算法：AES_Encrypt[random(16B) + msg_len(4B) + msg + $CorpID]
  // 获取16B的随机字符串
  const randomString = crypto.pseudoRandomBytes(16);

  const msg = Buffer.from(text);

  // 获取4B的内容长度的网络字节序
  const msgLength = Buffer.alloc(4);
  msgLength.writeUInt32BE(msg.length, 0);

  const id = Buffer.from(this.id);

  const bufMsg = Buffer.concat([randomString, msgLength, msg, id]);

  // 对明文进行补位操作
  const encoded = PKCS7Encoder.encode(bufMsg);

  // 创建加密对象，AES采用CBC模式，数据采用PKCS#7填充；IV初始向量大小为16字节，取AESKey前16字节
  const cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
  cipher.setAutoPadding(false);

  const cipheredMsg = Buffer.concat([cipher.update(encoded), cipher.final()]);

  // 返回加密数据的base64编码
  return cipheredMsg.toString('base64');
};

module.exports = WXBizMsgCrypt;
