var conPool=require('./connpool');

var pool=conPool();
module.exports=function (sql,params,recall) {
    pool.getConnection(function (err,conn) {
        if(!err){
            conn.query(sql,params,function (err,rs) {
                if (!err)
                    recall(err,rs);/*此时err=null*/
                else {
                    console.log(err.code);
                    recall(err.code,null);
                }
                conn.release();/*释放连接*/
            })
        }else {
            console.log(err.code);
            recall(err.code,null);
        }

    })
};