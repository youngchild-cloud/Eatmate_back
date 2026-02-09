const router = require('express').Router();
const connection = require('../config/db');

// 자유게시판 게시글 목록 조회
router.get('/communitylist', (req, res) => {
  const sql = `
    SELECT board_community.*, users.*
    FROM board_community
    INNER JOIN users ON board_community.bc_user_no = users.u_no
    ORDER BY board_community.bc_no DESC
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.log('쿼리문 오류 : ', err);
      return res.status(500).json({ error: 'DB쿼리문 오류' });
    }
    res.json(results);
  });
});

router.get('/community', (req, res) => {
  const { user_no, board_cate } = req.query;

  let sql = '';

  if (board_cate === 'write') {
    sql = `
      SELECT board_community.*, users.*
      FROM board_community
      INNER JOIN users ON board_community.bc_user_no = users.u_no
      WHERE board_community.bc_user_no = ?
      ORDER BY board_community.bc_no DESC
    `; // 마이페이지 - 작성한 게시글
  } else if (board_cate == 'like') {
    sql = `
      SELECT *
      FROM heart h
      INNER JOIN board_community bc ON h.ht_board_no = bc.bc_no
      INNER JOIN users u ON bc.bc_user_no = u.u_no
      WHERE h.ht_user_no = ? AND h.ht_board_cate = 'community'
      ORDER BY h.ht_no DESC
    `; // 마이페이지 - 내가 남긴 좋아요
  } else {
    sql = `
      SELECT *
      FROM comment c
      INNER JOIN board_community bc ON c.ct_board_no = bc.bc_no
      INNER JOIN users u ON bc.bc_user_no = u.u_no
      WHERE c.ct_user_no = ? AND c.ct_board_cate = 'community'
      ORDER BY c.ct_no DESC
    `; // 마이페이지 - 내가 남긴 댓글
  }

  connection.query(sql, [user_no], (err, results) => {
    if (err) {
      console.log('쿼리문 오류 : ', err);
      return res.status(500).json({ error: 'DB쿼리문 오류' });
    }
    res.json(results);
  });
});

// 자유게시판 게시글 상세 페이지 조회
router.get('/community/detail/:bc_no', (req, res) => {
  const bc_no = req.params.bc_no;
  connection.query(
    `SELECT board_community.*, users.*
    FROM board_community
    INNER JOIN users ON board_community.bc_user_no = users.u_no
    WHERE board_community.bc_no = ? `,
    [bc_no],
    (err, results) => {
      if (err) {
        console.log('조회 오류 : ', err);
        return res.status(500).json({ error: '조회 실패' });
      }
      return res.json(results[0]);
    }
  )
})

// 자유게시판 게시글 작성 (입력)
router.post('/writecommunity', (req, res) => {
  const { bc_user_no, bc_title, bc_desc } = req.body;
  if (!bc_title || !bc_desc) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }
  connection.query(
    'INSERT INTO board_community ( bc_user_no, bc_title, bc_desc ) VALUES ( ?,?,? )',
    [bc_user_no, bc_title, bc_desc],
    (err, result) => {
      if (err) {
        console.log('등록오류 :', err);
        res.status(500).json({ error: '글 등록 실패' });
        return
      }
      res.json({ success: true, insertId: result.insertId });
    }
  );
});

router.delete('/admin/community/:bc_no', (req, res) =>{
  const bc_no = req.params.bc_no;
  connection.query(
    'DELETE FROM board_community WHERE bc_no = ?', [bc_no],
    (err, result) => {
      if (err) {
        console.log('삭제 오류 : ', err);
        return res.status(500).json({error: '삭제 실패'});
      }
      res.json({ success: '삭제 완료'});
    }
  )
})

// 자유게시판 게시물수정 (관리자)
router.put('/community/update/:bc_no', (req, res) => {
  const bc_no = req.params.bc_no;
  const { bc_title, bc_desc} = req.body;

  connection.query(
    'UPDATE board_community SET bc_title =? , bc_desc=? where bc_no= ?', [bc_title, bc_desc, bc_no],
    (err, result) => {
      if (err) {
        console.log('수정 오류 : ', err);
        res.status(500).json({ error: '수정 실패'});
        return;
      }
      res.json({ success: true});
    }
  )
})



module.exports = router;
