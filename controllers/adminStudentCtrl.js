var formidable = require('formidable');
var path = require('path');
var fs = require('fs');
var url = require('url');
var xlsx = require('node-xlsx');
var Student = require('../models/Student.js');
var dateformat= require('date-format');





exports.showAdminStudent = function(req, res){
	res.render('admin/student',{
		page : 'student'
	});
}



exports.showAdminStudentimport = function(req, res){
	res.render('admin/student/import',{
		page : 'student'
	});
}

exports.showAdminStudentadd = function(req, res){
  res.render('admin/student/add',{
      page : 'student'
  });
}





//增加学生
exports.addStudent = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        if(err){
            res.json({"result" : -1});      //-1表示服务器错误
            return;
        }
        //验证数据有效性

        //① 验证学号必须是9位数字
        var sid = fields.sid;
        //验证9位是不是满足
        if(!/^[\d]{9}$/.test(sid)){
            res.send({"result" : -2});      //-2表示用户名不合规范
            return;
        }

        //② 验证姓名是否合法
        var nameTxt = fields.name;
        //验证
        if(!/^[\u4E00-\u9FA5]{2,5}(?:·[\u4E00-\u9FA5]{2,5})*$/.test(nameTxt)){
            res.send({"result" : -4});      //-4表示用户名不合规范
            return;
        }


        //③ 验证年级是否合法
        //年级
        var grade = fields.grade
        //验证
        if(!grade){
            res.json({"result" : -5});  //-5表示年级没有选择
            return;
        }

        //④ 验证密码强度
        //姓名
        var password = fields.password;
        //验证
        if(checkStrength(password) != 3){
            res.json({"result" : -6});  //密码强度有问题
            return;
        }


        //上网抄的正则密码强度验证http://www.cnblogs.com/yjzhu/p/3394717.html
        function checkStrength(password){
            //积分制
            var lv = 0;
            if(password.match(/[a-z]/g)){lv++;}
            if(password.match(/[0-9]/g)){lv++;}
            if(password.match(/(.[^a-z0-9])/g)){lv++;}
            if(password.length < 6){lv=0;}
            if(lv > 3){lv=3;}

            return lv;
        }

        //⑤ 验证学号是否冲突
        Student.count({"sid" : sid},function(err,count){
            if(err){
                res.json({"result" : -1});
                return;
            }
            if(count != 0){
                res.json({"result" : -3});  //-3表示用户名被占用
                return;
            }


            var s = new Student({
                sid    : fields.sid,
                name   : fields.name,
                grade  : fields.grade,
                password : fields.password
            });
            s.save(function(err){
                if(err){
                    res.json({"result" : -1});
                    return;
                }
                res.json({"result" : 1});
            });
        });
    });
}


