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

