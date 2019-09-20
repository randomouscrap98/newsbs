//Carlos Sanchez
//9-15-2019
//Deps: jquery, constants


//TODO: This will eventually need to accept languages and whatever
function ComplexFormGenerate(logger, request)
{
   FormGenerate.call(this);
   this.Log = logger;
   this.request = request;
}

ComplexFormGenerate.prototype = Object.create(FormGenerate.prototype);

ComplexFormGenerate.prototype.AddLogin = function(form)
{
   this.AddBeforeSubmit(form, this.MakeInput(NAMES.Username, "text", "Username/Email"));
   this.AddBeforeSubmit(form, this.MakeInput(NAMES.Password, "password", "Password"));
};

ComplexFormGenerate.prototype.AddPasswordConfirm = function(form)
{
   this.AddBeforeSubmit(form, this.MakeInput(NAMES.Password, "password", "Password"));
   this.AddBeforeSubmit(form, this.MakeInput(NAMES.PasswordConfirm, "password", "Confirm Password"));
};

//This is a VERY SPECIFIC thing and assume that the login is a multi-use thingy
//that accepts both email/username AND that the API endpoint does so too.
ComplexFormGenerate.prototype.GatherLoginValues = function(form)
{
   var values = this.GatherValues(form);
   if(values[NAMES.Username].indexOf("@") >= 0)
   {
      values[NAMES.email] = values[NAMES.Username];
      values[NAMES.Username] = undefined;
   }
   return values;
};

ComplexFormGenerate.prototype.GatherPasswordConfirmValues = function(form)
{
   var values = this.GatherValues(form);
   if(values[NAMES.Password] !== values[NAMES.PasswordConfirm])
      throw "Passwords don't match!";
   return values;
};

ComplexFormGenerate.prototype.SetupAjax = function(form, url, dataConverter, success)
{
   var submit = this.GetSubmit(form);
   var me = this;
   var startRunning = function() { me.SetRunningState(form, true); }
   var stopRunning = function() { me.SetRunningState(form, false); }

   if(!submit)
   {
      this.Log.Error("No 'submit' input on form for " + url);
      return;
   }

   form.submit(function()
   {
      try
      {
         startRunning();
         var ajax = me.request.RunBasicAjax(url, dataConverter(form));
         ajax.always(stopRunning);
         ajax.done(function(data, status, xhr)
         {
            if(success) success(form,data,status,xhr);
         });
         ajax.fail(function(data)
         {
            me.SetError(form, me.request.GetResponseErrors(data));
         });
      }
      catch(ex)
      {
         me.Log.Error("EXCEPTION during form submit: " + ex);
         stopRunning();
         me.SetError(form, ex);
      }
      return false;
   });
};


// ********************
// * COMPLEX GENERATE *
// ********************

function ComplexGenerate(logger)
{
   Generate.call(this);
   this.Log = logger;
}

ComplexGenerate.prototype = Object.create(Generate.prototype);

ComplexGenerate.prototype.BeginNewContent = function(button, buttonParent, contentParent)
{
   this.SetSingletonAttribute(button, buttonParent, ATTRIBUTES.Active);
   contentParent.empty();
};

ComplexGenerate.prototype.InstantContent = function(button, buttonParent, contentParent, contentFunc)
{
   try
   {
      this.BeginNewContent(button, buttonParent, contentParent);
      contentParent.append(contentFunc());
   }
   catch(ex)
   {
      this.Log.Error("Could not setup instant content: " + ex);
   }
};

//In this one, contentFunc is a function that takes a callback for deferred
//content production. The callback expects contentFunc to give it content
ComplexGenerate.prototype.LoadedContent = function(button, buttonParent, contentParent, contentFunc)
{
   try
   {
      this.BeginNewContent(button, buttonParent, contentParent);
      contentFunc(function(content) { contentParent.append(content); });
   }
   catch(ex)
   {
      this.Log.Error("Could not setup loaded content: " + ex);
   }
};

ComplexGenerate.prototype.LogMessages = function()
{
   var container = this.MakeSection();
   container.addClass(CLASSES.Log);
   container.addClass(CLASSES.List);

   for(var i = 0; i < this.Log.messages.length; i++)
   {
      var message = this.Log.messages[i];

      var messageElement = this.MakeContent();
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

ComplexGenerate.prototype.UpdateUserButton = function(user, button)
{
   if(!user)
   {
      this.SetElementImageIcon(button, IMAGES.User);
   }
   else
   {
      this.SetElementImageIcon(button, IMAGES.TempAvatar);
   }
};
