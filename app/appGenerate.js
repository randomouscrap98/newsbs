//Carlos Sanchez
//9-18-2019
//Deps: jquery, constants


//Lots of dependencies since this basically MAKES the app.
function AppGenerate(logger, request, generate, formGenerate) 
{
   this.Log = logger;
   this.request = request;
   this.generate = generate;
   this.formGenerate = formGenerate;
}

AppGenerate.prototype.LogMessages = function()
{
   var container = this.generate.MakeSection();
   container.addClass(CLASSES.Log);
   container.addClass(CLASSES.List);

   for(var i = 0; i < this.Log.messages.length; i++)
   {
      var message = this.Log.messages[i];

      var messageElement = this.generate.MakeContent();
      var time = $("<time></time>");
      var messageText = $("<span></span>")

      messageText.text(message.message);
      time.text(message.time.toLocaleTimeString());
      time.addClass(CLASSES.Meta);

      messageElement.addClass(message.level);
      messageElement.append(time);
      messageElement.append(messageText);

      container.append(messageElement);
   }

   return container;
};

AppGenerate.prototype.SingleUseFormSuccess = function(form, data)
{
   var submit = this.formGenerate.GetSubmit(form);
   this.generate.SetElementIcon(submit, IMAGES.Success);
};

AppGenerate.prototype.CreateHome = function()
{
   this.Log.Debug("Creating Homepage");

   var main = this.generate.MakeSection();
   var header = $("<h1>SmileBASIC Source</h1>");
   var about = this.generate.MakeContent("One day, this might become something??? I've said that about " +
      "quite a few projects though... none of which went anywhere");
   var explain = this.generate.MakeContent("Some things: Yes, the sidebar will be collapsible and maybe " +
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
};

AppGenerate.prototype.CreateLogin = function()
{
   this.Log.Debug("Creating Login/Register page");

   var main = this.generate.MakeSection();
   var registerNotes = this.generate.MakeContent("Registering is a bit of a hassle right now " + 
      "sorry. You must first use the register form to make your account. You will " +
      "only know it succeeded because there's a green checkmark. Then you must " +
      "send the confirmation email. Again, a green checkmark. NEXT, you get the " +
      "code from the email and put it in the 'Confirm' form. If you get another " +
      "green checkbox, hey, now you can login!");
   main.append(this.CreateLoginForm());
   main.append(registerNotes);
   main.append(this.CreateRegisterForm());
   main.append(this.CreateEmailSendForm());
   main.append(this.CreateRegisterConfirmForm());

   return main;
};

AppGenerate.prototype.CreateLoginForm = function()
{
   var fg = this.formGenerate;
   var form = fg.MakeStandalone("Login");
   fg.AddLogin(form);
   fg.SetupAjax(form, API.Authorize, fg.GatherLoginValues.bind(fg), this.SingleUseFormSuccess.bind(this));
   return form;
};

AppGenerate.prototype.CreateRegisterForm = function()
{
   var fg = this.formGenerate;
   var form = fg.MakeStandalone("Register");
   fg.AddBeforeSubmit(form, fg.MakeInput("email", "email", "Email"));
   fg.AddBeforeSubmit(form, fg.MakeInput("username", "text", "Username"));
   fg.AddPasswordConfirm(form);
   fg.SetupAjax(form, API.Users, fg.GatherPasswordConfirmValues.bind(fg), this.SingleUseFormSuccess.bind(this));
   return form;
};

AppGenerate.prototype.CreateEmailSendForm = function()
{
   var fg = this.formGenerate;
   var form = fg.MakeStandalone("Send Confirmation Email", "Send");
   fg.AddBeforeSubmit(form, fg.MakeInput("email", "email", "Email"));
   fg.SetupAjax(form, API.SendEmail, fg.GatherValues.bind(fg), this.SingleUseFormSuccess.bind(this));
   return form;
};

AppGenerate.prototype.CreateRegisterConfirmForm = function()
{
   var fg = this.formGenerate;
   var form = fg.MakeStandalone("Confirm Registration", "Confirm");
   fg.AddBeforeSubmit(form, fg.MakeInput("confirmationKey", "text", "Email Code"));
   fg.SetupAjax(form, API.ConfirmEmail, fg.GatherValues.bind(fg), this.SingleUseFormSuccess.bind(this));
   return form;
};

AppGenerate.prototype.BeginNewContent = function(button, buttonParent, contentParent)
{
   this.generate.SetSingletonAttribute(button, buttonParent, ATTRIBUTES.Active);
   contentParent.empty();
};

AppGenerate.prototype.InstantContent = function(button, buttonParent, contentParent, contentFunc)
{
   try
   {
      this.BeginNewContent(button, buttonParent, contentParent);
      contentParent.append(contentFunc());
   }
   catch(ex)
   {
      me.Log.Error("Could not setup instant content: " + ex);
   }
};

//In this one, contentFunc is a function that takes a callback for deferred
//content production. The callback expects contentFunc to give it content
AppGenerate.prototype.LoadedContent = function(button, buttonParent, contentParent, contentFunc)
{
   try
   {
      this.BeginNewContent(button, buttonParent, contentParent);
      contentFunc(function(content) { contentParent.append(content); });
   }
   catch(ex)
   {
      me.Log.Error("Could not setup loaded content: " + ex);
   }
};

AppGenerate.prototype.ResetSmallNav = function(container, parent, scroller)
{
   container.empty();
   var me = this;

   container.append(this.generate.MakeIconButton(IMAGES.Home, "#77C877", function(b) { 
      me.InstantContent(b, parent, scroller, me.CreateHome.bind(me)); }));
   container.append(this.generate.MakeIconButton(IMAGES.Debug, "#C8A0C8", function(b) { 
      me.InstantContent(b, parent, scroller, me.LogMessages.bind(me)); }));
   container.append(this.generate.MakeIconButton(IMAGES.User, "#77AAFF", function(b)
   {
      me.LoadedContent(b, parent, scroller, function(display)
      {
         me.request.GetMe(function(user)
         {
            if(user)
               display($("<h1>HOW</h1>"));
            else
               display(me.CreateLogin());
         });
      });
   }));

   Log.Debug("Reset mini navigation");
};

