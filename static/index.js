/* ---------------------- Global ---------------------- */

var socket = io.connect();
var _invisPayload = document.getElementById("invis-payload");
var _calendarContainer = document.getElementById("calendar");
var _weatherReport = document.getElementById("weather-report");
var _weatherIcon = document.getElementById("wr-icon");
var _weatherTemp = document.getElementById("wr-temp");
var _weatherTempDetail = document.getElementById("wr-temp-detail");
var _weatherWind = document.getElementById("wr-wind");
var _weatherHum = document.getElementById("wr-hum");
var _weatherSun = document.getElementById("wr-sun");
var _weatherDesc = document.getElementById("wr-desc");
var _weatherForcast = document.getElementById("weather-forcast");
var _weatherForcastItems = document.getElementsByClassName("wf-item");
var _dateContainer = document.getElementById("date");
var _dayOfWeek = document.getElementById("day-of-week");
var _dayOfMonth = document.getElementById("day-of-month");
var _weekofYear = document.getElementById("week-of-year");
var _alarmContainer = document.getElementById("alarm");
var _alarmTime = document.getElementById("alarm-time");
var _alarmAudio = document.getElementById("alarm-audio");
var _sunrise = 0;
var _sunset = 0;


function convertDateToUTC(date) { 
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()); 
}

function insertAfter(newElement, targetElement) {
    var parent = targetElement.parentNode;
    if(parent.lastchild == targetElement)
        parent.appendChild(newElement);
    else 
    	parent.insertBefore(newElement, targetElement.nextSibling);
}

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

