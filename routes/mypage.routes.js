const router = require('express').Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const connection = require('../config/db');

/*** [마이페이지] ***/
router.get('/mypage/:user_no', (req, res) => {
  const user_no = req.params.user_no;

  connection.query(
    'SELECT * FROM users WHERE u_no = ?',
    [user_no],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'DB 조회 오류' });
      }

      res.json(result[0]);
    }
  )
})

/*** [프로필 수정] ***/
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

router.put('/mypage/profile/modify', upload.single('u_pic'), async (req, res) => {
  try {
    const { u_id, u_pw, u_desc } = req.body;
    const hash_pw = await bcrypt.hash(u_pw, 10);

    // 이미지 파일을 재선택 했을 떄 쿼리문
    const sqlWithPic = `
      UPDATE users 
      SET u_pw = ?, u_desc = ?, u_pic = ?
      WHERE u_id = ?
    `;

    // 이미지 파일을 재선택 안했을 때 쿼리문
    const sqlWithoutPic = `
      UPDATE users 
      SET u_pw = ?, u_desc = ?
      WHERE u_id = ?
    `;

    if (req.file) {
      const u_pic = req.file.filename;
      connection.query(sqlWithPic, [hash_pw, u_desc, u_pic, u_id], (err) => {
        if (err) return res.status(500).json({ error: '프로필 수정 실패' });
        return res.json({ success: true });
      });
    } else {
      connection.query(sqlWithoutPic, [hash_pw, u_desc, u_id], (err) => {
        if (err) return res.status(500).json({ error: '프로필 수정 실패' });
        return res.json({ success: true });
      });
    }
  } catch (e) {
    return res.status(500).json({ error: '서버 오류' });
  }
});


//////////////마이페이지 맛집탐방 신청내역
router.get('/mymeetup', (req, res) => {
  const { user_no } = req.query;

  connection.query(
    `SELECT board_meetup.*, board_meetup.bm_no FROM board_meetup INNER JOIN meetup_join ON board_meetup.bm_no = meetup_join.bm_no WHERE u_no=?`, [user_no], (err, result) => {
      if (err) {
        console.log('조회오류', err);
        return res.status(500).json({ error: '조회실패' });
      }
      if (result.length == 0) {
        res.status(404).json({ error: '데이터없음' });
        return;
      }
      res.json(result);
    }
  )
})
////삭제
router.delete('/delmeetup/:bm_no', (req, res) => {
  const bm_no = req.params.bm_no;
  connection.query(
    'DELETE FROM board_meetup WHERE bm_no=?', [bm_no],
    (err, result) => {
      if (err) {
        console.log('삭제오류:', err);
        res.status(500).json
          ({ error: '삭제실패' });
        return;
      }
      res.json({ success: true })
    }
  );
})

module.exports = router;
