const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const connection = require('../config/db');
const { SECRET_KEY } = require('../config/jwt');

// 이미지 폴더링
const { createUploader } = require('../utils/multer');
const uploadAdminUser = createUploader({ destination: 'uploads/admin-user', prefix: 'admin-user_' });
const uploadRestaurant = createUploader({ destination: 'uploads/restaurant', prefix: 'restaurant_' });
const uploadReview = createUploader({ destination: 'uploads/review', prefix: 'review_' });

/*** [회원가입] ***/
// 아이디 중복 체크
router.post('/admin/idcheck', (req, res) => {
  const { au_id } = req.body;
  const sql = 'SELECT * FROM admin_users WHERE au_id=?';

  connection.query(sql, [au_id], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({ exists: result.length > 0 });
  })
});

// 회원가입
router.post('/admin/join', uploadAdminUser.single('au_pic'), async (req, res) => {
  const { au_id, au_pw, au_name } = req.body;
  const au_pic = req.file ? req.file.filename : null;

  try {
    const sql = `INSERT INTO admin_users (au_id, au_pw, au_name, au_pic) VALUES (?,?,?,?)`;
    const hash = await bcrypt.hash(au_pw, 10);

    connection.query(sql, [au_id, hash, au_name, au_pic], (err, results) => {
      if (err) return res.status(500).send(err);
      res.json({ message: '회원가입 성공' });
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

/*** [로그인] ***/
router.post('/admin/login', (req, res) => {
  const { au_id, au_pw } = req.body;

  connection.query(
    'SELECT * FROM admin_users WHERE au_id = ?',
    [au_id],
    async (err, result) => {
      if (err) {
        return res.status(500).json({ error: '서버 오류' });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: '존재하지 않는 아이디입니다. 재확인 후 다시 시도해주세요.' });
      }

      const user = result[0];
      const isMatch = await bcrypt.compare(au_pw, user.au_pw);

      if (!isMatch) {
        return res.status(401).json({ error: '비밀번호가 틀렸습니다. 재확인 후 다시 시도해주세요.' });
      }

      const adminToken = jwt.sign(
        {
          token_no: user.au_no,
          token_id: user.au_id,
          token_name: user.au_name,
          token_profile: user.au_pic,
        },
        SECRET_KEY,
        { expiresIn: '1h' }
      );

      res.json({ adminToken });
    }
  )
})

/*** 관리자_맛집 관리 ***/
// [맛집 등록]
router.post('/admin/restaurant', uploadRestaurant.single('rt_img'), (req, res) => {
  const { rt_name, rt_desc, rt_cate, rt_location, rt_tel } = req.body;
  const rt_img = req.file ? req.file.filename : null;

  connection.query(
    'INSERT INTO restaurant (rt_img, rt_name, rt_desc, rt_cate, rt_location, rt_tel) VALUES (?, ?, ?, ?, ?, ?)',
    [rt_img, rt_name, rt_desc, rt_cate, rt_location, rt_tel],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'DB 맛집 등록 실패' });
      }
      res.json({ success: '등록 완료' });
    }
  )
})

// [맛집 목록] 삭제
router.delete('/admin/restaurant/:rt_no', (req, res) => {
  const rt_no = req.params.rt_no;
  connection.query(
    'DELETE FROM restaurant WHERE rt_no= ?', [rt_no],
    (err, result) => {
      if (err) {
        console.log('삭제 오류 : ', err);
        return res.status(500).json({ error: '삭제 실패' });
      }
      res.json({ success: '삭제 완료' });
    }
  )
})

// [맛집 수정] 조회
router.get('/admin/restaurant/:rt_no', (req, res) => {
  const rt_no = req.params.rt_no;

  connection.query(
    'SELECT * FROM restaurant WHERE rt_no = ?',
    [rt_no],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'DB 맛집 조회 실패' });
      }
      res.json(result[0]);
    }
  )
})