exports.removeStudent = function(req,res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
      // console.log(fields.arr);
      Student.remove({'sid' : fields.arr}, function(err,obj){
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


//执行表格的上传
exports.doAdminStudentimport = function(req, res){
	var form = new formidable.IncomingForm();
  //保持文件拓展名
	form.keepExtensions = true;
 	form.uploadDir = "./uploads";
    form.parse(req, function(err, fields, files) {
      if(!files.studentexcel){
      	res.send('对不起，请上传文件');
      	return;
      }

    //检查拓展名是否正确	
      if(path.extname(files.studentexcel.name) != '.xlsx'){      	
      	//删除这个不正确的文件
      	fs.unlink('./' + files.studentexcel.path,function(err){
      		if(err){
      			console.log('adminCtrl:54');
      			return;
      		}
      		res.send('类型不正确，已删除');
      	});
      	return;
      }

      // var workSheetsFromFile = xlsx.parse(__dirname + "/a.xlsx");
      //读取Excel表格,同步语句，没有回调函数
      var workSheetsFromFile = xlsx.parse('./' + files.studentexcel.path);
      //检查数组是不是符合规范
      if(workSheetsFromFile.length != 6){
      	res.send('系统检查你的Excel表格缺少子表格');
      	return;
      }
      //循环检查每个表的表头是否完整
      for(var i = 0; i < 6; i++){
      	if( workSheetsFromFile[i].data[0][0] != '学号'
      	 || workSheetsFromFile[i].data[0][1] != '姓名'
      	 )
	      	{
		      	res.send('系统检查你的Excel表格' + i + '号子表的表头不正确，请保证6个年纪的的子表的表头都有学号，姓名');
		      	return;
	      	}
      }
      //至此，我们认为workSheetsFromFile数组是一个合法的数据了
      //命令Mongoose将数据存储到数据库中
      Student.importStudent(workSheetsFromFile);


      res.send('上传成功！');
    });
}


//全部学生的数据，被jqGrid限制API形式。
//并且这个接口是用GET请求发送来的
//    student?_search=false&nd=1556087845070&rows=2&page=1&sidx=sid&sord=asc
exports.getAllStudent = function(req,res){
    //验证登录
    // if(req.session.login != true){
    //     res.redirect('/login');
    //     return;
    // }
    //拿到参数
    var rows = parseInt(url.parse(req.url,true).query.rows);
    var page = url.parse(req.url,true).query.page;
    var sidx = url.parse(req.url,true).query.sidx;
    var sord = url.parse(req.url,true).query.sord;
    var keyword = url.parse(req.url,true).query.keyword;

    //parse(req.url,true)这个true的作用是把search=false&nd=1556096071892&rows=10&page=1&sidx=sid&sord=asc肢解为
    //数组
    //{ _search: 'false',
    //  nd: '1556096031560',
    //  rows: '10',
    //  page: '1',
    //  sidx: 'sid',
    //  sord: 'asc' 
    // }
    //如果不设置，那么默认是false也就是search=false&nd=1556096071892&rows=10&page=1&sidx=sid&sord=asc
    // console.log(url.parse(req.url).query.page);

    if(keyword === undefined || keyword == ''){
          var findFilter = {}; //检索所有
        }else{
          //使用正则表达式的构造函数来将字符串转为正则对象。因为keyword是String类型
          //eval('/' + keyword + '/g')返回的也是正则对象
          var regexp = new RegExp(keyword , "g");
          var findFilter =  {
                              $or : [
                                  {'sid' : regexp },
                                  {'name' : regexp },
                                  {'grade' : regexp }
                              ]
                            }         
        }

    //排序方式，1asc ， -1表示desc
    var sordNumber = sord == "asc" ? 1 : -1;

    //分页算法
    Student.count(findFilter,function(err,count){
        //总页数
        var total = Math.ceil(count / rows);
        //排序、分页
        //参考了博客：http://blog.csdn.net/zk437092645/article/details/9345885
        var sortobj = {};
        //动态绑定一个键  ==>  形如 {'sid' : -1}
        //这里的动态是[sidx]是动态的。可能的值，就是表格列的值了。sid、name、grade、password
        sortobj[sidx] = sordNumber;
        //sortobj存储的是一个KV对
        // console.log(sortobj);
        //这是一个结合了排序、分页的大检索
        //为什么要暴露records、page、total、rows这些键，都是jqGrid要求的
        //请看     http://blog.mn886.net/jqGrid/ ，  左侧点击新手demo
        //它的API：http://blog.mn886.net/jqGrid/JSONData
        //这里有find()完之后要先排序，然后才是分页
        //'rows'：results 才是数据库的内容，其他是陪跑的，也就是插件要用就必须得给不然显示不出来

        
        

        
        
        // var regexp = eval('/' + keyword + '/g');
        Student.find(findFilter).sort(sortobj).limit(rows).skip(rows * (page - 1)).exec(function(err,results){
            results.forEach(function(item){
              if(item.ChangedPassword){
                item.password = '用户已经更改默认密码';
              }
            })
            res.json({"records" : count, "page" : page, "total" : total , "rows" : results});
        });

         // Student.find({}).sort(sortobj).limit(rows).skip(rows * (page - 1)).then(data=>
         //    function(err,results){
         //      if(err){
         //        console.log(err)
         //      }
         //      res.json({"records" : count, "page" : page, "total" : total , "rows" : results});
         //    }
         // );
    });
      
}


exports.updateStudent = function(req,res){
  var sid = parseInt(req.params.sid);
  var form = new formidable.IncomingForm();

  //得到表单的信息，这部分的信息时jQuery通过Ajax发送的
  form.parse(req, function(err, fields, files){
    //要更改的键名
    var key = fields.cellname;
    //要更改的键的值
    var value = fields.value;

    Student.find({'sid' : sid} , function(err, results){
      if(err){
        res.send({'result' : -2});
        return;
      }
      if(results == 0){
        res.send({'result' : -1});
        return;
      }
      //得到学生
      var theStudent = results[0];
      //改
      theStudent[key] = value;

      //如果更改的是密码这个项目，此时就应该将密码变为没有更改
      if(key == 'password'){
        theStudent.ChangedPassword = false;
      }
      //持久化
      theStudent.save(function(err){
          if(err){
            res.send({'result' : -2})
          }

          res.send({'result' : 1});
      });
    })
  })


}

//propfind类型接口，检查学生是否存在
exports.checkStudentExist = function(req, res){

    var sid = parseInt(req.params.sid);
    if(!sid){
      res.json({'result' : -1 });
        return;
    }
    Student.count({'sid' : sid}, function(err,count){
        if(err){
          res.json({'result' : -1 });
          return;
        }
        res.json({'result' : count});
      }
    )
}


//下载全部学生表格
//http://127.0.0.1:3000/admin/student/download
//迭代器在这里的作用：解决异步语句发生的问题，并不能初一初二。。。这样子的排序
//所以,当读取完初一后采取调用iterator(1)初二,让本来没有顺序的异步函数变成有顺序的同步函数
exports.downloadStudentXlsx = function(req,res){
  var TableR = []; 
  var gradeArr = ['初一','初二','初三','高一','高二','高三'];

  //i为0,1,2,3,4,5表示初一初二初三..
  function iterator(i){
      if( i == 6){
        //此时Table中已经是6个年级的大数组了
        // console.log(TableR);
        var buffer = xlsx.build(TableR);
        var filename = dateformat('学生清单yyyy年MM月dd日hhmmssSSS', new Date());
        //生成,生成到服务器上面的文件夹,也就是uploads里面,
        //用户想要下载到自己的电脑上面,Http指向这个文件
        fs.writeFile('./public/xlsx/' + filename + '.xlsx', buffer, function(err){
          // console.log('ok');
          //重定向!让用户的这次HTTP请求不再指向http://127.0.0.1:3000/admin/student/download
          //而是直接跳转到这个xlsx文件上
          //而跳转到puclic静态文件上就会直接给下载到用户的电脑上面
          res.redirect('/xlsx/' + filename + '.xlsx');
        });
        return;
      }
      //,function(err,results){}是回调函数,在回调函数里面再调用本身函数 ==> iterator(++i)
      //这种模式就是迭代器的模式
      Student.find({'grade' : gradeArr[i]}, function(err,results){
        var sheetR = [];
        results.forEach(function(item){
            sheetR.push([
              item.sid,
              item.name,
              item.grade,
              item.password
            ]);
        });
        TableR.push({ name : gradeArr[i] , data : sheetR});

        iterator(++i); //回到了 adminCtrl.js 355的位置
      });
  }
  iterator(0);
} 
