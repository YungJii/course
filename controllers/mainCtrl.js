var formidable = require('formidable');
var Student    = require('../models/Student.js');
var Course    = require('../models/Course.js');
var crypto = require('crypto');
var _ = require('underscore');



exports.showLogin = function(req,res){
	res.render('login');
}

//执行登录
exports.doLogin = function(req,res){
    //有两种情况：根据 "changedPassword" : false 还是 true , 来决定：
    //false： 如果用户没有更改密码，此时直接和数据库中比较password字段是否完全一致即可
    //true ： 如果已经更改了密码，此时数据库中存储的是MD5加密后的密码
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        if (err) {
            res.json({'result' : -1 })
            return;
        }
        var sid         = fields.sid;
        var password    = fields.password;

        //1 查询有么有这个学生
        Student.find({'sid' : sid}, function(err,results){
            if (err) {
                res.json({'result' : -1 })  //-1表示服务器错误
                return;
            }

            if(results.length == 0){
                res.json({'result' : -2}); //-2表示没有这个学生
                return;
            }

            //2 检查是否修改过密码
            var ChangedPassword = results[0].ChangedPassword;
            //没改过都是false  所以!changedPassword的值是true
            if(!ChangedPassword){
                //如果这个人没有修改默认密码，则直接和数据库的密码===匹配
                if(results[0].password === password){
                    req.session.login = true;
                    //在session中记录学号
                    req.session.sid = sid;
                    //存储name
                    req.session.name = results[0].name ;
                    //存储这个人是否已经更改过密码
                    req.session.ChangedPassword = false;
                    //这个人的年级
                    req.session.grade = results[0].grade;
                    //最后才时res.json
                    res.json({'result' : 1}); //1表示登录成功
                    return;
                }else{
                    res.json({'result' : -3});//-3表示密码错误 
                    return;
                }
            }else{
                //如果这个人修改过密码，则要将用户输入的密码，进行sha256或者MD5加密后，再和数据库中的密码匹配
                if(results[0].password === crypto.createHash("sha256").update(password).digest("hex")){
                    
                    req.session.login = true;
                    //在session中记录学号
                    req.session.sid = sid;
                    //存储name
                    req.session.name = results[0].name ;
                    //存储这个人是否已经更改过密码
                    req.session.ChangedPassword = true;
                    //这个人的年级
                    req.session.grade = results[0].grade;
                    //最后才时res.json
                    res.json({'result' : 1}); //1表示登录成功
                    return;
                }else{
                    res.json({'result' : -3});//-3表示密码错误 
                    return;
                }
            }
        });
    });
}


//显示报名表格
exports.showIndex = function(req,res){
    if(req.session.role == 'admin'){
        res.send('请以学生身份访问首页')
        return;
    }
    //登录验证，如果你没有携带login的session
    if(req.session.login != true){
        res.redirect('/login');
        return;
    }

    //如果用户没有改过密码，这里还是不允许看首页，要强制跳转更改密码页面
    if(req.session.ChangedPassword == false){
        res.redirect('/changepw');
        return;
    }


    //呈递首页
    res.render('index',{
        //从session中得到sid
        'sid' : req.session.sid,
        'name' : req.session.name,
        'grade' : req.session.grade
    });


    


    

}


exports.doLogout = function(req, res){
    req.session.login = false;
    req.session.sid = '';

    res.redirect('/login');
}

exports.showChangepw = function(req, res){
    //登录验证，如果你没有携带login的session
    if(req.session.login != true){
        res.redirect('/login');
        return;
    }
    res.render('changepw',{
        'sid' : req.session.sid,
        'name' : req.session.name,
        'grade' : req.session.grade,
        //是否显示tip条
        'showtip' : !req.session.ChangedPassword
    });
}


