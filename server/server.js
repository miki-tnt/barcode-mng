var express   = require('express')
var socket    = require('socket.io')
var app       = express()
var port      = process.env.PORT || 3000

const mariadb = require('mariadb')
const pool = mariadb.createPool({
  database: 'jcc5ozu6r7vw4j8d',
  host: 'un0jueuv2mam78uv.cbetxkdyhwsb.us-east-1.rds.amazonaws.com', 
  user:'igudkqgtpmdhh9bm', 
  password: 'mj3lkpro8k8j2ovz',
  port: 3306,
  connectionLimit: 5
})

// pool.getConnection()
//     .then(conn => {
    
//       conn.query("SELECT * FROM `scanned_data`")
//         .then((rows) => {
//           console.log(rows) //[ {val: 1}, meta: ... ]
//           //Table must have been created before 
//           // " CREATE TABLE myTable (id int, val varchar(255)) "
//           //return conn.query("INSERT INTO `scanned_data`(`code`, `employee_id`, `date_time`, `count`) VALUES (?,?,?,?)", ["code", "employee", "datetime", 1])
//         })
//         .then((res) => {
//           console.log(res) // { affectedRows: 1, insertId: 1, warningStatus: 0 }
//           conn.end()
//         })
//         .catch(err => {
//           //handle error
//           console.log(err) 
//           conn.end()
//         })
        
//     }).catch(err => {
//       //not connected
//     })


// format date
function formatLogFileName() {
  var d = new Date(),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear()

  if (month.length < 2) 
      month = '0' + month
  if (day.length < 2) 
      day = '0' + day

  return ['H', [year, month, day].join('-'), '.TXT'].join('')
}

function formatLogDateTime() {
  var d = new Date(),
      month = ('0' + (d.getMonth() + 1)).slice(-2),
      day = ('0' + d.getDate()).slice(-2),
      year = d.getFullYear(),
      h = ('0' + d.getHours()).slice(-2),
      m = ('0' + d.getMinutes()).slice(-2),
      s = ('0' + d.getSeconds()).slice(-2)

  return [[month, day, year].join('/'), [h, m, s].join(':')].join(',')
}
// write History
function logTime(doorId, userId) {
  var fileName = formatLogFileName()
  var dateTimeLog = formatLogDateTime()
  console.log(dateTimeLog)
  fs.appendFile('C:\\KJTech\\Guardian\\History\\' + fileName, 
    '\"ACC,' + dateTimeLog + ',' + doorId +',Granted,' + userId + ',None,None,[CD] or [FP],Close,None,by FP\"\n'
    , function (err) {
    if (err) throw err
    console.log('Saved!')
  })
}

server = app.listen(port, function () {
  console.log('JS API Hackathon listening on ' + port)
})

io = socket(server)

// io.on('connection', (socket) => {
//   socket.broadcast.emit('hi from server');
//   //console.log('a user connected');

//   socket.on('disconnect', () => {
//     //console.log('user disconnected');
//   });

//   socket.on('update view', (msg) => {
//     //console.log('message: ' + msg);
//     //io.emit('update view', msg);
//   });
// });

app.put('/logtime', function (req, res) {
  console.log('logtime: ' + JSON.stringify(req.query))
  logTime(req.query.doorId, req.query.userId)

  res.json({
    message: 'OK',
  })
})

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
})

app.post('/', function (req, res) {
  io.emit('update view', req.query.aaaa)

  res.json({
    message: 'calling POST /scan method',
    query: req.query,
  })
})

app.post('/scan', function (req, res) {
  //ws.send(req.query.msg)
  // sending msg to websocket server
  console.log('Called POST method')
  console.log(req.query)

  let count = 1 // TODO: add logic to increase

  //// Insert into db
  pool.getConnection()
    .then(conn => {
      conn.query("INSERT INTO `scanned_data`(`code`, `employee_id`, `date_time`, `count`) VALUES (?,?,?,?)", [req.query.code, req.query.employeeId, req.query.dateTime, 1])
      .then((dbres) => {
        console.log(dbres) // { affectedRows: x, insertId: x, warningStatus: x }
        // emit data to update view
        conn.query("SELECT * FROM `scanned_data`")
        .then((rows) => {
          //console.log(rows) //[ {val: 1}, meta: ... ]
          io.emit('update view', rows)
        })
        .catch(err => {
          //handle error
          console.log(err)
          conn.end()
        })
        conn.end()
      })
      .catch(err => {
        //handle error
        //console.log(err) 
        if (err.errno == 1062){
          console.log('DUPLICATE barcode entry');
          conn.query("SELECT * FROM `scanned_data` WHERE `code`=?;", [req.query.code])
          .then((rows) => {
            console.log("DUPLICATED data:")
            console.log(rows[0])
            new_count = rows[0].count
            ++new_count
            conn.query("UPDATE `scanned_data`   \
                        SET `employee_id` = ?,  \
                            `date_time`   = ?,  \
                            `count`       = ?   \
                        WHERE `code` = ?",
                        [ req.query.employeeId,
                          req.query.dateTime,
                          new_count,
                          req.query.code])
            .then((dbres) => {
              console.log(dbres)
              conn.query("SELECT * FROM `scanned_data`")
              .then((rows) => {
                //console.log(rows) //[ {val: 1}, meta: ... ]
                io.emit('update view', rows)
              })
              .catch(err => {
                //handle error
                console.log(err)
                conn.end()
              })
              conn.end()
            })
            .catch(err => {
              console.log(err)
              conn.end()
            })

          })
          .catch(err => {
            //handle error
            console.log(err)
            conn.end()
          })
        }
        conn.end()
      })
    })
  ////
  res.json({
    message: 'calling POST /scan method',
    query: req.query,
  })
})

module.exports = app
