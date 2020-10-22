//Carlos Sanchez
//2-22-2020
//A NEW collection of... something. I gotta stop making libraries.

// ----- Logging -----

function Logger(consoleLog, maxMessages, maxBuffer)
{
   this.messages = [];
   this.consoleLog = consoleLog || true;
   this.maxMessages = maxMessages || 5000; 
   this.maxBuffer = maxBuffer || 500;
   this.lastId = 0;
}

Logger.prototype.RawLog = function(message, level)
{
   if(this.consoleLog) 
      console.log("[" + level + "] " + message);

   var messageObject = { message: message, level: level, rawTime: new Date(),
      id : ++this.lastId };

   messageObject.time = messageObject.rawTime.toLocaleTimeString();
   this.messages.push(messageObject);

   if(this.messages.length > this.maxMessages)
      this.messages = this.messages.slice(-(this.maxMessages - this.maxBuffer));
};

Logger.prototype.Trace = function(message) { this.RawLog(message, "trace"); };
Logger.prototype.Debug = function(message) { this.RawLog(message, "debug"); };
Logger.prototype.Info = function(message) { this.RawLog(message, "info"); };
Logger.prototype.Warn = function(message) { this.RawLog(message, "warn"); };
Logger.prototype.Error = function(message) { this.RawLog(message, "error"); };

//The singleton logger if you want it
var log = new Logger();


// ----- SPA (Single Page Application) -----

function SpaProcessor(check, process) 
{ 
   this.Check = check;
   this.Process = process;
}

//Basic: a function checks a url. If it processed it, it returns true.
function BasicSpa(logger)
{
   //Capitals are accessible from other places
   this.logger = logger;
   this.Processors = [];
   this.requestId = 0;
}

BasicSpa.prototype.ProcessLink = function(url)
{
   let rid = ++this.requestId;
   this.logger.Debug("Processing link [" + rid + "] " + url);

   for(var i = 0; i < this.Processors.length; i++)
   {
      if(this.Processors[i].Check(url, rid))
      {
         try
         {
            this.Processors[i].Process(url, rid);
         }
         catch(ex)
         {
            this.logger.Error("Could not process link [" + rid + "] " + url + ": " + ex);
         }
         return true;
      }
   }

   this.logger.Warn("Nothing processed link [" + rid + "] " + url);
   return false;
};

BasicSpa.prototype.SpaContextLink = function(url)
{
   var hash = url.indexOf("#");
   if(hash >= 0)
      return url.substr(0, hash);
   return url;
};

BasicSpa.prototype.ProcessLinkContextAware = function(url)
{
   if(this.SpaContextLink(url) !== this.SpaContextLink(document.location.href))
      if(this.ProcessLink(url))
         history.pushState({"url" : url}, url, url);
};

//Generate the click function for the given URL
BasicSpa.prototype.ClickFunction = function(url)
{
   var me = this;
   return function(event)
   {
      event.preventDefault();
   };
};

//Set this object (us) to handle the window pop state (back/forward) 
BasicSpa.prototype.SetHandlePopState = function()
{
   var me = this;
   window.onpopstate = function(event)
   {
      me.logger.Debug("User browser navigated back/forward to " + document.location.href);
      me.ProcessLink(document.location.href);
   };
};

// ----- Signalling (that one paradigm ugh) -----

var Signaller = function()
{
   this.signals = {};
   this.handlers = {};
   this.autoexceptions = [];
   this.sid = 0;
}

Signaller.prototype.AddAutoException = function(name)
{
   this.autoexceptions.push(name);
};

Signaller.prototype.Add = function(name, data, time)
{
   //console.log("Adding signal "+name);
   let signalId = ++this.sid;

   if(!name)
      throw "Must provide name for signal!";

   if(!this.signals[name])
      this.signals[name] = [];

   this.signals[name].push({
      sid : signalId,
      created : performance.now(),
      data : data,
      time : time || 0
   });
};

Signaller.prototype.Attach = function(name, func)
{
   if(!this.handlers[name])
      this.handlers[name] = [];

   if(func)
      this.handlers[name].push(func);
};

