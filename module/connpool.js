var mysql=require('mysql');
module.exports=(function () {
   var pool=mysql.createPool({
       host:'localhost',//主机
       user:'root',/*用户名*/
       password:'',
       database:'shop',//数据库
       port:'3306'/*端口号，默认都是3306*/
   });
    pool.on('connection',function (connection) {/*事件触发，当连接时触发*/
        connection.query("set session auto_increment_increment=1");/*初始化池子,自动递增*/
    });
   return function () {
       return pool;
   }
})();