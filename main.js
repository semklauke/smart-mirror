var config = require('./config');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var auth = require('http-auth');
var request = require('request');
var CronJob = require('cron').CronJob;
var iCal = require("ical.js");

app.use('/static', express.static('static'));
app.set('view engine', 'ejs');


function log(string) {
  var d = new Date();
  var hr = d.getHours() < 10 ? "0" + d.getHours().toString() : d.getHours().toString();
  var min = d.getMinutes() < 10 ? "0" + d.getMinutes().toString() : d.getMinutes().toString();
  var sec = d.getSeconds() < 10 ? "0" + d.getSeconds().toString() : d.getSeconds().toString();
  var fullDate = d.getDay() < 10 ? "0" + d.getDay().toString() : d.getDay().toString();
  fullDate += "/";
  fullDate += d.getMonth() < 10 ? "0" + d.getMonth().toString() : d.getMonth().toString();
  fullDate += "/";
  fullDate += d.getYear();

  var t = fullDate + " " + hr + ":" + min + ":" + sec;
  console.log("["+t+"] " + string);
}

var connected = 0;

var basic = auth.basic({
        realm: config.http_auth.realm
    }, function (username, password, callback) { 
        callback(username === config.http_auth.username && password === config.http_auth.password);
    }
);

app.use(auth.connect(basic));

/* ------------ Weather API ------------ */

const weatherReportURL = "http://api.openweathermap.org/data/2.5/weather?units=metric&id="+config.wather.cityid+"&APPID="+config.wather.apikey;
const weatherForcastURL = "http://api.openweathermap.org/data/2.5/forecast?units=metric&id="+config.wather.cityid+"&APPID="+config.wather.apikey;
var lastWeatherReport = "";
var daytime = "";


function sendWeatherReport(sock, force) {
  request(weatherReportURL, (error, res, body)=> {
    if (!error && res.statusCode === 200) {
      var w = JSON.parse(body);
      var sunrise = parseInt(w.sys.sunrise)*1000;
      var sunset = parseInt(w.sys.sunset)*1000;
      var now = new Date();
      var dt = now.getTime() >= sunrise ? "day" : "night";
      if (dt == "day") {
        dt = now.getTime() >= sunset ? "night" : "day";
      }

      if (body !== lastWeatherReport || daytime != dt || force === true) {
        lastWeatherReport = body;
        daytime = dt;
        sock.emit("weather_report", w);
      }
    } else {
      log("Got Weather-API error: ", error, ", status code: ", res.statusCode);
    }
  });
}

function sendWeatherForcast(sock) {
  request(weatherForcastURL, (error, res, body)=> {
    if (!error && res.statusCode === 200) {
      sock.emit("weather_forcast", JSON.parse(body));
    } else {
      log("Got Weather-API error: ", error, ", status code: ", res.statusCode);
    }
  });
}


/* --------------- Alarm --------------- */

var ALARM = null;
var ALARM_TIME = null;

function sendAlarm(timeString) {
  if (timeString.length != 4) {
    log("Error: unexpexted parameter length: "+timeString);
    return {
      "type": "error",
      "desc": "There must be 4 numbers to set the Time"
    };
  }
  var hours = parseInt(timeString.slice(0,2));
  var minutes = parseInt(timeString.slice(2,4));

  var now = new Date();
  var alarmTime = new Date();
  alarmTime.setHours(hours);
  alarmTime.setMinutes(minutes);
  alarmTime.setSeconds(1);

  if (alarmTime.getTime() <= now.getTime())
    alarmTime.setDate(alarmTime.getDate() + 1);
  

  if (ALARM != null) {
    ALARM.stop();
    ALARM = null;
    ALARM_TIME = null;
  }

  ALARM = new CronJob(alarmTime, function() {
    io.emit("alarm_ring");
    ALARM.stop();
    ALARM = null;
    ALARM_TIME = null;
  }, function () {
      /* This function is executed when the job stops */
  },
  true,
  'Europe/Berlin'
  );

  
  ALARM_TIME = ""+("0"+hours).slice(-2)+":"+("0"+minutes).slice(-2);
  io.emit("alarm_update", ALARM_TIME);
  
  return {
    "type": "sucess",
    "desc": "Set Alarm to "+ALARM_TIME
  };
  

}


