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

   this.elements = { };
}

AppGenerate.prototype.SingleUseFormSuccess = function(form, data)
{
   var submit = this.formGenerate.GetSubmit(form);
   this.generate.SetElementIcon(submit, IMAGES.Success);
};

AppGenerate.prototype.RefreshCurrentContent = function()
{
   this.Log.Debug("Refreshing current content");
   var selected = this.elements.SelectContainer.find("[" + ATTRIBUTES.Active + "]");
   console.log(selected.length);
   selected.click();
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
   var me = this;
   fg.AddLogin(form);
   fg.SetupAjax(form, API.Authorize, fg.GatherLoginValues.bind(fg), function(form, data)
   {
      me.request.SetAuthToken(data);
      me.RefreshCurrentContent();
      me.RefreshMe(); //go get the new user data and update buttons/whatever
   });
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

AppGenerate.prototype.CreateUserHome = function(user)
{
   var section = this.generate.MakeSection();
   var content = this.generate.MakeContent();
   var header = $("<h1></h1>");
   var me = this;
   header.text(user.username);
   var icon = this.generate.MakeIconButton(IMAGES.Logout, "#FF4400", function(b)
   {
      me.request.RemoveAuthToken();
      me.RefreshCurrentContent();
      me.RefreshMe(); //go get the new user data and update buttons/whatever
   });

   content.append(icon);
   section.append(header);
   section.append(content);

   return section;
};

AppGenerate.prototype.ResetSmallNav = function()
{
   this.elements.SmallNav.empty();
   var me = this;

   var home = this.generate.MakeIconButton(IMAGES.Home, "#77C877", function(b) { 
      me.generate.InstantContent(b, me.elements.SelectContainer, 
      me.elements.ContentContainer, me.CreateHome.bind(me)); });
   var debug = this.generate.MakeIconButton(IMAGES.Debug, "#C8A0C8", function(b) { 
      me.generate.InstantContent(b, me.elements.SelectContainer, 
      me.elements.ContentContainer, me.generate.LogMessages.bind(me.generate)); });
   var user = this.generate.MakeIconButton(IMAGES.User, "#77AAFF", function(b)
   {
      me.generate.LoadedContent(b, me.elements.SelectContainer, me.elements.ContentContainer, 
         function(display)
         {
            me.RefreshMe(function(user)
            {
               if(user)
                  display(me.CreateUserHome(user));
               else
                  display(me.CreateLogin());
            });
         });
   });

   home.prop("id", IDS.NavHome);
   debug.prop("id", IDS.NavDebug);
   user.prop("id", IDS.NavUser);

   this.elements.SmallNav.append(home);
   this.elements.SmallNav.append(debug);
   this.elements.SmallNav.append(user);
   this.elements.UserNav = user;

   this.RefreshMe();

   Log.Debug("Reset mini navigation");

   return this.elements.SmallNav;
};

AppGenerate.prototype.RefreshMe = function(userFunc)
{
   var me = this;
   this.request.GetMe(function(userData)
   {
      me.generate.UpdateUserButton(userData, me.elements.UserNav);
      if(userFunc) userFunc(userData);
   });
};

