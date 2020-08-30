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
}

BasicSpa.prototype.ProcessLink = function(url)
{
   this.logger.Debug("Processing link " + url);

   for(var i = 0; i < this.Processors.length; i++)
   {
      if(this.Processors[i].Check(url))
      {
         try
         {
            this.Processors[i].Process(url);
         }
         catch(ex)
         {
            this.logger.Error("Could not process link " + url + ": " + ex);
         }
         return true;
      }
   }

   this.logger.Warn("Nothing processed link " + url);
   return false;
};

//Generate the click function for the given URL
BasicSpa.prototype.ClickFunction = function(url)
{
   var me = this;
   return function(event)
   {
      event.preventDefault();
      if(url !== document.location.href)
         if(me.ProcessLink(url))
            history.pushState({"url" : url}, url, url);
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
   SubHours : function(hours, date) {
      return new Date((date || new Date()).getTime() - (hours * 60 * 60 * 1000));
   },
   ReSource : function(parent, srcAttr, modify) {
      var srcs = parent.querySelectorAll("[" + srcAttr + "]");
      modify = modify || function(s) { return s; };
      for(var i = 0; i < srcs.length; i++)
         srcs[i].src = modify(srcs[i].getAttribute(srcAttr));
   },
   TimeDiff : function(date1, date2, short, nowBuf) {
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

      t = Math.floor(t);

      if(short)
         return t + u.substr(0, 1);
      else
         return t + " " + u + (t != 1 ? "s" : "");
   },
   GetParams : function(url)
   {
      return new URLSearchParams((url.split("?")[1] || "").split("#")[0]);
   }
};

