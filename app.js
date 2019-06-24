var express = require('express');
var mongoose = require('mongoose');
var session = require('express-session');
var mainCtrl = require('./controllers/mainCtrl.js');
var adminCtrl = require('./controllers/adminCtrl.js');
var adminStudentCtrl = require('./controllers/adminStudentCtrl.js');
var adminCourseCtrl = require('./controllers/adminCourseCtrl.js');

//创建app
var app = express();
//斜杠后面是数据库的名字
mongoose.connect('mongodb://localhost/420');

mongoose.Promise = require('bluebird');

//使用session
app.use(session({ 
	secret: 'ElectiveCourseRegisterationSystem', 
	cookie: { maxAge: 1000 * 60 * 60 },
	resave: false ,  
	saveUninitialized : true
}));
//设置模板引擎
app.set('view engine','ejs');


//中间件，路由清单
// app.get('/',function(req, res){
// 	res.send('你好');
// })
app.get	 	 ('/admin/login'			,adminCtrl.showLogin);	
app.post	 ('/admin/login'			,adminCtrl.doLogin);	
app.get 	 ('/admin/*'				,adminCtrl.checkLogin); 

app.get 	 ('/admin'					,adminCtrl.showAdminDashborad); 	//管理员界面
app.get 	 ('/admin/student'			,adminStudentCtrl.showAdminStudent);		//admin学生
app.get  	 ('/admin/student/import'	,adminStudentCtrl.showAdminStudentimport);
app.post 	 ('/admin/student/import'	,adminStudentCtrl.doAdminStudentimport);	//表格添加学生
app.get 	 ('/admin/student/add'		,adminStudentCtrl.showAdminStudentadd);
app.get 	 ('/admin/student/download'	,adminStudentCtrl.downloadStudentXlsx);	//下载xlsx表格
app.get 	 ('/student'				,adminStudentCtrl.getAllStudent);			//得到所有学生
app.post  	 ("/student"		    	,adminStudentCtrl.addStudent);				//增加单个学生
app.delete   ("/student"		   		,adminStudentCtrl.removeStudent);			//删除学生
app.post	 ('/student/:sid'			,adminStudentCtrl.updateStudent);	
app.propfind ('/student/:sid'			,adminStudentCtrl.checkStudentExist);		//检查某个学生是否存在

app.get 	 ('/admin/course'			,adminCourseCtrl.showAdminCourse);
app.get  	 ('/admin/course/import'	,adminCourseCtrl.showAdminCourseimport);
app.post 	 ('/admin/course/import'	,adminCourseCtrl.doAdminCourseimport);
app.get 	 ('/admin/course/add'		,adminCourseCtrl.showAdminCoursetadd);
app.get 	 ('/course'					,adminCourseCtrl.getAllCourse);						//得到所有课程
app.post	 ('/admin/course/'			,adminCourseCtrl.updateCourse);			//更新课程
app.delete   ("/course"		   			,adminCourseCtrl.removeCourse);			//删除课程
app.post     ("/course"		   			,adminCourseCtrl.addCourse);			//添加课程

app.get 	 ('/login'					,mainCtrl.showLogin);					//显示登录表单
app.post	 ('/login'					,mainCtrl.doLogin);						//处理登录
app.get 	 ('/'						,mainCtrl.showIndex);					//显示报名表格
app.get 	 ('/logout'					,mainCtrl.doLogout);					//退出登录
app.get 	 ('/changepw'				,mainCtrl.showChangepw);				//更改密码界面
app.post 	 ('/changepw'				,mainCtrl.doChangepw);					//执行更改
app.get 	 ('/check'					,mainCtrl.check);						//检查是否能报名
app.post	 ('/baoming'				,mainCtrl.baoming);						//报名
app.post	 ('/tuibao'					,mainCtrl.tuibao);						//退报
app.get	 	 ('/mycourse'				,mainCtrl.showMycourse);				//显示我的课程
app.get	 	 ('/course/:cid'			,mainCtrl.getCourse);					//课程查询

app.get 	 ('/admin/report'			,adminCtrl.showAdminReport);

//静态资源文件
app.use(express.static('public'));


//设置一个404
app.use(function(req, res){
	res.send('你好，页面不存在');
});


app.listen(3000);
console.log('程序已经运行在3000端口')