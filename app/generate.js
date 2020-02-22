//Carlos Sanchez
//9-15-2019
//Deps: jquery, constants

//NOTE: NOTHING in this file should depend on languages or settings or
//whatever. This should ALL be GENERIC generation!


// **************
// * FORM STUFF *
// **************

function FormGenerate() { }

/*FormGenerate.prototype.MakeStandard = function(name, submitText)
{
   submitText = submitText || name;

   var form = $("<form></form>");
   var errorSection = $("<div></div>");
   var submit = $("<input type='submit'/>")

   form.attr("name", name);
   errorSection.addClass(CLASSES.List + " " + CLASSES.Errors);
   submit.val(submitText);
   submit.addClass(CLASSES.Hover);

   form.append(submit);
   form.append(errorSection);
   errorSection.hide();

   return form;
};

FormGenerate.prototype.MakeStandalone = function(name, submitText)
{
   var form = this.MakeStandard(name, submitText);
   var header = $("<h2></h2>");
   header.addClass(CLASSES.Header);
   header.text(name);
   form.addClass(CLASSES.Standalone);
   form.prepend(header);
   return form;
};

FormGenerate.prototype.MakeInput = function(name, type, placeholder)
{
   var input = $("<input/>");
   if(type.indexOf("#") == 0)
   {
      type = type.slice(1);
      input.attr(ATTRIBUTES.Number, "");
   }
   if(type == "textarea")
      input = $("<textarea></textarea>");
   else
      input.attr("type", type);
   input.attr("name", name);
   input.attr("required", "");
   if(placeholder)
      input.attr("placeholder", placeholder);
   return input;
};*/

//Since we GENERATED the dang thing, we're the only one that can FIND stuff in it.
FormGenerate.prototype.GetSubmit = function(form) { return form.find(SELECTORS.Submit); };
FormGenerate.prototype.GetErrors = function(form) { return form.find("." + CLASSES.Errors); };
FormGenerate.prototype.GetInputs = function(form) { return form.find(SELECTORS.Inputs); };
FormGenerate.prototype.GetInteractables = function(form) { return form.find(SELECTORS.AllInteract); };

FormGenerate.prototype.GatherValues = function(form)
{
   var inputs = form.find(SELECTORS.Inputs);
   var values = {};
   inputs.each(function() 
   { 
      if(this.name)
      {
         values[this.name] = $(this).val()

         if(this.hasAttribute(ATTRIBUTES.Number))
            values[this.name] = Number(values[this.name])
      }
   });
   return values;
};

//Stuff to MANIPULATE a form (do I really want this stuff here?)
FormGenerate.prototype.AddBeforeSubmit = function(form, input) { input.insertBefore(this.GetSubmit(form)); };
FormGenerate.prototype.ClearErrors = function (form) { this.GetErrors(form).hide().empty(); };

FormGenerate.prototype.AddError = function(form, error)
{
   if(!$.isArray(error))
      error = [ error ];

   var errors = this.GetErrors(form);
   errors.show()

   for(var i = 0; i < error.length; i++)
   {
      //this.Log.Warn("Adding error to form " + this.form.attr("name") + ": " + error[i]);
      var errorElement = $("<p></p>");
      errorElement.addClass(CLASSES.Error);
      errorElement.text(error[i]);
      errors.append(errorElement);
   }
};

FormGenerate.prototype.SetError = function (form, error)
{
   this.ClearErrors(form);
   this.AddError(form, error);
};

FormGenerate.prototype.SetRunningState = function(form, running)
{
   var inputs = form.find(SELECTORS.AllInteract);
   var submit = this.GetSubmit(form);

   inputs.prop('disabled', running);

   if(running)
   {
      submit.attr(ATTRIBUTES.Running, ""); 
      this.ClearErrors(form); //Assume that if you're RUNNING, it's a "new slate" so forget old errors
   }
   else
   {
      submit.removeAttr(ATTRIBUTES.Running); 
   }
};

FormGenerate.prototype.SetRunning = function(form) { this.SetRunningState(form, true); };
FormGenerate.prototype.ClearRunning = function(form) { this.SetRunningState(form, false); };


//TODO: This will eventually need to accept languages and whatever
function ComplexFormGenerate(logger, request, template)
{
   FormGenerate.call(this);
   this.Log = logger;
   this.request = request;
   this.template = template;
}

ComplexFormGenerate.prototype = Object.create(FormGenerate.prototype);

ComplexFormGenerate.prototype.GetLogin = function() //form)
{
   return [
      { name: NAMES.Username, type: "text", text: "Username/Email" }, 
      { name: NAMES.Password, type: "password", text: "Password" }
   ];
   //MakeInput(NAMES.Username, "text", "Username/Email"));
   //this.AddBeforeSubmit(form, this.MakeInput(NAMES.Password, "password", "Password"));
};

ComplexFormGenerate.prototype.GetPasswordConfirm = function() //form)
{
   return [
      { name: NAMES.Password, type: "password", text: "Password" },
      { name: NAMES.PasswordConfirm, type: "password", text: "Confirm Password" }
   ];
   //this.AddBeforeSubmit(form, this.MakeInput(NAMES.Password, "password", "Password"));
   //this.AddBeforeSubmit(form, this.MakeInput(NAMES.PasswordConfirm, "password", "Confirm Password"));
};

//This is a VERY SPECIFIC thing and assume that the login is a multi-use thingy
//that accepts both email/username AND that the API endpoint does so too.
ComplexFormGenerate.prototype.GatherLoginValues = function(form)
{
   var values = this.GatherValues(form);
   if(values[NAMES.Username].indexOf("@") >= 0)
   {
      values[NAMES.Email] = values[NAMES.Username];
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

   form.submit(function(event)
   {
      event.preventDefault();
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