Signaller.prototype.ProcessAuto = function(now)
{
   for(key in this.signals)
   {
      if(this.autoexceptions.indexOf(key) < 0)
         this.Process(key, now);
   }
};

Signaller.prototype.Process = function(name, now)
{
   if(this.signals[name] && this.signals[name].length)
   {
      //console.log("Processing " + name);
      var now = now || performance.now();
      this.signals[name].sort((a,b) => Math.sign(a.time - b.time) ||
         Math.sign(a.sid - b.sid));
      var i;

      for(i = 0; i < this.signals[name].length; i++)
      {
         if(this.signals[name][i].time > now)
            break;

         if(this.handlers[name])
         {
            this.handlers[name].forEach(x => 
               x(this.signals[name][i].data, this.signals[name][i]));
         }
      }

      this.signals[name].splice(0, i);
   }
};

Signaller.prototype.ClearOlderThan = function(time)
{
   for(key in this.signals)
   {
      this.signals[key].sort((a,b) => Math.sign(a.created - b.created));
      var firstOK = this.signals[key].findIndex(x => x.created >= time);
      this.signals[key].splice(0, (firstOK < 0) ? this.signals[key].length : firstOK);
   }
};

var signals = new Signaller();

// ----- Utilities (various functions) -----

var Utilities = 
{
   WindowWidth : function() { 
      return window.innerWidth || document.documentElement.clientWidth || 
         document.body.clientWidth || 0; },
   WindowHeight : function(){ 
      return window.innerHeight || document.documentElement.clientHeight || 
         document.body.clientHeight || 0; },
   ConvertRem : function(x){ 
      return x / parseFloat(getComputedStyle(document.body)["font-size"]); },
   //Taken from https://stackoverflow.com/a/50127768/1066474
   SortElements : function(parent, sortFunc, descending){
      descending = descending ? -1 : 1;
      [...parent.children]
         .sort((a,b)=>descending*((sortFunc(a)>sortFunc(b))?1:-1))
         .forEach(node=>parent.appendChild(node));
   },
   RemoveElement : function(element) {
      var p = element.parentNode;
      p.removeChild(element);
      return p;
   },
   SubHours : function(hours, date) {
      return new Date((date || new Date()).getTime() - (hours * 60 * 60 * 1000));
   },
   ReSource : function(parent, srcAttr, modify) {
      var srcs = parent.querySelectorAll("[" + srcAttr + "]");
      modify = modify || function(s) { return s; };
      for(var i = 0; i < srcs.length; i++)
         srcs[i].src = modify(srcs[i].getAttribute(srcAttr));
   },
   TimeDiff : function(date1, date2, short, nowBuf, decimals) {
      decimals = decimals || 0;
      nowBuf = nowBuf || 5;
      date2 = date2 || new Date(); //Now
      if(typeof date1 === "string")
         date1 = new Date(date1.trim());
      if(typeof date2 === "string")
         date2 = new Date(date2.trim());
      var diff = Math.abs(date1.getTime() - date2.getTime()) / 1000;
      var t = 0, u = "";

      if(diff <= nowBuf) { return short ? "Now" : "Just now"; }
      else if(diff < 60) { t = diff; u = "second"; }
      else if(diff < 3600) { t = diff / 60; u = "minute"; }
      else if(diff < 86400) { t = diff / 3600; u = "hour"; }
      else { t = diff / 86400; u = "day"; }

      var trans = Math.pow(10, decimals);
      t = Math.floor(t * trans) / trans;

      if(short)
         return t + u.substr(0, 1);
      else
         return t + " " + u + (t != 1 ? "s" : "");
   },
   GetParams : function(url)
   {
      return new URLSearchParams((url.split("?")[1] || "").split("#")[0]);
   },
   FindParent : function(element, pfind, maxDepth)
   {
      if(maxDepth === undefined)
         maxDepth = 100;
      if(maxDepth < 0)
         return null;

      if(pfind(element))
         return element;
      else if (!element)
         return null;
      else
         return Utilities.FindParent(element.parentNode, pfind, maxDepth - 1);
   },
   InsertAfter : function(newelm, afterthis)
   {
      //https://stackoverflow.com/a/4793630/1066474
      afterthis.parentNode.insertBefore(newelm, afterthis.nextSibling);
   },
   ShallowEqual : function (object1, object2) 
   {
      const keys1 = Object.keys(object1);
      const keys2 = Object.keys(object2);

      if (keys1.length !== keys2.length)
         return false;

      for (let key of keys1)
         if (object1[key] !== object2[key])
            return false;

      return true;
   },
   ShallowCopy : function(value)
   {
      return JSON.parse(JSON.stringify(value));
   },
   MergeInto : function (base, newthing) 
   {
      var keys = Object.keys(newthing);

      for (let key of keys)
         base[key] = newthing[key];

      return base;
   },
   ParseYoutube :	function (url) 
   {
      var result = { id : null };
		var match = url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/);
      if(match)
      {
         result.id = match[1]
         var start = url.match(/[&?](?:t|start)=(\w+)/);
         var end = url.match(/[&?](?:end)=(\w+)/);
         if(start) result.start = start;
         if(end) result.end = end;
         result.loop = url.match(/[&?]loop(=|&|$)/);
      }
		return result; 
	},
   SetSelected : function(select, value)
   {
      var options = select.querySelectorAll("option");

      for(var i = 0; i < options.length; i++)
         if(options[i].value === value)
            select.selectedIndex = i;
   },
   ScrollToBottom : function(element)
   {
      //Firefox literally doesn't accept numbesr that are TOO big
      element.scrollTop = 9999999; //Number.MAX_SAFE_INTEGER;
   },
   //https://stackoverflow.com/a/11077016/1066474
   InsertAtCursor : function (myField, myValue) 
   {
      //IE support
      if (document.selection) {
         myField.focus();
         sel = document.selection.createRange();
         sel.text = myValue;
      }
      //MOZILLA and others
      else if (myField.selectionStart || myField.selectionStart == '0') {
         var startPos = myField.selectionStart;
         var endPos = myField.selectionEnd;
         myField.value = myField.value.substring(0, startPos)
         + myValue
         + myField.value.substring(endPos, myField.value.length);
      } else {
         myField.value += myValue;
      }
   }
};

