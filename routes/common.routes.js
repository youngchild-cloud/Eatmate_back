const router = require('express').Router();
const connection = require('../config/db');

/*** 헤더(header) ***/
router.get('/user/:token_no', (req, res) => {
  const token_no = req.params.token_no;

  connection.query(
    'SELECT * FROM users WHERE u_no = ?',
    [token_no],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'DB 조회 오류' });
      res.json(result[0]);
    }
  )
})

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

//댓글 삭제
router.delete('/chat/comment/:ct_no', (req, res) => {
  const ct_no = req.params.ct_no;
  const { board_cate, board_no } = req.body;

  // 카테고리별 매핑
  const boardMap = {
    review: {
      table: 'board_review',
      commentCol: 'br_comment',
      noCol: 'br_no'
    },
    meetup: {
      table: 'board_meetup',
      commentCol: 'bm_comment',
      noCol: 'bm_no'
    },
    community: {
      table: 'board_community',
      commentCol: 'bc_comment',
      noCol: 'bc_no'
    }
  };
  const boardInfo = boardMap[board_cate];
  if (!boardInfo) return res.status(400).json({ error: '잘못된 board_cate' });
  if (!board_no) return res.status(400).json({ error: 'board_no 누락' });
  const { table, commentCol, noCol } = boardInfo;

  // 댓글 삭제 쿼리문
  connection.query(
    'DELETE FROM comment WHERE ct_no = ?',
    [ct_no],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: '삭제 실패' });
      }

      // 삭제된 게 없으면(이미 삭제됨 등) 댓글수도 그대로
      if (result.affectedRows === 0) return res.status(404).json({ error: '댓글 없음' });

      // 게시글 댓글 수 업데이트 쿼리문
      connection.query(
        `UPDATE ${table} 
        SET ${commentCol} = GREATEST(${commentCol} - 1, 0)
        WHERE ${noCol} = ?`,
        [board_no],
        (err2) => {
          if (err2) return res.status(500).json({ error: '게시글 댓글 수 업데이트 실패' });
          return res.json({ ok: true });
        }
      )
    }
  )
})

// 댓글 입력
router.post('/comment', (req, res) => {
  const { ct_user_no, ct_board_cate, ct_board_no, ct_desc } = req.body;

  // 카테고리별 매핑
  const boardMap = {
    review: {
      table: 'board_review',
      noCol: 'br_no',
      commentCol: 'br_comment'
    },
    meetup: {
      table: 'board_meetup',
      noCol: 'bm_no',
      commentCol: 'bm_comment'
    },
    community: {
      table: 'board_community',
      noCol: 'bc_no',
      commentCol: 'bc_comment'
    }
  };
  const boardInfo = boardMap[ct_board_cate];

  if (!boardInfo) {
    return res.status(400).json({ error: '잘못된 게시판 카테고리' });
  }

  const { table, noCol, commentCol } = boardInfo;

  // 댓글 등록 + 댓글 수 증가
  connection.beginTransaction(err => {
    if (err) return res.status(500).json({ error: '트랜잭션 시작 실패' });

    // 댓글 등록 쿼리문
    connection.query(
      'INSERT INTO comment(ct_user_no, ct_board_cate, ct_board_no, ct_desc) VALUES(?, ?, ?, ?)',
      [ct_user_no, ct_board_cate, ct_board_no, ct_desc],
      (err) => {
        if (err) {
          return connection.rollback(() => {
            console.log(err);
            res.status(500).json({ error: '댓글 등록 실패' });
          });
        }

        // 댓글 수 증가 쿼리문
        connection.query(
          `UPDATE ${table}
          SET ${commentCol} = ${commentCol} + 1
          WHERE ${noCol} = ?`,
          [ct_board_no],
          (err) => {
            if (err) {
              return connection.rollback(() => {
                console.log(err);
                res.status(500).json({ error: '댓글 수 업데이트 실패' });
              });
            }

            // 커밋
            connection.commit(err => {
              if (err) {
                return connection.rollback(() => {
                  res.status(500).json({ error: '트랜잭션 커밋 실패' });
                });
              }

              res.json({ success: '댓글 등록 완료' });
            });
          }
        );
      }
    );
  });
});

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
