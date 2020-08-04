//Carlos Sanchez
//2-22-2020
//A NEW collection of... something. I gotta stop making libraries.

// ----- Logging -----

function Logger(consoleLog, maxMessages, maxBuffer)
{
   this.messages = [];
   this.consoleLog = consoleLog;
   this.maxMessages = maxMessages || 1000; 
   this.maxBuffer = maxBuffer || 0;
}

Logger.prototype.RawLog = function(message, level)
{
   if(this.consoleLog) 
      console.log("[" + level + "] " + message);

   var messageObject = {message: message, level: level, rawTime: new Date()};
   messageObject.time = messageObject.rawTime.toLocaleTimeString();
   this.messages.push(messageObject);

   if(this.messages.length > this.maxMessages)
      this.messages = this.messages.slice(-(this.maxMessages - this.maxBuffer));
};

Logger.prototype.Debug = function(message) { this.RawLog(message, "debug"); };
Logger.prototype.Info = function(message) { this.RawLog(message, "info"); };
Logger.prototype.Warn = function(message) { this.RawLog(message, "warn"); };
Logger.prototype.Error = function(message) { this.RawLog(message, "error"); };


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
