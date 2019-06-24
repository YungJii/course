var formidable = require('formidable');
var fs = require('fs');
var Course = require('../models/Course.js');
var mongoose = require('mongoose');
var url = require('url');


exports.showAdminCourse = function(req, res){
  res.render('admin/course',{
    page : 'course'
  });
}

exports.showAdminCourseimport = function(req, res){
  res.render('admin/course/import',{
    page : 'course'
  });
}

exports.showAdminCoursetadd = function(req, res){
  res.render('admin/course/add',{
    page : 'course'
  });
}


//执行导入JSON数据,进入数据库.这不是一个Ajax接口,是一个同步表单上传接口
exports.doAdminCourseimport = function(req, res){
	var form = new formidable.IncomingForm();
	form.keepExtensions = true;
 	form.uploadDir = "./uploads";
    form.parse(req, function(err, fields, files){
    	if(err){
    		res.send('上传失败');
    	}
    	//得到你上传的文件.发出读取的请求
    	fs.readFile(files.coursejson.path, function(err,data){
    		var dataobj = JSON.parse(data.toString());
    		//先删除之前的所有内容,
    		mongoose.connection.collection('courses').drop(function(){
    			//然后再插入读取的内容
	    		Course.insertMany(dataobj.courses, function(err, r){
	    			if(err){
	    				res.send('上传失败');
	    			}
	    			res.send('成功导入' + r.length + '条课程信息!');
	    		});
    		});    		
    	});
    });
}



exports.getAllCourse = function(req,res){
      //拿到参数
    var rows = parseInt(url.parse(req.url,true).query.rows);
    var page = url.parse(req.url,true).query.page;
    var sidx = url.parse(req.url,true).query.sidx;
    var sord = url.parse(req.url,true).query.sord;
    var keyword = url.parse(req.url,true).query.keyword;



    if(keyword === undefined || keyword == ''){
          var findFilter = {}; //检索所有
        }else{
          //💗💗💗💗💗💗💗💗💗💗💗💗💗💗💗💗💗
          var regexp = new RegExp(keyword , "g");
          //💗💗💗💗💗💗💗💗💗💗💗💗💗💗💗💗💗
          var findFilter =  {
                              $or : [
                                  {'cid' : regexp },
                                  {'name' : regexp },
                                  {'teacher' : regexp },
                                  {'briefintro' : regexp},
                                  {'dayofweek' : regexp}
                              ]
                            }         
        }

    //排序方式，1asc ， -1表示desc
    var sordNumber = sord == "asc" ? 1 : -1;

    //分页算法
    Course.count(findFilter,function(err,count){
        //总页数
        var total = Math.ceil(count / rows);
        //排序、分页
        //参考了博客：http://blog.csdn.net/zk437092645/article/details/9345885
        var sortobj = {};
        //动态绑定一个键  ==>  形如 {'sid' : -1}
        //这里的动态是[sidx]是动态的。可能的值，就是表格列的值了。sid、name、grade、password
        sortobj[sidx] = sordNumber;

        Course.find(findFilter).sort(sortobj).limit(rows).skip(rows * (page - 1)).exec(function(err,results){
            res.json({"records" : count, "page" : page, "total" : total , "rows" : results});
        });

    });
      
}

//修改某个课程
exports.updateCourse = function(req,res){
  var form = new formidable.IncomingForm();

  //得到表单的信息，这部分的信息时jQuery通过Ajax发送的
  form.parse(req, function(err, fields, files){
    //要更改的键名
    var key = fields.cellname;
    //要更改的键的值
    var value = fields.value;
    //课程编号
    var  cid = fields.cid;

    Course.find({'cid' : cid} , function(err, results){
      if(err){
        res.send({'result' : -2});
        return;
      }
      if(results == 0){
        res.send({'result' : -1});
        return;
      }
      //得到学生
      var theCourse = results[0];
      //改
      theCourse.name = fields.name;
      theCourse.dayofweek = fields.dayofweek;
      //split 返回的是一个字符串数组
      theCourse.allow = fields.allow.split(',');
      theCourse.number = fields.number;
      theCourse.teacher = fields.teacher;
      theCourse.briefintro = fields.briefintro;

      //持久化
      theCourse.save(function(err){
          if(err){
            res.send({'result' : -2})
          }

          res.send({'result' : 1});
      });
    })
  })


}

exports.removeCourse = function(req,res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
      // console.log(fields.arr);
      Course.remove({'cid' : fields.arr}, function(err,obj){
        if(err){
          console.log(err);
          res.json({'result' : -1 });
        }
        else{
          res.json({'result' : obj.result.n});
        }
      })
  }); 
}

//添加课程
exports.addCourse = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        if(err){
            console.log('171');
            res.json({"result" : -1});      //-1表示服务器错误
            return;
        }
        var cid = fields.cid;
        // 验证编号是否冲突
        Course.count({"cid" : cid},function(err,count){
            if(err){
                console.log('179');
                res.json({"result" : -1});
                return;
            }
            if(count != 0){
                res.json({"result" : -3});  //-3表示用户名被占用
                return;
            }

            var c = new Course({
              cid    : fields.cid,
              name   : fields.name,
              dayofweek  : fields.dayofweek,
              allow : fields.allow,
              number : fields.number,
              teacher : fields.teacher,
              briefintro : fields.briefintro
            });
            c.save(function(err){
                if(err){
                    console.log('200')
                    res.json({"result" : -1});
                    return;
                }
                res.json({"result" : 1});
            });
        });


    });
}    