//学生更改密码接口
exports.doChangepw = function(req, res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        var pw = fields.pw;

        //更改密码，不能保存用户的明码，要加密
        Student.find({'sid' : req.session.sid},function(err, results){
            var thestudent = results[0];
            //更改过密码
            thestudent.ChangedPassword = true;
            //重写session
            req.session.ChangedPassword = true;
            //保存更改后的密码
            thestudent.password = crypto.createHash("sha256").update(pw).digest("hex");

            thestudent.save();

            res.json({'result' : 1});
        });
    });
}

//检查课程是否能报名
exports.check = function(req,res){
    if(req.session.login != true){
        res.redirect('/login');
        return;
    }
    var results = {};
    //找到我这个人
    Student.find({'sid' : req.session.sid}, function(err, students){
        var thestudent = students[0];
        //已经报名的课程序号数组
        var mycourses = thestudent.mycourses;
        //这个学生的年级
        var grade = thestudent.grade;
        //已经被占用的星期
        var occupyWeek = [];
        //查询所有课程,查询一次
        Course.find({},function(err,courses){
            //但是需要遍历两次。主从查找
            //第一次遍历，看清全局信息
            //第二次遍历 ，是带着第一次遍历的结果， 回答这门课能不能报名的信息
            //遍历所有课程
            courses.forEach(function(item){
                
                if(mycourses.indexOf(item.cid) != -1){
                    //已经被占用的星期
                    occupyWeek.push(item.dayofweek);
                }
                
            });
            //自此就得到了该学生已经被占用的星期
            //['周二','周三']
            courses.forEach(function(item){           
                if(mycourses.indexOf(item.cid) != -1){
                     //如果已经报名了这个课程
                    results[item.cid] = '已经报名此课';
                }else if(occupyWeek.indexOf(item.dayofweek) != -1){
                    //如果这个课程的星期已经被占用
                    results[item.cid] =  '当天被占用' ;
                }else if(item.number <= 0){
                    //如果人数不够
                    results[item.cid] = '人数不够';
                }else if(item.allow.indexOf(grade) == -1){
                    //如果年级不符合要求
                    results[item.cid] =  '年级不符合要求';
                }else if(occupyWeek.length == 2){
                    //如果年级不符合要求
                    results[item.cid] =  '已达报名上限';
                }else{
                    results[item.cid] =  '可以报名';
                }
            });

            res.json(results);
        });
    })
    
}


exports.baoming = function(req, res){
    //学号
    var sid = req.session.sid;
    //要报名的课程编号
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        var cid = fields.cid;

        Student.find({'sid' : sid},function(err,students){
            students[0].mycourses.push(cid);
            students[0].save(function(){
                Course.find({'cid' : cid}, function(err, courses){
                    courses[0].mystudents.push(sid);
                    courses[0].number--;
                    courses[0].save(function(){
                        res.json({'result' : 1});
                    })
                })
            })
        })
    });
}

exports.tuibao = function(req,res){
    //学号
    var sid = req.session.sid;
    //要报名的课程编号
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var cid = fields.cid;

        Student.find({"sid" : sid },function(err,students){
            students[0].mycourses = _.without(students[0].mycourses,cid);
            students[0].save(function(){
                Course.find({"cid" : cid} , function(err,courses){
                    courses[0].mystudents = _.without(courses[0].mystudents,sid);
                    courses[0].number++;
                    courses[0].save(function(){
                        res.json({"result" : 1});
                    })
                })
            });
        });
    });
}


exports.showMycourse = function(req,res){
    if(req.session.login != true){
        res.redirect('/login');
        return;
    }
    Student.find({'sid' : req.session.sid }, function(err,results){
        var myself = results[0];
        var mycourses = myself.mycourses;
            res.render('mycourse',{
                'sid' : req.session.sid,
                'name' : req.session.name,
                'grade' : req.session.grade,
                'mycourses' : mycourses
            });
    });
}
//150104002     123

exports.getCourse = function(req,res){
    var cid = req.params.cid;

    Course.find({'cid' : cid} , function(err,results){
        res.json({'results' : results});
    })
}