var express   = require('express')
var socket    = require('socket.io')
var app       = express()
var port      = process.env.PORT || 3000

// Local
const mariadb = require('mariadb')

pool = null

if (process.env.PORT) {
  // Cloud
  pool = mariadb.createPool({
    database: 'jcc5ozu6r7vw4j8d',
    host: 'un0jueuv2mam78uv.cbetxkdyhwsb.us-east-1.rds.amazonaws.com', 
    user:'igudkqgtpmdhh9bm', 
    password: 'mj3lkpro8k8j2ovz',
    port: 3306,
    connectionLimit: 5
  })
}
else {
  // Local
  pool = mariadb.createPool({
    database: 'phanmem1_barcode',
    host: 'localhost', 
    user:'phanmem1_tungnt', 
    password: 'tungnt@12345',
    port: 3306,
    connectionLimit: 5
  })
}

server = app.listen(port, function () {
  console.log('JS API Hackathon listening on ' + port)
})

io = socket(server)

io.on('connection', (socket) => {
  pool.getConnection()
  .then(conn => {
    updateView(conn)
    conn.end()
  })
  .catch(err =>{})
});

// update data on view
function updateView(conn){
  conn.query("SELECT * FROM `scanned_data`")
  .then((rows) => {
    //console.log(rows) //[ {val: 1}, meta: ... ]
    io.emit('update view', rows)
  })
  .catch(err => {
    //handle error
    console.log(err)
  })
}

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
  //console.log(pool)

  //// Insert into db
  pool.getConnection()
    .then(conn => {
      conn.query("INSERT INTO `scanned_data`(`scan_date`, `location`, `type`, `item_cd`, `lot`, `quantity`, `user`) VALUES (?,?,?,?,?,?,?)", 
                  [req.query.scan_date, req.query.location, req.query.type, req.query.item_cd, req.query.lot, req.query.quantity, req.query.user])
      .then((dbres) => {
        console.log(dbres) // { affectedRows: x, insertId: x, warningStatus: x }
        updateView(conn);
        conn.end()
      })
      .catch(err => {
        //handle error
        console.log(err) 
        if (err.errno == 1062){
          console.log('DUPLICATE item_cd entry');
          conn.query("SELECT * FROM `scanned_data` WHERE `item_cd`=?;", [req.query.item_cd])
          .then((rows) => {
            console.log("DUPLICATED data:")
            console.log(rows[0])
            new_qty = parseInt(rows[0].quantity)
            new_qty += parseInt(req.query.quantity)
            conn.query("UPDATE `scanned_data`   \
                        SET `scan_date` = ?,  \
                            `user`      = ?,  \
                            `quantity`  = ?   \
                        WHERE `item_cd` = ?",
                        [ req.query.scan_date,
                          req.query.user,
                          new_qty,
                          req.query.item_cd])
            .then((dbres) => {
              console.log(dbres)
              updateView(conn)
              conn.end()
            })
            .catch(err => {
              console.log(err)
              conn.end()
            })
            conn.end()
          })
          .catch(err => {
            //handle error
            console.log(err)
            conn.end()
          })
          conn.end()
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
