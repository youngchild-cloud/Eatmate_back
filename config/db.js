const mysql = require('mysql'); // 또는 mysql2

const connection = mysql.createConnection({
  host: 'mariadb',
  user: 'root',
  password: '1234',
  database: 'eatmate'
});

connection.connect((err) => {
  if (err) {
    console.log('MYSQL 연결 실패 :', err);
    return;
  }
  console.log('MYSQL 연결 성공');
});

module.exports = connection;
