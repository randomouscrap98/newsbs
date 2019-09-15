//Carlos Sanchez
//9-15-2019
//Deps: jquery, constants

function AddFormError(form, error)
{
   if(!$.isArray(error))
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

function AddPasswordConfirm(form)
{
   AddBeforeSubmit(MakeInput(NAMES.Password, "password", "Password"), form);
   AddBeforeSubmit(MakeInput(NAMES.PasswordConfirm, "password", "Confirm Password"), form);
   return form;
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

function GatherPasswordConfirmValues(form)
{
   var values = GatherFormValues(form);
   if(values[NAMES.Password] !== values[NAMES.PasswordConfirm])
      throw "Passwords don't match!";
   return values;
}

function GetFormSubmit(form) { return form.find("input[type='submit']"); }
function AddBeforeSubmit(input, form) { input.insertBefore(GetFormSubmit(form)); }

function SingleUseFormSuccess(form, data)
{
   //Remove the form submission button
   GetFormSubmit(form).remove();
   formappend(MakeSuccessImage());
}

