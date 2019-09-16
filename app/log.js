//Carlos Sanchez
//9-15-2019
//Deps: jquery, constants

function CreateLogger(consoleLog, maxMessages, maxBuffer)
{
   //This will be captured... ummm I hope.
   var messages = [];
   maxBuffer = maxBuffer || 0;
   
   var log = function(message, level)
   {
      if(consoleLog) 
         console.log("[" + level + "] " + message);

      messages.push({message: message, level: level, time: new Date()});

      if(messages.length > maxMessages)
         messages = messages.slice(-(maxMessages - maxBuffer));
   };

   return {
      GetMessagesRaw: function() { return messages; },
      GetMessagesHtml: function() { return LogMessagesHtml(messages); },
      Debug : function(message) { log(message, "debug"); },
      Info : function(message) { log(message, "info"); },
      Warn : function(message) { log(message, "warn"); },
      Error : function(message) { log(message, "error"); },
      LogRaw : function(message, level) { log(message, level); }
   };
}

function LogMessagesHtml(messages)
{
   var container = $("<div></div>");
   container.addClass(CLASSES.Content);
   container.addClass(CLASSES.Log);

   for(var i = 0; i < messages.length; i++)
   {
      var message = MakeContent();
      var time = $("<time></time>");
      var messageText = $("<span></span>")
      time.text(messages[i].time.toLocaleTimeString());
      time.addClass(CLASSES.Meta);
      messageText.text(messages[i].message);
      message.addClass(messages[i].level);
      message.append(time);
      message.append(messageText);
      container.append(message);
   }

   return container;
}
