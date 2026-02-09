const router = require('express').Router();
const connection = require('../config/db');

/*** 댓글 영역 ***/
// 댓글 출력
router.post('/common/chat', (req, res) => {
  const { board_cate, board_no } = req.body;

  connection.query(
    `SELECT comment.*, users.u_pic, users.u_nick
    FROM comment
    INNER JOIN users
      ON comment.ct_user_no = users.u_no
    WHERE comment.ct_board_cate = ? && comment.ct_board_no = ?`,
    [board_cate, board_no],
    (err, reslut) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'DB 조회 오류' })
      }

      res.json(reslut);
    }
  )
})

// 댓글 입력
router.post('/comment', (req, res) => {
  const { ct_user_no, ct_board_cate, ct_board_no, ct_desc } = req.body;

  connection.query(
    'INSERT INTO comment(ct_user_no, ct_board_cate, ct_board_no, ct_desc) VALUES(?, ?, ?, ?)',
    [ct_user_no, ct_board_cate, ct_board_no, ct_desc],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'DB 입력 오류' })
      }

      res.json({ success: '등록 성공' });
    }
  )
})

/*** 하트 출력 ***/
// board_review/board_meetup/board_community 테이블의 하트 수 업데이트
router.put('/board/heart', (req, res) => {
  const { board_cate, board_no, heart_toggle } = req.body;
  const boardMap = {
    review: 'br',
    meetup: 'bm',
    community: 'bc',
  };
  const boardTitle = boardMap[board_cate];
  // heart_toggle == false면 아직 안 누른 상태 => +
  // heart_toggle == true면 누른 상태 => -
  const plusMinus = !heart_toggle ? '+' : '-';

  const updateSql = `
    UPDATE board_${board_cate}
    SET ${boardTitle}_heart = ${boardTitle}_heart ${plusMinus} 1
    WHERE ${boardTitle}_no = ?
  `;

  connection.query(updateSql, [board_no], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB 수정 오류' });
    }

    res.json({ success: true });
  });
});

// heard 테이블의 데이터 입력(생성)
router.post('/heart', (req, res) => {
  const { board_cate, board_no, heart_toggle, user_no } = req.body;
  // heart_toggle == false면 아직 안 누른 상태 => 테이블에 입력
  // heart_toggle == true면 누른 상태 => 테이블에 있는 정보 삭제
  const sql =
    !heart_toggle
      ?
      'INSERT INTO heart(ht_user_no, ht_board_cate, ht_board_no) VALUES(?, ?, ?)'
      :
      'DELETE FROM heart WHERE ht_user_no = ? AND ht_board_cate = ? AND ht_board_no = ?'

  connection.query(sql, [user_no, board_cate, board_no], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB heart 입력 오류' });
    }

    res.json({ success: true });
  })
})

// heard 테이블의 회원 정보가 있는지 확인(===하트를 누른 상태인지 확인)
router.post('/heart/user', (req, res) => {
  const { board_cate, board_no, user_no } = req.body;

  connection.query(
    'SELECT * FROM heart WHERE ht_user_no = ? && ht_board_cate = ? && ht_board_no = ?',
    [user_no, board_cate, board_no],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'DB heart 출력 오류' });
      }

      res.json(result[0]);
    }
  )
})

module.exports = router;