/* ------------ Express Shit ----------- */

app.get('/', function(req, res) {
  res.render('index');
  res.end();
});

app.get('/force', function(req, res){
  io.emit('force_reload');
  res.send("worked");
  res.end();
});

app.get('/alarm', function(req, res){
  var r = ALARM != null ? ALARM_TIME : "none";
  res.send(r);
  res.end();
});

app.get('/alarm/stop', function(req, res){
  io.emit('alarm_stop');
  res.send("stoped");
  res.end();
});

app.get('/alarm/:time', function(req, res){
  res.send(JSON.stringify(
    sendAlarm(req.params.time.toString())
  ));
  res.end();
});


/* ------------- Calender ------------- */


function sendCalenderData(sock) {
  var calenderEvents = [];
  var finishedRequest = (function() {
    const reqCount = config.calender.length;
    var requests = 0;
    return function() {
      requests++;
      if (requests == reqCount) {
        calenderEvents.sort(function(a,b){ return a.startDate.getTime() - b.startDate.getTime(); });
        sock.emit("calender", calenderEvents);
      }
    }
  })();
  config.calender.forEach(function(calURL){
    request(calURL, (error, res, body)=> {
      if (!error && res.statusCode === 200) {
        var icalData = iCal.parse(body);
        var vcalendar = new iCal.Component(icalData);
        var vevents = vcalendar.getAllSubcomponents("vevent");
        var length = vevents.length;

        var today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(10);
        var tomorrow = new Date();
        tomorrow.setHours(0);
        tomorrow.setMinutes(0);
        tomorrow.setSeconds(10);
        tomorrow.setDate(today.getDate() + 1);
        var startTime = iCal.Time.now().fromJSDate(today);
        var endTime = iCal.Time.now().fromJSDate(tomorrow);

        //log("time: "+startTime.toString()+" - "+endTime.toString());

        veventloop:
        for (var i = 0; i < length; i++) {

          var vevent = new iCal.Event(vevents[i]);
          var expand = vevent.iterator();
          var next = expand.next();

          occurrenceloop:
          for(; next; next = expand.next()) {
            var occurrence = vevent.getOccurrenceDetails(next);  
            if (occurrence.startDate.compare(startTime) >= 0 && occurrence.startDate.compare(endTime) <= 0) {
              calenderEvents.push({
                 "name" : occurrence.item.summary,
                 "startDate" : occurrence.startDate.toJSDate(),
                 "endDate" : occurrence.endDate.toJSDate()
              });
            }
            if (next == undefined || occurrence.startDate.compare(endTime) >= 0) {
              break occurrenceloop;
            }
          } // end occurrenceloop

        } // end veventloop
        finishedRequest();        
      } else {
        log("Got Calender error: ", error, ", status code: ", res.statusCode);
      }
    }); // end request()
  }); // end forEach()

  

}

/* ---------------- Clock --------------- */

// Every Day at 00:00:10
var dateTimer = new CronJob({
  cronTime: '10 00 00 * * *',
  onTick: function() {
      io.emit("date");
      sendCalenderData(io);
  },
  start: true,
  runOnInit: false,
  timeZone: 'Europe/Berlin'
});



// Every 2 minutes
var twoMinutesTimer = setInterval(function(){
  sendWeatherReport(io);
}, 1000 * 60 * 2);

// Every 30 minutes
var halfHourTimer = setInterval(function(){
  sendWeatherForcast(io);
  setTimeout(function(){ sendCalenderData(io); }, 1000);
}, 1000 * 60 * 30);

/* ------------ Socket Shit ------------ */

io.on('connection', function (socket) {

  // -- Root Connection
  var ip = socket.request.connection._peername.address;
  log("user connectet: "+ ip);

  socket.emit("date");
  sendWeatherReport(socket, true);
  setTimeout(function(){ sendWeatherForcast(socket); }, 1000);
  setTimeout(function(){ sendCalenderData(socket); }, 2000);
  if (ALARM != null)
    io.emit("alarm_update", ALARM_TIME);


  // -- on disconnect
  socket.on('disconnect', function(){
    connected--;
    log("user disconnect: " + ip);
  }); // end socket.io disconect



}); // end socket.io connection






/* ------------ Start Server ------------ */

http.listen(config.port, function(){
  log('listening on *:'+config.port);
});