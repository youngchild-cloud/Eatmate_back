//토큰 검증을 위한 인증 미들웨어

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config/jwt');


const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ message: '토큰없음' });
  }

  const token = auth.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: '토큰 만료 또는 위조' });
  }
}

module.exports = authMiddleware;
