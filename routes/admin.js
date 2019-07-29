var express = require('express');
var router = express.Router();
var table=require('../module/optdb');
var conPool=require('../module/connpool');
var pool=conPool();
var async=require('async');
var multiparty=require('multiparty');//接收formdata数据

var fs = require('fs');

/* GET admin listing. */
router.post('/add', function (req, res) {
    var form = new multiparty.Form();
    //设置编码
    form.encoding = 'utf-8';
    //设置临时文件存储路径
    form.uploadDir = "./uploadtemp/";
    //设置单文件大小限制
    form.maxFilesSize = 2 * 1024 * 1024;
    // form.maxFields = 15 * 1024 * 1024;  //设置所以文件的大小总和

    form.parse(req, function (err, fields, files) {
        var title=fields.title;
        var price=fields.price;

        var uploadurl = '/uploadup/';
        var file1 = files['image'];//前端的名字

        // paraname = file1[0].fieldName;  //参数名filedata
        var originalFilename = file1[0].originalFilename; //原始文件名
        var type = ["jpg", "gif", 'png', 'bmp'];//允许选择的图片类型
        var ext = originalFilename.split(".")[1];//取图片的后缀名
        if (type.indexOf(ext)>=0){/*判断文件格式是不是符合条件*/
            var tmpPath = file1[0].path;//uploads\mrecQCv2cGlZbj-UMjNyw_Bz.txt
            // fileSize = file1[0].size; //文件大小

            var timestamp = new Date().getTime(); //获取当前时间戳
            uploadurl += timestamp + originalFilename;//前端文件显示路径
            var newPath = './public' + uploadurl;

            var fileReadStream = fs.createReadStream(tmpPath);
            var fileWriteStream = fs.createWriteStream(newPath);
            fileReadStream.pipe(fileWriteStream); //管道流
            fileWriteStream.on('close', function () {
                fs.unlinkSync(tmpPath);    //删除临时文件夹中的图片
                var sql="INSERT INTO `goods`(`title`,`price`,`src`) VALUES (?,?,?)";
                var params=[title,price,uploadurl];
                table(sql,params,function (err,rs) {
                    if (rs.affectedRows){
                        var detail=[title,price,uploadurl];
                        res.json({flag:1,detail:detail});
                    }
                    else
                        res.json({flag:2});
                });
                // res.send('{"err":"","msg":"' + uploadurl + '"}')
            });
        }else {
            res.json({flag:3});
        }

    });
});
router.get('/send', function (req, res) {
    var sql=`select * from user where send=1 order by id desc`;
    table(sql,[],function (err,rs) {
        res.json(rs)
    })
});
router.get('/goods', function (req, res) {
    var sql=`select * from goods order by id desc`;
    table(sql,[],function (err,rs) {
        res.json(rs)
    })
});
router.get('/delete', function(req, res, next) {
    var sql='delete from goods where id=?';
    table(sql,[req.query.id],function(err,rs){
        if(!err){
            res.json(rs.affectedRows);
        }
    })
});
router.get('/edit_search', function(req, res, next) {
    var key=[req.query.key];
    var sql=`select * from goods where title like '%${key}%' order by id desc limit 1`;
    table(sql,[],function(err,rs){
        if(!err){
            res.json(rs[0]);
        }
    })
});
router.get('/edit', function(req, res, next) {
    var sql=`update goods set title=?,price=? where id=?`;
    var params=[req.query.edit_title,req.query.edit_price,req.query.edit_id];
    table(sql,params,function(err,rs){
        if(!err){
            res.json(rs.affectedRows);
        }
    })
});
router.get('/img_search', function(req, res, next) {
    var key=[req.query.key];
    var sql=`select * from goods where title like '%${key}%' order by id desc limit 1`;
    table(sql,[],function(err,rs){
        if(!err){
            res.json(rs[0]);
        }
    })
});
router.post('/edit_img', function (req, res) {
    var form = new multiparty.Form();
    //设置编码
    form.encoding = 'utf-8';
    //设置临时文件存储路径
    form.uploadDir = "./uploadtemp/";
    //设置单文件大小限制
    form.maxFilesSize = 2 * 1024 * 1024;
    // form.maxFields = 15 * 1024 * 1024;  //设置所以文件的大小总和

    form.parse(req, function (err, fields, files) {
        var pId=fields.img_id;
        var title=fields.img_title;
        var old_name=fields.old_name;

        var uploadurl = '/uploadup/';
        var file1 = files['new_image'];//前端的名字

        // paraname = file1[0].fieldName;  //参数名filedata
        var originalFilename = file1[0].originalFilename; //原始文件名
        var type = ["jpg", "gif", 'png', 'bmp'];//允许选择的图片类型
        var ext = originalFilename.split(".")[1];//取图片的后缀名
        if (type.indexOf(ext)>=0){/*判断文件格式是不是符合条件*/
            var tmpPath = file1[0].path;//uploads\mrecQCv2cGlZbj-UMjNyw_Bz.txt
            // fileSize = file1[0].size; //文件大小

            var timestamp = new Date().getTime(); //获取当前时间戳
            uploadurl += timestamp + originalFilename;//前端文件显示路径
            var newPath = './public' + uploadurl;

            var fileReadStream = fs.createReadStream(tmpPath);
            var fileWriteStream = fs.createWriteStream(newPath);
            fileReadStream.pipe(fileWriteStream); //管道流

            fileWriteStream.on('close', function () {
                fs.unlinkSync('./public' + old_name);/*删除原来的图片*/
                fs.unlinkSync(tmpPath);    //删除临时文件夹中的图片
                var sql="update goods set src=? where id=?";
                var params=[uploadurl,pId];
                table(sql,params,function (err,rs) {
                    if (rs.affectedRows){
                        var detail=[title,uploadurl];
                        res.json({flag:1,detail:detail});
                    }
                    else
                        res.json({flag:2});
                });
            });
        }else {
            res.json({flag:3});
        }
    });
});
router.get('/print', function (req, res) {
    var userId=req.query.id;
    console.log(userId);
    var sql=`select * from user where id=?`;
    table(sql,[userId],function (err,rs) {
        if(!err){
            res.json(rs[0])
        }
    })
});
router.get('/change', function(req, res, next) {
    var sql='update user set send=0 where id=?';
    table(sql,[req.query.id],function(err,rs){
        if(!err){
            res.json(rs.affectedRows);
        }
    })
});
router.get('/edit_pwd', function(req, res, next) {
    var userId=req.session.userinfo.id;
    if(req.query.new_pwd!==req.query.re_pwd){
        res.json('两次密码不一致，请重新输入！')
    }else {
        async.waterfall([
            function (done) {
                var sql = `select * from user where id=?`;
                table(sql, [userId], function (err, rs) {
                    if (!err) {
                        if (rs[0].pwd !== req.query.old_pwd)
                            done(1, '原密码错误，请重试！');
                        else
                            done(null, rs[0]);
                    }
                })
            },
            function (prev,done) {
                if (prev){
                    var sql = `update user set pwd=? where id=?`;
                    var params = [req.query.new_pwd, userId];
                    table(sql, params, function (err, rs) {
                        if (!err) {
                            if (rs.affectedRows)
                                done(null, '修改密码成功');
                            else
                                done(1, '数据库操作错误，请稍后再试！');
                        }
                    })
                }
            }
        ],function (err,rs) {
            res.json(rs)
        });
    }
});
module.exports = router;
