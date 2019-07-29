var express = require('express');
var router = express.Router();
var table=require('../module/optdb');
var conPool=require('../module/connpool');
var pool=conPool();
var async=require('async');
var svg=require('svg-captcha');

/* GET users listing. */
router.get('/list', function(req, res, next) {
    var key=req.query['key'];
    var cPage=req.query['cPage'];
    pool.getConnection(function (err,conn) {
        conn.beginTransaction(function (err) {
            async.series({/*串行无关联*/
                pages:function (done) {
                    if (key==='')
                        var sql=`select count(id) as num from goods`;
                    else
                        sql=`select count(id) as num from goods where title like '%${key}%' order by id desc`;
                    conn.query(sql,[],function (err,rs) {
                        if(!err){
                            var page=Math.ceil(rs[0].num/12);
                            cPage=(cPage>page-1)?(page-1):cPage;
                            cPage=cPage<0?0:cPage;
                            done(err,page);
                        }
                    })
                },
                data:function (done) {
                    if (key==='')
                        var sql=`select * from goods order by id desc limit ?,12`;
                    else
                        sql=`select * from goods where title like '%${key}%' order by id desc limit ?,12`;
                    conn.query(sql,[cPage*12],function (err,data) {
                        if(!err)
                            done(err,data);
                    })
                }
            },function (err,obj) {
                if (err){
                    console.log(err);
                    conn.rollback();/*如果有错误，回滚*/
                    res.json('data option error');
                    conn.release();
                }else{
                    conn.commit(function (err) {/*提交事务*/
                        if (err){
                            console.log(err);
                            conn.rollback();/*如果有错误，回滚*/
                            res.json('commit option error');
                        }else {
                            console.log('commit success');
                            res.json(obj)/*{pages:XX,data:XX}*/
                        }
                        conn.release();
                    });
                }
            })
        })
    })
});
router.get('/yzm', function(req, res, next) {
    var codeConfig={
        size:4,//验证码长度
        ignoreChars:'0o1li',//排除
        noise:2,//干扰数量
        height:46
    };
    var obj=svg.create(codeConfig);
    req.session.yzm=obj.text;
    res.json(obj.data);
});
router.post('/login', function(req, res, next) {
    if (req.body['yzm'].toUpperCase()!== req.session.yzm.toUpperCase()){
        res.json({flag:1})
    }else {
        var sql="SELECT * FROM `user` WHERE username=? and pwd=?";
        var params=[req.body['username'],req.body['pwd']];
        table(sql,params,function (err,rs) {
            if(!err){
                if (rs.length===0){
                    res.json({flag:2})
                }else {
                    var obj={id:rs[0].id,nc:rs[0].nc};
                    req.session.userinfo=obj;
                    res.json({flag:4,row:obj})
                }
            }else {
                res.json({flag:3})
            }
        })
    }
});
router.post('/register', function(req, res, next) {
    var sql="INSERT INTO `user`(`username`, `pwd`, `nc`, `phone`, `address`) VALUES (?,?,?,?,?)";
    var params=[req.body['username'],req.body['pwd'],req.body['nc'],req.body['phone'],req.body['address']];
    table(sql,params,function (err,rs) {
        if(!err){
            var sql="SELECT * FROM `user` WHERE username=? and pwd=?";
            var params=[req.body['username'],req.body['pwd']];
            table(sql,params,function (err,rs) {
                var obj={id:rs[0].id,nc:rs[0].nc};
                req.session.userinfo=obj;
                res.json({flag:2,row:obj})
            });
        }else {
            if(err==='ER_DUP_ENTRY'){
                console.log('username no unique');
                res.json({flag:1});
            }else
                res.json({flag:3})
        }
    })
});
router.get('/logout', function(req, res, next) {
    req.session.userinfo=null;
    res.json(true);
});
router.get('/userinfo', function(req, res, next) {
    if(req.session.userinfo)
        res.json(req.session.userinfo);
    else
        res.json(false);
});
router.get('/logout', function(req, res, next) {
    req.session.userinfo=null;
    res.json(true);
});
router.get('/get_num', function(req, res, next) {
    var id=req.session.userinfo.id;
    var sql="select cart from user where id=?";
    table(sql,[id],function (err,rs) {
        if (!err){
            if (!rs[0]['cart'])
                rs[0]['cart']='[]';
            var num=JSON.parse(rs[0]['cart']).length;
            res.json(num);
        }
    })
});
router.get('/get_cart', function(req, res, next) {
    var userId=req.session.userinfo.id;
    async.waterfall([/*串行有关联*/
        function (done) {
            var sql="select cart from user where id=?";
            table(sql,[userId],function (err,rs) {
                if (!err){
                    if (!rs[0]['cart'])
                        rs[0]['cart']='[]';
                    var arr=JSON.parse(rs[0]['cart']);
                    done(err,arr);
                }
            })
        },function (prev,done) {
            var arr=prev;
            var str='(';
            arr.forEach(function (el) {
                str+=el+',';
            });
            str=str.substr(0,str.length-1);
            str+=')';
            var sql="update goods set where id in "+str;
            table(sql,[],function (err,rs) {
                if (!err){
                    done(null,rs)
                }
            })
        }
    ],function (err,rs) {
        if (!err){
            res.json(null,rs);
        }
    })
});
router.get('/detail', function(req, res, next) {
    var id=req.query['id'];
    var sql="select * from goods where id=?";
    table(sql,[id],function (err,rs) {
        if (!err){
            res.json(rs[0]);
        }
    })
});
router.get('/is_send', function(req, res, next) {
    var userId=req.session.userinfo.id;
    var sql="select send from user where id=?";
    table(sql,[userId],function (err,rs) {
        if (!err){
            res.json(rs[0].send);//返回0或1
        }
    })
});
router.get('/buy_now', function(req, res, next) {
    var userId=req.session.userinfo.id;
    var sql="update `user` set `order`=?,`send`=1,`total`=? where id=?";
    var params=[req.query.json,req.query.total,userId];/*json转换成字符串*/
    table(sql,params,function (err,rs) {
        if (!err){
            res.json(rs);
        }
    })
});
router.get('/addcart', function(req, res, next) {
    var pId=req.query['id'];
    var userId=req.session.userinfo.id;

    async.waterfall([/*串行有关联*/
        function (done) {
            var sql="select cart from user where id=?";
            table(sql,[userId],function (err,rs) {
                if (!err){
                    if (!rs[0]['cart'])
                        rs[0]['cart']='[]';
                    var arr=JSON.parse(rs[0]['cart']);
                    done(err,arr);
                }
            })
        },function (prev,done) {
            var arr=prev;
            if(arr.indexOf(pId)>=0)
                done(null,'此商品已存在购物车');
            else {
                arr.push(pId);
                var sql="update `user` set `cart`=? where id=?";
                var params=[JSON.stringify(arr),userId];/*json转换成字符串*/
                table(sql,params,function (err,rs) {
                    if (!err){
                        done(null,'成功加入购物车');
                    }
                })
            }
        }
    ],function (err,rs) {
        if (!err){
            res.json(rs);
        }
    })
});
router.get('/buy_all', function(req, res, next) {
    var userId=req.session.userinfo.id;
    async.waterfall([
        function (done) {
            var sql="select send from user where id=?";
            table(sql,[userId],function (err,rs) {
                if (!err){
                    done(null,rs[0].send);//返回0或1
                }
            })
        },function (prev,done) {
            if (prev) done(null,'上次购买的还未发货');
            else {
                var sql="update `user` set `order`=?,`send`=1,`total`=?,cart=? where id=?";
                var params=[req.query.order,req.query.total,req.query.cart,userId];/*json转换成字符串*/
                table(sql,params,function (err,rs) {
                    if (!err){
                        if (rs.affectedRows)
                            done(null,'结算成功！');
                        else
                            done(null,'结算失败！');
                    }
                })
            }
        }
    ],function (err,rs) {
        res.json(rs);
    });
});
router.post('/edit_info', function(req, res, next) {
    var userId=req.session.userinfo.id;
    var sql="update `user` set `username`=?, `nc`=?, `phone`=?, `address`=? where id=?";
    var params=[req.body['username'],req.body['nc'],req.body['phone'],req.body['address'],userId];
    table(sql,params,function (err,rs) {
        if(!err){
            res.json(1)
        }
    })
});
router.get('/cart', function(req, res, next) {
    var userId=req.session.userinfo.id;
    async.waterfall([
        function (done) {
            var sql=`select cart from user where id=?`;
            table(sql,[userId],function(err,rs){
                if (!err){
                    if (!rs[0]['cart']||rs[0]['cart']==='[]')
                        done(true,{flag:1});
                    else
                        done(null,JSON.parse(rs[0]['cart']));/*将字符串转换成对象*/
                }
            })
        },function (prev,done) {
            var arr=prev;
            var str='';
            arr.forEach(function (el) {
                str+='id='+el+' or ';
            });
            str=str.slice(0,str.length-4);/*去掉字符串最后4位*/
            var sql=`select * from goods where `+str;
            table(sql,[],function(err,rs){
                if (!err)
                    done(null,{flag:2,arr:rs})
            })
        }
    ],function (err,rs) {
            res.json(rs);
    })

});
router.get('/del_one', function(req, res, next) {
    var userId=req.session.userinfo.id;
    var sql="update `user` set cart=? where id=?";
    var params=[req.query.cart,userId];/*json转换成字符串*/
    table(sql,params,function (err,rs) {
        if (!err){
            res.json(rs);/*返回0或1*/
        }
    })
});
router.get('/del_all', function(req, res, next) {
    var userId=req.session.userinfo.id;
    var sql="update `user` set cart='[]' where id=?";
    table(sql,[userId],function (err,rs) {
        if (!err){
            res.json(rs);/*返回0或1*/
        }
    })
});
module.exports = router;
