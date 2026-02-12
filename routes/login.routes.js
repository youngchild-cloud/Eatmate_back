const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
// const authMiddleware = require('../config/authMiddleware');

const connection = require('../config/db');
const { SECRET_KEY } = require('../config/jwt');

// 업로드 저장 위치/파일명 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/user'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
    cb(null, true);
  },
});

// 회원가입
router.post('/join', upload.single('u_pic'), async (req, res) => {
  try {
    const { u_id, u_pw, u_desc } = req.body;
    const u_pic = req.file ? req.file.filename : 'default-user.jpg';

    const hash_pw = await bcrypt.hash(u_pw, 10);

    connection.query(
      `INSERT INTO users (u_id, u_pw, u_nick, u_desc, u_pic) VALUES (?, ?, ?, ?, ?)`,
      [u_id, hash_pw, u_id, u_desc, u_pic],
      (err) => {
        if (err) return res.status(500).json({ error: '회원가입 실패' });
        res.json({ success: true });
      }
    );
  } catch (e) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 로그인
router.post('/login', (req, res) => {
  const { u_id, u_pw } = req.body;

  connection.query(
    'SELECT * FROM users WHERE u_id = ?',
    [u_id],
    async (err, result) => {
      if (err) {
        return res.status(500).json({ error: '서버 오류' });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: '존재하지 않는 아이디입니다. 재확인 후 다시 시도해주세요.' });
      }

      const user = result[0];
      const isMatch = await bcrypt.compare(u_pw, user.u_pw);

      if (!isMatch) {
        return res.status(401).json({ error: '비밀번호가 틀렸습니다. 재확인 후 다시 시도해주세요.' });
      }

      const token = jwt.sign(
        {
          token_no: user.u_no,
          token_id: user.u_id,
          token_nick: user.u_nick,
          token_desc: user.u_desc,
          token_profile: user.u_pic,
          token_badge: user.u_badge,
        },
        SECRET_KEY,
        { expiresIn: '1h' }
      );

      res.json({ token });
    }
  )
})

module.exports = router;
