var formidable = require('formidable');

exports.checkLogin = function(req,res,next){
    if(req.session.login != true || req.session.role != 'admin'){
    	res.redirect('/admin/login');
    	return;
    }

    //放行中间件，此时要回到app.js文件中，继续匹配中间件
    next();
}


exports.showAdminDashborad = function(req, res){
   if(req.session.login != true || req.session.role != 'admin'){
    	res.redirect('/admin/login');
    	return;
   }

  res.render('admin/index',{
    page : 'index'
  });
}




exports.showAdminReport = function(req, res){
    res.render('admin/report',{
        page : 'report'
    });
}

exports.showLogin = function(req,res){
	res.render('admin/login',{
    	
  	});
}



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

       	if(sid == 'admin' && password == 'admin'){
       		req.session.login = true;
       		req.session.role = 'admin';
       		res.json({'result' : 1})
       	}else{
       		res.json({'result' : -2 })
       	}
    });
}
