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
   button.addClass("hover"); 
   //NOTE: I can't think of any iconbuttons that WON'T be fancy but you never know
   button.css("background-image", "url(" + image + ")");
   button.css("background-color", color);
   button.click(function(){func(button);});
   return button;
}

function MakeStandardForm(name, submitText)
{
   submitText = submitText || name;

   var form = $("<form></form>");
   var errorSection = $("<div></div>");
   var submit = $("<input type='submit'/>")

   form.attr("name", name);
   errorSection.addClass("list");
   submit.val(submitText);
   submit.addClass("hover");

   form.append(errorSection);
   form.append(submit);
   errorSection.hide();

   return form;
}

   //form.submit(function()
   //{
   //   try
   //   {
   //      logger.Info("Submitting form " + name);
   //      submit.attr("data-running", "");
   //      submit(form);
   //   }
   //   catch(ex)
   //   {
   //      submit.removeAttr("data-running");
   //      logger.Error("Error in form " + name + ": " + ex);
   //   }

   //   return false;
   //});


function MakeStandaloneForm(name, submitText)
{
   var form = MakeStandardForm(name, submitText);
   var header = $("<h2></h2>");
   header.addClass("header");
   header.text(name);
   form.addClass("standalone");
   form.prepend(header);
   return form;
}

function MakeInput(name, type, placeholder)
{
   var input = $("<input/>");
   input.attr("type", type);
   input.attr("name", name);
   input.attr("required", "");
   if(placeholder)
      input.attr("placeholder", placeholder);
   return input;
}

function AddBeforeSubmit(input, form)
{
   input.insertBefore(form.find("input[type='submit']"));
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
