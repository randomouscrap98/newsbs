//Carlos Sanchez
//9-12-2019

// ************************************
// * Utilities (Should work anywhere) *
// ************************************
//
// These have no dependencies; all required data should be passed in through
// parameters or whatever. If you need namespacing UGH maybe later

function MakeContent(text)
{
   var content = $("<div></div>");
   content.addClass("content");
   if(text) content.text(text);
   return content;
}

function MakeIconButton(image, color, func)
{
   var button = $("<button></button>"); 
   button.addClass("control");
   button.addClass("iconbutton");
   button.css("background-image", "url(" + image + ")");
   button.css("background-color", color);
   button.click(function(){func(button);});
   return button;
}

function SetSingletonAttribute(element, container, attribute)
{
   container.find("*").removeAttr(attribute);
   element.attr(attribute, "");
}

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
      {
         console.log("SLICIGN");
         messages = messages.slice(-(maxMessages - maxBuffer));
      }
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
   container.addClass("content");
   container.addClass("log");

   for(var i = 0; i < messages.length; i++)
   {
      var message = MakeContent();
      var time = $("<time></time>");
      var messageText = $("<span></span>")
      time.text(messages[i].time.toLocaleTimeString());
      time.addClass("meta");
      messageText.text(messages[i].message);
      message.addClass(messages[i].level);
      message.append(time);
      message.append(messageText);
      container.append(message);
   }

   return container;
}