String.prototype.toGermanCase = function () {
    return this.replace(/\w\S*/g, function(txt){
    	return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};


/* -------------------- Animations -------------------- */

function fadeOut(object, callback) {
	var op = 1;
	var fadeTimer = window.setInterval(function(){
		if (op <= 0.01) {
			if (callback !== undefined)
				callback();
			clearInterval(fadeTimer);
			
		}
		object.style.opacity = op;
		op -= 0.01;
		
	}, 10);
	return;
}

function fadeIn(object, callback) {
	var op = 0.01;
	var fadeTimer = window.setInterval(function(){
		if (op >= 1.0) {
			if (callback !== undefined)
				callback();
			clearInterval(fadeTimer);
		}
		object.style.opacity = op;
		op += 0.01;
		
	}, 10);
}

/* ----------------------- Clock ----------------------- */

const DAY_NAMES = ["So,", "Mo,", "Di,", "Mi,", "Do,", "Fr,", "Sa,"];
const MONTH_NAMES = ["Jan", "Feb", "März", "April", "Mai", "Juni", "Juli", "Aug", "Sept", "Okt", "Nov", "Dez"];

var clockScroller=Scroller.getNewInstance({
	width:550,
	amount:210,
	interval:500,
	separatorType:Scroller.SEPARATOR.TIME,
	separator:":"
});

clockScroller.appendTo(document.getElementById("clock"));
clockScroller.start("0000");

var timerStart = new Date().getTime();
var timerCounter = 0;
var timerSpeed = 1000;

function clockTimer() {
	var now=new Date();
	//now = new Date(now.getTime() - 3000);
	var hours=now.getHours();
	var minutes=now.getMinutes();
	//var sec = now.getSeconds();
	hours=(hours<10)?"0"+hours:hours+"";
	minutes=(minutes<10)?"0"+minutes:minutes+"";
	//sec=(sec<10)?"0"+sec:sec+"";
	var timeStr=hours+minutes;
	clockScroller.scrollTo(timeStr);
	var real = (timerCounter * timerSpeed),
		ideal = (new Date().getTime() - timerStart);
	timerCounter++;
	window.setTimeout(function() { clockTimer(); }, (timerSpeed - (ideal - real)));
}

clockTimer();


/* ---------------------- Weather ---------------------- */

const WEATHER_ICONS = {
 	2 : {
 		0 : "wi-thunderstorm",
 		1 : "wi-thunderstorm",
 		2 : { 
 			1 : ["wi-thunderstorm", "wi-lightning"]
 		},
 		3 : "wi-storm-showers"
 	},
 	3 : {
 		0 : "wi-sprinkle",
 		1 : "wi-sprinkle",
 		2 : {
 			1 : "wi-showers" 
 		}
 	},
 	5 : {
 		0 : {
 			0 : "wi-sprinkle",
 			1 : "wi-showers",
 			2 : "wi-rain",
 			3 : ["wi-rain", "wi-raindrops"],
 			4 : ["wi-rain", "wi-rain"]
 		},
 		1 : {
 			1 : ["wi-rain", "wi-snowflake-cold"]
 		},
 		2 : "wi-rain-wind",
 		3 : {
 			1 : ["wi-rain-wind", "wi-rain-wind"] 
 		}
 	},
 	6 : {
 		0 : "wi-snow",
 		1 : {
 			1 : "wi-sleet",
 			2 : "wi-sleet",
 			5 : ["wi-showers", "wi-snow"],
 			6 : ["wi-showers", "wi-snow"],
 		},
 		2 : "wi-snow-wind"
 	},
 	7 : {
 		0 : "wi-dust",
 		1 : "wi-smoke",
 		2 : "wi-smog",
 		3 : "wi-sandstorm",
 		4 : "wi-fog",
 		5 : "wi-sandstorm",
 		6 : {
 			1 : "wi-dust",
 			2 : "wi-volcano"
 		},
 		7 : "wi-flood",
 		8 : "wi-hurricane"

 	},
 	8 : {
 		0 : {
 			0 : {
 				"day" : "wi-day-sunny",
 				"night" : "wi-stars"
 			},
 			1 : {
 				"day" : "wi-day-cloudy",
 				"night" : "wi-night-cloudy"
 			},
 			2 : "wi-cloudy",
 			3 : "wi-cloudy",
 			4 : "wi-cloudy-gusts"
 		}
 	},
 	9 : {
 		0 : {
 			0 : "wi-tornado",
 			1 : "wi-gale-warning",
 			2 : "wi-hurricane",
 			3 : "wi-snowflake-cold",
 			4 : "wi-hot",
 			5 : "wi-strong-wind",
 			6 : "wi-meteor"
 		},
 		5 : {
 			1 : "wi-cloud",
 			2 : "wi-windy",
 			3 : "wi-windy",
 			4 : "wi-strong-wind",
 			5 : "wi-strong-wind",
 			6 : ["wi-windy", "wi-strong-wind"],
 			7 : "wi-gale-warning",
 			8 : "wi-gale-warning",
 			9 : "wi-gale-warning"
 		},
 		6 : {
 			0 : "wi-storm-warning",
 			1 : ["wi-storm-warning", "wi-storm-warning"],
 			2 : "wi-hurricane"
 		}
 	}
}
const SUN_ICONS = {
	"day" : ["wi-horizon", "sunset"],
	"night" : ["wi-horizon-alt", "sunrise"]
}

function getWeatherIcon(w, daytime) {
	var wID = ""+w;
	var type = WEATHER_ICONS[wID.slice(0,1)][wID.slice(1,2)];
	var icon = null;
	if (type.hasOwnProperty(wID.slice(2,3)))
		icon = type[wID.slice(2,3)];
	else 
		icon = type;

	if (icon.hasOwnProperty(daytime))
		icon = icon[daytime];

	if (typeof icon === "string")
		return '<i class="wi ' + icon + '"></i>';
	else {
		var iconString = '';
		for (iconPart in icon) 
			iconString += '<i class="wi wi-double ' + icon[iconPart] + '"></i>';
		return iconString;
	}
		
}

function getWindIcon(wind, onlyIcon) {
	wind = round(parseFloat(wind), 1);
	if (wind < 8.0)
		return "";
	var windText = onlyIcon === true ? '' : '<span id="wr-wind-detail">'+wind+'</span>';
	if (wind <= 13.8) {
		// 1 Flagge
		return '<i class="wi wi-small-craft-advisory"></i>'+windText;

	} else if (wind <= 20.7) {
		// 2 Flaggen
		return '<i class="wi wi-gale-warning"></i>'+windText;

	} else if (wind <= 28.4) {
		// 1 Rechteck
		return '<i class="wi wi-storm-warning"></i>'+windText;

	} else if (wind >= 25.5) {
		// 2 Rechtecke
		return '<i class="wi wi-hurricane-warning"></i>'+windText;
	}
}

/* -------------------- Socket Shit -------------------- */

socket.on("weather_report", function(data){
	_sunrise = parseInt(data.sys.sunrise)*1000;
	_sunset = parseInt(data.sys.sunset)*1000;
	var now = new Date();
	var daytime = now.getTime() >= _sunrise ? "day" : "night";
	if (daytime == "day") {
		daytime = now.getTime() >= _sunset ? "night" : "day";
	}
	console.log(data);
	fadeOut(_weatherReport, function(){
		_weatherIcon.innerHTML = getWeatherIcon(parseInt(data.weather[0].id), daytime);
		_weatherTemp.innerHTML = round(data.main.temp, 1);
		if (Math.abs(parseFloat(data.main.temp) - parseFloat(data.main.temp_min)) >= 4.0 ||
			Math.abs(parseFloat(data.main.temp_max) - parseFloat(data.main.temp) >= 4.0)) {
			_weatherTempDetail.innerHTML = round(data.main.temp_min)+'-'+round(data.main.temp_max);
			_weatherTempDetail.innerHTML += '<i class="wi wi-degrees" id="wr-temp-detail-icon"></i>';
		} else
			_weatherTempDetail.innerHTML = "";
		_weatherWind.innerHTML = getWindIcon(10.0, false); //getWindIcon(data.wind.speed, false);
		_weatherHum.innerHTML = data.main.humidity;
		var sunTime = new Date(parseInt(data.sys[SUN_ICONS[daytime][1]])*1000);
		/*var localSunTime = new Date();
		localSunTime.setUTCHours(sunTime.getHours());
		localSunTime.setUTCMinutes(sunTime.getMinutes());
		localSunTime.setUTCSeconds(sunTime.getSeconds());*/
		_weatherSun.innerHTML = '<i class="wi '+SUN_ICONS[daytime][0]+'"></i>';
		_weatherSun.innerHTML += '<span id="wr-sun-detail">'+("0"+sunTime.getHours()).slice(-2)+':'+("0"+sunTime.getMinutes()).slice(-2)+'</span>';
		_weatherDesc.innerHTML = data.weather[0].description.toString().toGermanCase();

		fadeIn(_weatherReport);


	});
});

socket.on("weather_forcast", function(data){
	var now =new Date();
	var daytime = now.getTime() >= _sunrise ? "day" : "night";
	if (daytime == "day") {
		daytime = now.getTime() >= _sunset ? "night" : "day";
	}
	fadeOut(_weatherForcast, function(){
		var list = data.list;
		// 3 6 9 12 18 24
		// 0 1 2 3 5 7
		var sequence = [0, 1, 2, 3, 5 ,7];
		if (new Date(parseInt(list[0].dt)*1000) <= now.getTime())
			sequence = [1, 2, 3, 4, 6 ,8];

		for (var i = 0; i < 6; i++) {
			var w = list[sequence[i]];
			var time = new Date(parseInt(w.dt*1000));
			var html = getWeatherIcon(parseInt(w.weather[0].id), daytime);
			html += '<span class="wf-temp">'+round(parseFloat(w.main.temp))+'<i class="wi wi-degrees"></i></span><br />';
			html += '<span class="wf-time">'+time.getHours()+' Uhr</span>';
			_weatherForcastItems[i].innerHTML = html;

		}

		fadeIn(_weatherForcast);
	});
	

});

socket.on("date", function(data){
	console.log("gotDate");
	fadeOut(_dateContainer, function(){
		var d = new Date();
		_dayOfWeek.innerHTML = DAY_NAMES[d.getDay()];
		_dayOfMonth.innerHTML = d.getDate() + ". " + MONTH_NAMES[d.getMonth()];
		var onejan = new Date(d.getFullYear(), 0, 1);
		_weekofYear.innerHTML = Math.ceil( (((d - onejan) / 86400000) + onejan.getDay() + 1) / 7 ) + " KW";
		fadeIn(_dateContainer);

	});
});


socket.on('calender', function(data){

	fadeOut(_calendarContainer, function(){
		var html = "";
		_calendarContainer.innerHTML = html;
		data.forEach(function(event){
			var start = new Date(event.startDate);
			var end = new Date(event.endDate);
			html += '<div class="cal-event">';
			html += '<div class="cal-starttime">'+('0'+start.getHours()).slice(-2)+':'+('0'+start.getMinutes()).slice(-2);
			html += '<span class="cal-endtime"> - '+('0'+end.getHours()).slice(-2)+':'+('0'+end.getMinutes()).slice(-2)+' Uhr</span></div>';
			html += '<div class="cal-name">'+event.name+"</div></div>";
		});
		_calendarContainer.innerHTML = html;
		fadeIn(_calendarContainer);
	});
	
});

socket.on("alarm_update", function(data) {
	fadeOut(_alarmContainer, function(){

		_alarmTime.innerHTML = data;

		fadeIn(_alarmContainer);
	});
});

socket.on("alarm_ring", function(data){
	_alarmAudio.currentTime = 0;
	_alarmAudio.play();
	_alarmContainer.classList.add("big");
});


socket.on("alarm_stop", function(data){
	_alarmAudio.pause();
	_alarmAudio.currentTime = 0;
	
	fadeOut(_alarmContainer);
	_alarmContainer.classList.remove("big");
	// !*!*!*!*!*!*! data = timer for schlummer ?? !*!*!*!*!*!*! \\
});


socket.on('force_reload', function(data){
	console.log("Will reload");
	var test = setInterval(function(){

		var img = document.createElement("img");
		img.setAttribute("src", "/static/test-img.tif");
		_invisPayload.appendChild(img);
    	img.onload = function()
    	{
    		clearInterval(test);
    	    location.reload(true);
    	};
    	//img.onerror = function()
    	//{
    	//    console.log("oflline");
    	//};
		
	}, 10000);
});