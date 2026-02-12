const express = require('express');
const cors = require('cors');

const indexRouter = require('./routes/index.routes');
const commonRouter = require('./routes/common.routes');
const communityRouter = require('./routes/community.routes');
const meetupRouter = require('./routes/meetup.routes');
const reviewRouter = require('./routes/review.routes');
const loginRouter = require('./routes/login.routes');
const mypageRouter = require('./routes/mypage.routes');
const adminRouter = require('./routes/admin.routes');

const app = express();
const path = require('path');

app.use(cors());
app.use(express.json()); // JSON 본문 파싱
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // 업로드된 이미지 확인 가능
app.use('/', indexRouter);                      // 테스트 라우트
app.use('/', commonRouter);                     // 공통
app.use('/', communityRouter);                  // communitylist
app.use('/', meetupRouter);                     // meetup
app.use('/', reviewRouter);                     // review
app.use('/', loginRouter);                      // login/join
app.use('/', mypageRouter);                     // mypage
app.use('/', adminRouter);                      // admin

// multer 에러 포함 전역 에러 핸들러
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: '파일 용량은 5MB 이하만 가능합니다.' });
  }
  return res.status(400).json({ error: err.message || '서버 오류' });
});



module.exports = app;
