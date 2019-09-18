//Carlos Sanchez
//9-11-2019

var CONST =
{
   MaxLogMessages : 5000,
   LogMessageEraseBuffer : 500,
   LogConsole : true,
   Inputs : "input, button, textarea"
};

var EMain = false;
var Log = CreateLogger(CONST.LogConsole, CONST.MaxLogMessages, CONST.LogMessageEraseBuffer);

$( document ).ready(function()
{
   Log.Info("Document ready: loading website");

   try
   {
      var cache = $("#cache");

      //Before doing ANYTHING, start preloading images. 
      for(var key in IMAGES)
      {
         if(IMAGES.hasOwnProperty(key) && key.indexOf("Root") < 0)
            $("<img/>").attr("src", IMAGES[key]).appendTo(cache);
      }

      Log.Debug("Preloading images");

      EMain = {
         LeftPane : $("#leftpane"),
         LeftScroller : $("#leftscroller"),
         RightPane : $("#rightpane"),
         SmallNav : $("#smallnav"),
         Cache : cache
      };
      
      Log.Debug("Cached all desired elements");

      ResetSmallNav();
      EMain.SmallNav.children().first().click();
   }
   catch(ex)
   {
      Log.Error("Could not setup website: " + ex);
   }

   Log.Info("Website loaded (pending content)");
});

function CreateHome()
{
   Log.Debug("Creating Homepage");

   var main = MakeSection();
   var header = $("<h1>SmileBASIC Source</h1>");
   var about = MakeContent("One day, this might become something??? I've said that about " +
      "quite a few projects though... none of which went anywhere");
   var explain = MakeContent("Some things: Yes, the sidebar will be collapsible and maybe " +
      "even resizable. No, nothing is final. No, I'm not focusing on ultra-old " +
      "devices first, although I am looking for it to be stable on at least " +
      "sort-of old things. Yes, I'm really using jquery, it's here to stay. " +
      "No, I'm not going to use 1 million libraries; just jquery and MAYBE one " +
      "or two other things. I'm trying to make the underlying html and css as " +
      "simple as possible to both understand and manipulate... I don't want to have a mess " +
      "just as much as anybody else trying to manipulate this crap.\n\nYes, I'm " +
      "trying to fit the entire website into one window. Yes, everything will " +
      "be AJAX and done through jquery (sorry non-js people). Yes, IF I get time, " +
      "I still plan on an 'ultra low-end no js' version of the website, but that's " +
      "only if people still need that after I'm finished with this one. Yes I'm " +
      "open to suggestions, but I'm trying to avoid feature creep so unless it's " +
      "super pressing, I might hold off on it. Yes, the website database gets " +
      "reset every time I publish; when the website WORKS I will stop doing " +
      "that.\n\n\nOh one more thing: this is running off a junky little " +
      "laptop at home with bad internet. Sorry if at any point it's bad.");
   main.append(header);
   main.append(about);
   main.append(explain);

   return main;
}

function CreateLogin()
{
   Log.Debug("Creating Login/Register page");

   var main = MakeSection();
   var registerNotes = MakeContent("Registering is a bit of a hassle right now " + 
      "sorry. You must first use the register form to make your account. You will " +
      "only know it succeeded because there's a green checkmark. Then you must " +
      "send the confirmation email. Again, a green checkmark. NEXT, you get the " +
      "code from the email and put it in the 'Confirm' form. If you get another " +
      "green checkbox, hey, now you can login!");
   main.append(CreateLoginForm());
   main.append(registerNotes);
   main.append(CreateRegisterForm());
   main.append(CreateEmailSendForm());
   main.append(CreateRegisterConfirmForm());

   return main;
}

function CreateLoginForm()
{
   var form = MakeStandaloneForm("Login");
   AddBeforeSubmit(MakeInput("username", "text", "Username/Email"), form);
   AddBeforeSubmit(MakeInput("password", "password", "Password"), form);
   SetupFormAjax(form, API.Authorize, GatherLoginValues, SingleUseFormSuccess);
   return form;
}