//Taken from 12 mostly without modification: https://github.com/12Me21/sbs2
var StolenUtils = 
{
   AttachResize: function(element, tab, horiz, dir, save) 
   {
      var startX,startY,held,startW,startH,size = null
      function getPos(e) {
         if (e.touches)
            return {x:e.touches[0].pageX, y:e.touches[0].pageY}
         else
            return {x:e.clientX, y:e.clientY}
      }
      function down(e) {
         tab.setAttribute('dragging',"")
         var pos = getPos(e)
         startX = pos.x
         startY = pos.y
         startW = element.offsetWidth
         startH = element.offsetHeight
         held = true
      }
      function up() {
         held = false
         tab.removeAttribute('dragging')
         if (save && size != null)
            localStorage.setItem(save, JSON.stringify(size))
      }
      function move(e) {
         if (!held)
            return
         var pos = getPos(e)
         if (horiz) {
            var vx = (pos.x - startX) * dir
            size = Math.max(0, startW+vx)
            element.style.width = size+"px"
         } else {
            var vy = (pos.y - startY) * dir
            size = Math.max(0, startH+vy)
            element.style.height = size+"px"
         }
      }	
      tab.addEventListener('mousedown', down)
      document.addEventListener('mouseup', up)
      document.addEventListener('mousemove', move)
      
      tab.addEventListener('touchstart', function(e) {
         e.preventDefault()
         down(e)
      }) //todo: prevent scrolling on mobile
      document.addEventListener('touchend', up)
      document.addEventListener('touchmove', move)
      if (save) {
         size = JSON.parse(localStorage.getItem(save))
         if (size) {
            size = Math.max(0, +size)
            if (horiz)
               element.style.width = size+"px"
            else
               element.style.height = size+"px"
         }
      }
   }
};

/* //12me namespacing
var Name = Object.create(null)
with (Name) (function($) {
Object.assign(Name, {

 function1: function(a,b) {
   return a+function2(b)
 },
 function2: function(x) {
  return x+whatever
 },
 whatever: 4,
})

var aaaaa

}(window))*/