// [맛집 수정] 수정
router.put('/admin/restaurant', uploadRestaurant.single('rt_img'), (req, res) => {
  const { rt_no, rt_name, rt_desc, rt_cate, rt_location, rt_tel } = req.body;
  const rt_img = req.file ? req.file.filename : null;

  // 이미지 파일을 재선택 했을 떄 쿼리문
  const sqlWithPic = `
  UPDATE restaurant 
  SET rt_img = ?, rt_name = ?, rt_desc = ?, rt_cate = ?, rt_location = ?, rt_tel = ?
  WHERE rt_no = ?
  `

  // 이미지 파일을 재선택 안했을 때 쿼리문
  const sqlWithoutPic = `
    UPDATE restaurant 
    SET rt_name = ?, rt_desc = ?, rt_cate = ?, rt_location = ?, rt_tel = ?
    WHERE rt_no = ?
  `;

  if (req.file) {
    connection.query(
      sqlWithPic,
      [rt_img, rt_name, rt_desc, rt_cate, rt_location, rt_tel, rt_no],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'DB 맛집 수정 실패' });
        }
        res.json({ success: '수정 완료' });
      }
    )
  } else {
    connection.query(
      sqlWithoutPic,
      [rt_name, rt_desc, rt_cate, rt_location, rt_tel, rt_no],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'DB 맛집 수정 실패' });
        }
        res.json({ success: '수정 완료' });
      }
    )
  }
})

/*** 관리자_게시판 관리 ***/
// [맛집 리뷰 목록] 삭제
router.delete('/admin/review/:br_no', (req, res) => {
  const br_no = req.params.br_no;
  connection.query(
    'DELETE FROM board_review WHERE br_no = ?', [br_no],
    (err, result) => {
      if (err) {
        console.log('삭제 오류 : ', err);
        return res.status(500).json({ error: '삭제 실패' });
      }
      res.json({ success: '삭제 완료' });
    }
  )
})

// [맛집 리뷰 수정] 조회
router.get('/admin/review/:br_no', (req, res) => {
  const { br_no } = req.params;

  connection.query(
    `SELECT board_review.*, restaurant.*
    FROM board_review 
    INNER JOIN restaurant 
      ON restaurant.rt_no = board_review.br_rt_no
    WHERE br_no = ?`,
    [br_no],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'DB 맛집 리뷰 조회 실패' });
      }
      res.json(result[0]);
    }
  )
})

// [맛집 리뷰 수정] 수정
router.put('/admin/review', uploadReview.single('br_img'), (req, res) => {
  const { rt_no, br_desc, br_rank, br_no } = req.body;
  const br_img = req.file ? req.file.filename : null;

  // 이미지 파일을 재선택 했을 떄 쿼리문
  const sqlWithPic = `
    UPDATE board_review 
    SET br_img = ?, br_rt_no = ?, br_desc = ?, br_rank = ?
    WHERE br_no = ?
  `;

  // 이미지 파일을 재선택 안했을 때 쿼리문
  const sqlWithoutPic = `
    UPDATE board_review 
    SET br_rt_no = ?, br_desc = ?, br_rank = ? 
    WHERE br_no = ?
  `;

  if (req.file) {
    connection.query(
      sqlWithPic,
      [br_img, rt_no, br_desc, br_rank, br_no],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'DB 맛집 리뷰 수정 실패' });
        }
        res.json({ success: '수정 완료' });
      }
    )
  } else {
    connection.query(
      sqlWithoutPic,
      [rt_no, br_desc, br_rank, br_no],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'DB 맛집 리뷰 수정 실패' });
        }
        res.json({ success: '수정 완료' });
      }
    )
  }
})

/*** 회원 관리 ***/
// [회원 목록] 출력
router.get('/admin/user', (req, res) => {
  connection.query('SELECT * FROM users ORDER BY u_no DESC', (err, results) => {
    if (err) {
      console.log('쿼리문 오류:', err);
      return res.status(500).json({ error: '쿼리문 오류' });
    }
    res.json(results);
  });
});

// [회원 목록] 삭제
router.delete('/admin/user/:u_no', (req, res) => {
  const u_no = req.params.u_no;

  connection.query(
    'DELETE FROM users WHERE u_no = ?', [u_no],
    (err, results) => {
      if (err) {
        console.log('삭제오류 : ', err);
        res.status(500).json({ error: '삭제실패' });
        return;
      }
      res.json({ success: true });
    }
  )
});

module.exports = router;