function CreateRegisterForm()
{
   var form = MakeStandaloneForm("Register");
   AddBeforeSubmit(MakeInput("email", "email", "Email"), form);
   AddBeforeSubmit(MakeInput("username", "text", "Username"), form);
   AddPasswordConfirm(form);
   SetupFormAjax(form, API.Users, GatherPasswordConfirmValues, SingleUseFormSuccess);
   return form;
}

function CreateEmailSendForm()
{
   var form = MakeStandaloneForm("Send Confirmation Email", "Send");
   AddBeforeSubmit(MakeInput("email", "email", "Email"), form);
   SetupFormAjax(form, API.SendEmail, GatherFormValues, SingleUseFormSuccess);
   return form;
}

function CreateRegisterConfirmForm()
{
   var form = MakeStandaloneForm("Confirm Registration", "Confirm");
   AddBeforeSubmit(MakeInput("confirmationKey", "text", "Email Code"), form);
   SetupFormAjax(form, API.ConfirmEmail, GatherFormValues, SingleUseFormSuccess);
   return form;
}

// ****************************************
// * WARN: FUNCTIONS DEPENDING ON GLOBALS *
// ****************************************
//
// These are essentially scripts
 
function RunBasicAjax(url, data)
{
   return $.ajax(GetAjaxSettings(url, data)).done(function(data)
   {
      Log.Debug(url + " SUCCESS: " + JSON.stringify(data));
   }).fail(function(data)
   {
      if(data && data.responseText && data.responseJSON)
         data.responseText = undefined;
      Log.Warn(url + " FAIL: " + JSON.stringify(data));
   });
}

function SetupFormAjax(form, url, dataConverter, success)
{
   var inputs = form.find(CONST.Inputs);
   var submit = GetFormSubmit(form);
   var startRunning = function() 
   { 
      inputs.prop('disabled', true);
      submit.attr(ATTRIBUTES.Running, ""); 
      ClearFormErrors(form); //Assume that if you're RUNNING, it's a "new slate" so forget old errors
   };
   var stopRunning = function() 
   { 
      inputs.prop('disabled', false);
      submit.removeAttr(ATTRIBUTES.Running); 
   };

   if(!submit)
   {
      Log.Error("No 'submit' input on form for " + url);
      return;
   }

   form.submit(function()
   {
      try
      {
         startRunning();
         var ajax = RunBasicAjax(url, dataConverter(form));
         ajax.always(stopRunning);
         ajax.done(function(data, status, xhr)
         {
            if(success) success(form,data,status,xhr);
         });
         ajax.fail(function(data)
         {
            SetFormResponseError(form, data);
         });
      }
      catch(ex)
      {
         stopRunning();
         Log.Error("Exception during form submit:" + ex);
         SetFormError(form, ex);
      }
      return false;
   });
}

//Setting active CONTENT will update the left pane. Anything can be content...
function SetActiveContent(element, content)
{
   //One day this may also need to disable background ajax or whatever. It'll
   //need to do MORE than just set a singleton attribute for the entire right pane.
   SetSingletonAttribute(element, EMain.RightPane, ATTRIBUTES.Active);
   SetDisplayedContent(content);
}

function MakeSmallNavButton(icon, color, contentFunc)
{
   return MakeIconButton(icon, color, function(b)
   {
      try
      {
         SetActiveContent(b, contentFunc());
      }
      catch(ex)
      {
         Log.Warn("Could not click small nav button: " + ex);
      }
   });
}

function SetDisplayedContent(content)
{
   EMain.LeftScroller.empty();
   EMain.LeftScroller.append(content);
}

function AppendDisplayedContent(content)
{
   EMain.LeftScroller.append(content);
}

function ResetSmallNav()
{
   EMain.SmallNav.empty();

   EMain.SmallNav.append(MakeSmallNavButton("icons/home.png", "#77C877", CreateHome));
   EMain.SmallNav.append(MakeSmallNavButton("icons/debug.png", "#C8A0C8", Log.GetMessagesHtml));
   EMain.SmallNav.append(MakeSmallNavButton("icons/user.png", "#77AAFF", CreateLogin));

   Log.Debug("Reset mini navigation");
}

