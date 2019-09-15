//Carlos Sanchez
//9-12-2019

// ************************************
// * Utilities (Should work anywhere) *
// ************************************
//
// These have no dependencies; all required data should be passed in through
// parameters or whatever. If you need namespacing UGH maybe later

var CLASSES = {
   Content : "content",
   Error : "error",
   Errors : "errors",
   List : "list",
   Hover : "hover",
   Control : "control",
   IconButton : "iconbutton",
   Header : "header",
   Standalone : "standalone",
   Meta : "meta"
};

function GetAjaxSettings(url, data)
{
   var settings = {
      url : url,
      contentType: 'application/json',
      dataType: 'json',
      beforeSend : function(xhr)
      {
         var auth = GetAuthToken();

         if(auth)
            xhr.setRequestHeader("Authorization", "Bearer " + auth);
      }
   };

   if(data !== undefined)
   {
      settings.method = "POST";
      settings.data = JSON.stringify(data);
   }
   else
   {
      settings.method = "GET";
   }

   return settings;
}

function GetResponseErrors(response)
{
   var errors = [];

   if(response.responseJSON && response.responseJSON.errors)
   {
      var rErrors = response.responseJSON.errors;

      for(var k in rErrors) 
         if(rErrors.hasOwnProperty(k))
            errors = errors.concat(rErrors[k]);
   }
   else
   {
      errors.push(response.responseText);
   }

   return errors;
}

function GetAuthToken() { return localStorage.getItem("auth"); }
function SetAuthToken(token) { localStorage.setItem("auth", token); }

function MakeContent(text)
{
   var content = $("<div></div>");
   content.addClass(CLASSES.Content);
   if(text) content.text(text);
   return content;
}

function MakeIconButton(image, color, func)
{
   var button = $("<button></button>"); 
   button.addClass(CLASSES.Control);
   button.addClass(CLASSES.IconButton);
   button.addClass(CLASSES.Hover); 
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
   errorSection.addClass(CLASSES.List + " " + CLASSES.Errors);
   submit.val(submitText);
   submit.addClass(CLASSES.Hover);

   form.append(errorSection);
   form.append(submit);
   errorSection.hide();

   return form;
}

function MakeStandaloneForm(name, submitText)
{
   var form = MakeStandardForm(name, submitText);
   var header = $("<h2></h2>");
   header.addClass(CLASSES.Header);
   header.text(name);
   form.addClass(CLASSES.Standalone);
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

function AddFormError(form, error)
{
   if(!error.length)
      error = [ error ];

   var errors = form.find("." + CLASSES.Errors);
   errors.show()

   for(var i = 0; i < error.length; i++)
   {
      var errorElement = $("<p></p>");
      errorElement.addClass(CLASSES.Error);
      errorElement.text(error[i]);
      errors.append(errorElement);
   }
}

function ClearFormErrors(form)
{
   form.find("." + CLASSES.Errors).hide().empty();
}

function SetFormError(form, error)
{
   ClearFormErrors(form);
   AddFormError(form, error);
}

function SetFormResponseError(form, response)
{
   SetFormError(form, GetResponseErrors(response));
}

function GatherFormValues(form)
{
   var inputs = form.find("input, textarea");
   var values = {};
   inputs.each(function() { values[this.name] = $(this).val()});
   return values;
}

function GatherLoginValues(form)
{
   var values = GatherFormValues(form);
   if(values["username"].indexOf("@") >= 0)
   {
      values["email"] = values["username"];
      values["username"] = undefined;
   }
   return values;
}

function GetFormSubmit(form) { return form.find("input[type='submit']"); }
function AddBeforeSubmit(input, form) { input.insertBefore(GetFormSubmit(form)); }

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
   container.addClass(CLASSES.Content);
   container.addClass("log");

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
