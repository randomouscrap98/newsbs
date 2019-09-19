//Carlos Sanchez
//9-15-2019
//No dependencies

function Logger()
{
   this.messages = [];
   this.consoleLog = false;
   this.maxMessages = 1000; 
   this.maxBuffer = 0;
}

Logger.prototype.RawLog = function(message, level)
{
   if(this.consoleLog) 
      console.log("[" + level + "] " + message);

   this.messages.push({message: message, level: level, time: new Date()});

   if(this.messages.length > this.maxMessages)
      this.messages = this.messages.slice(-(this.maxMessages - this.maxBuffer));
};

Logger.prototype.Debug = function(message) { this.RawLog(message, "debug"); };
Logger.prototype.Info = function(message) { this.RawLog(message, "info"); };
Logger.prototype.Warn = function(message) { this.RawLog(message, "warn"); };
Logger.prototype.Error = function(message) { this.RawLog(message, "error"); };

